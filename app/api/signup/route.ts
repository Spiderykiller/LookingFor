// app/api/signup/route.ts
import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { sql } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { email, username, password } = await req.json();

    // Validate inputs
    if (!email || !username || !password) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existing = await sql`
      SELECT id FROM users
      WHERE email = ${email}
      LIMIT 1
    `;

    if (existing[0]) {
      return NextResponse.json(
        { error: "Email already in use" },
        { status: 409 }
      );
    }

    // Hash password server-side
    const password_hash = await hash(password, 10);

    // Insert new user — column is "password" not "password_hash"
    const newUser = await sql`
      INSERT INTO users (email, username, password, provider)
      VALUES (${email}, ${username}, ${password_hash}, 'local')
      RETURNING id, email, username
    `;

    return NextResponse.json(
      { success: true, user: newUser[0] },
      { status: 201 }
    );

  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}