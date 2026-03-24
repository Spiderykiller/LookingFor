// lookingfor/app/api/auth/mobile/route.ts
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { compare } from "bcryptjs";
import { encode } from "next-auth/jwt";

export async function POST(req: NextRequest) {
  try {
    const { identifier, password, rememberMe = false } = await req.json();

    if (!identifier || !password) {
      return NextResponse.json(
        { error: "Email, username, or phone and password required" },
        { status: 400 }
      );
    }

    const clean = identifier.trim().toLowerCase();

    // Match by email, username, or phone in one query
    const users = await sql`
      SELECT id, username, email, password, phone
      FROM users
      WHERE
        LOWER(email)    = ${clean} OR
        LOWER(username) = ${clean} OR
        phone           = ${clean}
      LIMIT 1
    `;

    const user = users[0];

    if (!user) {
      return NextResponse.json(
        { error: "No account found with that email, username, or phone." },
        { status: 401 }
      );
    }

    if (!user.password) {
      return NextResponse.json(
        { error: "This account uses Google sign-in. Please sign in with Google." },
        { status: 401 }
      );
    }

    const valid = await compare(String(password), String(user.password));
    if (!valid) {
      return NextResponse.json(
        { error: "Incorrect password. Please try again." },
        { status: 401 }
      );
    }

    const secret = process.env.AUTH_SECRET!;
    const salt   = "__Secure-authjs.session-token";

    // Remember me = 30 days, otherwise 1 day
    const maxAge = rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60;

    const token = await encode({
      token: {
        sub:   String(user.id),
        name:  user.username,
        email: user.email,
      },
      secret,
      salt,
      maxAge,
    });

    return NextResponse.json({
      token,
      rememberMe,
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