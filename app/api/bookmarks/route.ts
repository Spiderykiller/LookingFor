// app/api/bookmarks/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql } from "@/lib/db";

// GET — fetch all bookmarked intents for current user
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const bookmarks = await sql`
      SELECT
        i.id,
        i.user_id,
        i.statement,
        i.category,
        i.location,
        i.mode,
        i.created_at,
        i.expires_at,
        u.username,
        b.created_at AS bookmarked_at,
        COUNT(r.id)  AS response_count
      FROM bookmarks b
      JOIN intents i  ON b.intent_id = i.id
      JOIN users u    ON i.user_id   = u.id
      LEFT JOIN responses r ON r.intent_id = i.id
      WHERE b.user_id    = ${session.user.id}
        AND i.expires_at > NOW()
      GROUP BY i.id, u.username, b.created_at
      ORDER BY b.created_at DESC
    `;

    return NextResponse.json(bookmarks);
  } catch (error) {
    console.error("GET /api/bookmarks error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST — toggle bookmark (add if not exists, remove if exists)
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { intent_id } = await req.json();
    if (!intent_id) {
      return NextResponse.json({ error: "intent_id required" }, { status: 400 });
    }

    // Check if already bookmarked
    const existing = await sql`
      SELECT id FROM bookmarks
      WHERE user_id = ${session.user.id} AND intent_id = ${intent_id}
      LIMIT 1
    `;

    if (existing[0]) {
      // Remove bookmark
      await sql`
        DELETE FROM bookmarks
        WHERE user_id = ${session.user.id} AND intent_id = ${intent_id}
      `;
      return NextResponse.json({ bookmarked: false });
    } else {
      // Add bookmark
      await sql`
        INSERT INTO bookmarks (user_id, intent_id)
        VALUES (${session.user.id}, ${intent_id})
      `;
      return NextResponse.json({ bookmarked: true });
    }
  } catch (error) {
    console.error("POST /api/bookmarks error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}