// app/api/auth/mobile/route.ts
// Dedicated endpoint for React Native — returns JWT directly.
// NextAuth cookie flow strips Set-Cookie on Android so we bypass it entirely.

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

    // Find user — same logic as NextAuth credentials provider
    const users = await sql`
      SELECT * FROM users
      WHERE email = ${email.trim().toLowerCase()}
      LIMIT 1
    `;

    const user = users[0];

    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    // Google-only accounts have no password
    if (!user.password) {
      return NextResponse.json(
        { error: "This account uses Google sign-in" },
        { status: 401 }
      );
    }

    // Verify password
    const valid = await compare(String(password), String(user.password));
    if (!valid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const secret = process.env.AUTH_SECRET!;

    // next-auth v5 requires a salt — use the same value it uses internally
    const salt = "authjs.session-token";

    // Mint a NextAuth-compatible JWT
    const token = await encode({
      token: {
        id:      String(user.id),
        name:    user.username,
        email:   user.email,
        picture: user.avatar_url ?? null,
      },
      secret,
      salt,
      maxAge: 30 * 24 * 60 * 60, // 30 days
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