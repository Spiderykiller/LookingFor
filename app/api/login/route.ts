// app/api/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { compare } from "bcryptjs";
import { signIn } from "@/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Check user exists
    const userRecord = await sql`
      SELECT * FROM users
      WHERE email = ${email} AND provider = 'local'
      LIMIT 1
    `;

    if (!userRecord[0]) {
      return NextResponse.json(
        { error: "No account found with this email. Please sign up first." },
        { status: 404 }
      );
    }

    if (!userRecord[0].password) {
      return NextResponse.json(
        { error: "This account uses Google sign-in." },
        { status: 400 }
      );
    }

    // Verify password
    const isValid = await compare(String(password), String(userRecord[0].password));

    if (!isValid) {
      return NextResponse.json(
        { error: "Incorrect password. Please try again." },
        { status: 401 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Login check error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}