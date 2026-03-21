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
      SELECT id, username, email, password
      FROM users
      WHERE email = ${email.trim().toLowerCase()}
      LIMIT 1
    `;

    const user = users[0];
    if (!user) return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    if (!user.password) return NextResponse.json({ error: "This account uses Google sign-in" }, { status: 401 });

    const valid = await compare(String(password), String(user.password));
    if (!valid) return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });

    const secret = process.env.AUTH_SECRET!;

    // next-auth v5 beta uses "authjs" cookie names (not "next-auth")
    // On Vercel HTTPS: __Secure-authjs.session-token
    const salt = "__Secure-authjs.session-token";

    const token = await encode({
      token: {
        sub:   String(user.id),
        name:  user.username,
        email: user.email,
      },
      secret,
      salt,
      maxAge: 30 * 24 * 60 * 60,
    });

    console.log(`[auth/mobile] token: ${token.length} bytes`);

    return NextResponse.json({
      token,
      user: {
        id:    String(user.id),
        name:  user.username,
        email: user.email,
        image: null,
      },
    });

  } catch (err) {
    console.error("[auth/mobile] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}