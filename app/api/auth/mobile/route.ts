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
      SELECT id, username, email, password, location, current_mode
      FROM users
      WHERE email = ${email.trim().toLowerCase()}
      LIMIT 1
    `;
    // NOTE: deliberately NOT selecting avatar_url — base64 images make the
    // JWE token enormous (>13KB), which exceeds HTTP cookie/header size limits.

    const user = users[0];
    if (!user) return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    if (!user.password) return NextResponse.json({ error: "This account uses Google sign-in" }, { status: 401 });

    const valid = await compare(String(password), String(user.password));
    if (!valid) return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });

    const secret = process.env.AUTH_SECRET!;

    // Salt must match the cookie name next-auth uses on Vercel (HTTPS)
    const salt = "__Secure-next-auth.session-token";

    // Keep payload minimal — only what next-auth needs to identify the user
    const token = await encode({
      token: {
        sub:   String(user.id),
        name:  user.username,
        email: user.email,
        // NO picture/avatar — keeps token small
      },
      secret,
      salt,
      maxAge: 30 * 24 * 60 * 60,
    });

    console.log(`[auth/mobile] token size: ${token.length} bytes`);

    return NextResponse.json({
      token,
      user: {
        id:    String(user.id),
        name:  user.username,
        email: user.email,
        image: null,  // fetch avatar separately via /api/profile — not in JWT
      },
    });

  } catch (err) {
    console.error("[auth/mobile] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}