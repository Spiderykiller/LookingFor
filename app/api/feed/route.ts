// app/api/feed/route.ts
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET() {
  try {
    const intents = await sql`
      SELECT 
        i.id,
        i.statement,
        i.category,
        i.location,
        i.mode,
        i.tags,
        i.duration,
        i.created_at,
        i.expires_at,
        u.username,
        COUNT(r.id) AS response_count
      FROM intents i
      JOIN users u ON i.user_id = u.id
      LEFT JOIN responses r ON r.intent_id = i.id
      WHERE i.expires_at > NOW()
      GROUP BY i.id, u.username, i.tags, i.duration
      ORDER BY i.created_at DESC
      LIMIT 50
    `;

    return NextResponse.json(intents);
  } catch (error) {
    console.error("Feed GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch feed" },
      { status: 500 }
    );
  }
}