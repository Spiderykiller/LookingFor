// app/api/conversations/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql } from "@/lib/db";

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

    const convo = await sql`
      SELECT
        c.id,
        CASE WHEN c.user_a = ${userId} THEN ub.id        ELSE ua.id        END AS other_id,
        CASE WHEN c.user_a = ${userId} THEN ub.username  ELSE ua.username  END AS other_username,
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
        m.edited, m.edited_at,
        m.deleted,
        m.pinned,
        m.reactions,
        m.reply_to_id,
        u.username AS sender_username,
        u.avatar_url AS sender_avatar,
        -- Reply-to preview
        rm.content     AS reply_content,
        ru.username    AS reply_username
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      LEFT JOIN messages rm ON m.reply_to_id = rm.id
      LEFT JOIN users    ru ON rm.sender_id   = ru.id
      WHERE m.conversation_id = ${id}
      ORDER BY m.created_at ASC
      LIMIT 200
    `;

    // Pinned messages for header display
    const pinned = messages.filter((m: any) => m.pinned && !m.deleted);

    // Mark as read
    await sql`
      UPDATE messages
      SET read = true
      WHERE conversation_id = ${id}
        AND sender_id != ${userId}
        AND read = false
    `;

    return NextResponse.json({ conversation: convo[0], messages, pinned });
  } catch (error) {
    console.error("GET /api/conversations/[id] error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

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
    const { content, reply_to_id } = await req.json();

    if (!content?.trim()) {
      return NextResponse.json({ error: "Message cannot be empty" }, { status: 400 });
    }
    if (content.trim().length > 1000) {
      return NextResponse.json({ error: "Message too long" }, { status: 400 });
    }

    const convo = await sql`
      SELECT id FROM conversations
      WHERE id = ${id} AND (user_a = ${userId} OR user_b = ${userId})
      LIMIT 1
    `;
    if (!convo[0]) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const result = await sql`
      INSERT INTO messages (conversation_id, sender_id, content, reply_to_id)
      VALUES (${id}, ${userId}, ${content.trim()}, ${reply_to_id ?? null})
      RETURNING id, sender_id, content, read, created_at, edited, deleted, pinned, reactions, reply_to_id
    `;

    // Get reply preview if replying
    let reply_content = null;
    let reply_username = null;
    if (reply_to_id) {
      const replyMsg = await sql`
        SELECT m.content, u.username
        FROM messages m JOIN users u ON m.sender_id = u.id
        WHERE m.id = ${reply_to_id} LIMIT 1
      `;
      if (replyMsg[0]) {
        reply_content  = replyMsg[0].content;
        reply_username = replyMsg[0].username;
      }
    }

    return NextResponse.json({
      ...result[0],
      sender_username: session.user.name ?? "Anonymous",
      sender_avatar:   null,
      reply_content,
      reply_username,
    }, { status: 201 });
  } catch (error) {
    console.error("POST /api/conversations/[id] error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}