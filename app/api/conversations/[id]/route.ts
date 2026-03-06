// app/api/conversations/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql } from "@/lib/db";

// GET — load all messages in a conversation
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = session.user.id;

    // Verify user is a participant
    const convo = await sql`
      SELECT
        c.id,
        CASE WHEN c.user_a = ${userId} THEN ub.id   ELSE ua.id   END AS other_id,
        CASE WHEN c.user_a = ${userId} THEN ub.username ELSE ua.username END AS other_username,
        CASE WHEN c.user_a = ${userId} THEN ub.avatar_url ELSE ua.avatar_url END AS other_avatar
      FROM conversations c
      JOIN users ua ON c.user_a = ua.id
      JOIN users ub ON c.user_b = ub.id
      WHERE c.id = ${id}
        AND (c.user_a = ${userId} OR c.user_b = ${userId})
      LIMIT 1
    `;

    if (!convo[0]) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const messages = await sql`
      SELECT
        m.id, m.content, m.read, m.created_at,
        m.sender_id,
        u.username AS sender_username,
        u.avatar_url AS sender_avatar
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.conversation_id = ${id}
      ORDER BY m.created_at ASC
      LIMIT 200
    `;

    // Mark unread messages as read
    await sql`
      UPDATE messages
      SET read = true
      WHERE conversation_id = ${id}
        AND sender_id != ${userId}
        AND read = false
    `;

    return NextResponse.json({
      conversation: convo[0],
      messages,
    });
  } catch (error) {
    console.error("GET /api/conversations/[id] error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST — send a message
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = session.user.id;
    const { content } = await req.json();

    if (!content?.trim()) {
      return NextResponse.json({ error: "Message cannot be empty" }, { status: 400 });
    }

    if (content.trim().length > 1000) {
      return NextResponse.json({ error: "Message too long (max 1000 chars)" }, { status: 400 });
    }

    // Verify participant
    const convo = await sql`
      SELECT id FROM conversations
      WHERE id = ${id} AND (user_a = ${userId} OR user_b = ${userId})
      LIMIT 1
    `;

    if (!convo[0]) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const result = await sql`
      INSERT INTO messages (conversation_id, sender_id, content)
      VALUES (${id}, ${userId}, ${content.trim()})
      RETURNING id, sender_id, content, read, created_at
    `;

    return NextResponse.json({
      ...result[0],
      sender_username: session.user.name ?? "Anonymous",
      sender_avatar:   null,
    }, { status: 201 });
  } catch (error) {
    console.error("POST /api/conversations/[id] error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}