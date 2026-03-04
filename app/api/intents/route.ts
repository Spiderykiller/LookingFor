import { sql } from "@/lib/db";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

const ALLOWED_MODES = ["looking", "offering"] as const;
const MAX_STATEMENT_LENGTH = 200;
const ALLOWED_DURATIONS = [1, 6, 24, 48, 168];

export async function POST(req: Request) {
  try {
    // 🔐 1️⃣ Enforce authentication
    const session = await auth();

    if (!session || !session.user || !session.user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();

    const {
      mode,
      statement,
      category,
      tags,
      duration,
      location,
    } = body;

    // ---- Validation ----
    if (!mode || !statement || !category || !duration) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!ALLOWED_MODES.includes(mode)) {
      return NextResponse.json(
        { error: "Invalid mode" },
        { status: 400 }
      );
    }

    if (!ALLOWED_DURATIONS.includes(duration)) {
      return NextResponse.json(
        { error: "Invalid duration" },
        { status: 400 }
      );
    }

    if (statement.length > MAX_STATEMENT_LENGTH) {
      return NextResponse.json(
        { error: "Statement too long" },
        { status: 400 }
      );
    }

    // ✅ Normalise category to array and validate it's not empty
    const categoryArray = Array.isArray(category) ? category : [category];
    if (categoryArray.length === 0) {
      return NextResponse.json(
        { error: "Select at least one category" },
        { status: 400 }
      );
    }

    const expiresAt = new Date(
      Date.now() + duration * 60 * 60 * 1000
    );

    // ✅ 2️⃣ Attach user_id from session (NOT client)
    const result = await sql`
      INSERT INTO intents (
        user_id,
        mode,
        statement,
        category,
        tags,
        duration,
        location,
        expires_at
      )
      VALUES (
        ${session.user.id},
        ${mode},
        ${statement.trim()},
        ${categoryArray},
        ${Array.isArray(tags) ? tags : []},
        ${duration},
        ${location?.trim() || null},
        ${expiresAt}
      )
      RETURNING
        id,
        user_id,
        mode,
        statement,
        category,
        tags,
        duration,
        location,
        created_at,
        expires_at;
    `;

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error("POST /api/intents error:", error);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}


export async function GET() {
  try {
    const result = await sql`
      SELECT
        id,
        mode,
        statement,
        category,
        tags,
        duration,
        location,
        created_at,
        expires_at
      FROM intents
      WHERE expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 50;
    `;

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/intents error:", error);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}