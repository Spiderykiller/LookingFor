// app/api/responses/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql } from "@/lib/db";

// GET /api/responses?intent_id=xxx  — fetch all responses for an intent
export async function GET(req: NextRequest) {
  try {
    const intent_id = req.nextUrl.searchParams.get("intent_id");

    if (!intent_id) {
      return NextResponse.json({ error: "intent_id required" }, { status: 400 });
    }

    const responses = await sql`
      SELECT
        r.id,
        r.user_id,
        r.message,
        r.created_at,
        u.username
      FROM responses r
      JOIN users u ON r.user_id = u.id
      WHERE r.intent_id = ${intent_id}
      ORDER BY r.created_at ASC
    `;

    return NextResponse.json(responses);

  } catch (error) {
    console.error("GET /api/responses error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST /api/responses  — create a response
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { intent_id, message } = await req.json();

    if (!intent_id || !message?.trim()) {
      return NextResponse.json(
        { error: "intent_id and message are required" },
        { status: 400 }
      );
    }

    // Prevent duplicate "Also looking" responses from the same user
    const existing = await sql`
      SELECT id FROM responses
      WHERE intent_id = ${intent_id}
        AND user_id   = ${session.user.id}
        AND message   = 'Also looking'
      LIMIT 1
    `;

    if (existing.length > 0 && message.trim() === "Also looking") {
      return NextResponse.json(
        { error: "Already responded" },
        { status: 409 }
      );
    }

    const result = await sql`
      INSERT INTO responses (intent_id, user_id, message)
      VALUES (${intent_id}, ${session.user.id}, ${message.trim()})
      RETURNING id, user_id, message, created_at
    `;

    // Return with username attached
    return NextResponse.json({
      ...result[0],
      username: session.user.name ?? "Anonymous",
    }, { status: 201 });

  } catch (error) {
    console.error("POST /api/responses error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}