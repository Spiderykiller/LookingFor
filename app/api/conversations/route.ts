// app/api/conversations/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql } from "@/lib/db";

// GET — list all conversations for current user with last message + unread count
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const conversations = await sql`
      SELECT
        c.id,
        c.created_at,
        -- The other person
        CASE WHEN c.user_a = ${userId} THEN ub.id   ELSE ua.id   END AS other_id,
        CASE WHEN c.user_a = ${userId} THEN ub.username ELSE ua.username END AS other_username,
        CASE WHEN c.user_a = ${userId} THEN ub.avatar_url ELSE ua.avatar_url END AS other_avatar,
        -- Last message
        lm.content      AS last_message,
        lm.created_at   AS last_message_at,
        lm.sender_id    AS last_sender_id,
        -- Unread count (messages sent TO me that I haven't read)
        COUNT(CASE WHEN m.read = false AND m.sender_id != ${userId} THEN 1 END) AS unread_count
      FROM conversations c
      JOIN users ua ON c.user_a = ua.id
      JOIN users ub ON c.user_b = ub.id
      LEFT JOIN LATERAL (
        SELECT content, created_at, sender_id
        FROM messages
        WHERE conversation_id = c.id
        ORDER BY created_at DESC
        LIMIT 1
      ) lm ON true
      LEFT JOIN messages m ON m.conversation_id = c.id
      WHERE c.user_a = ${userId} OR c.user_b = ${userId}
      GROUP BY c.id, c.created_at, ua.id, ua.username, ua.avatar_url,
               ub.id, ub.username, ub.avatar_url,
               lm.content, lm.created_at, lm.sender_id
      ORDER BY COALESCE(lm.created_at, c.created_at) DESC
    `;

    return NextResponse.json(conversations);
  } catch (error) {
    console.error("GET /api/conversations error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST — start or retrieve a conversation with another user
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { other_user_id } = await req.json();

    if (!other_user_id) {
      return NextResponse.json({ error: "other_user_id is required" }, { status: 400 });
    }

    if (other_user_id === session.user.id) {
      return NextResponse.json({ error: "Cannot message yourself" }, { status: 400 });
    }

    // Ensure consistent ordering so UNIQUE constraint works
    const [userA, userB] = [session.user.id, other_user_id].sort();

    // Get or create the conversation
    const existing = await sql`
      SELECT id FROM conversations
      WHERE user_a = ${userA} AND user_b = ${userB}
      LIMIT 1
    `;

    if (existing[0]) {
      return NextResponse.json({ id: existing[0].id, existing: true });
    }

    const result = await sql`
      INSERT INTO conversations (user_a, user_b)
      VALUES (${userA}, ${userB})
      RETURNING id
    `;

    return NextResponse.json({ id: result[0].id, existing: false }, { status: 201 });
  } catch (error: any) {
    if (error?.code === "23505") {
      // Race condition — conversation was just created
      const [userA, userB] = [
        (await auth())?.user?.id!,
        (await (await import("next/server")).NextRequest.prototype.json?.call(error)),
      ].sort();
      const existing = await sql`
        SELECT id FROM conversations WHERE user_a = ${userA} AND user_b = ${userB} LIMIT 1
      `;
      return NextResponse.json({ id: existing[0]?.id, existing: true });
    }
    console.error("POST /api/conversations error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}