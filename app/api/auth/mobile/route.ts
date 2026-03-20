// app/api/auth/mobile/route.ts
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { compare } from "bcryptjs";
import { encode } from "next-auth/jwt";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    const users = await sql`
      SELECT * FROM users WHERE email = ${email.trim().toLowerCase()} LIMIT 1
    `;
    const user = users[0];

    if (!user) return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    if (!user.password) return NextResponse.json({ error: "This account uses Google sign-in" }, { status: 401 });

    const valid = await compare(String(password), String(user.password));
    if (!valid) return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });

    const secret = process.env.AUTH_SECRET!;

    // Salt must match the cookie name NextAuth uses on Vercel (HTTPS = __Secure- prefix)
    const salt = "__Secure-next-auth.session-token";

    const token = await encode({
      token: {
        sub:     String(user.id),
        id:      String(user.id),
        name:    user.username,
        email:   user.email,
        picture: user.avatar_url ?? null,
      },
      secret,
      salt,
      maxAge: 30 * 24 * 60 * 60,
    });

    return NextResponse.json({
      token,
      user: {
        id:    String(user.id),
        name:  user.username,
        email: user.email,
        image: user.avatar_url ?? null,
      },
    });

  } catch (err) {
    console.error("[auth/mobile] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}