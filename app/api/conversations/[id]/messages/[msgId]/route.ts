// app/api/conversations/[id]/messages/[msgId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; msgId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: convId, msgId } = await params;
    const userId = session.user.id;
    const body = await req.json();
    const { action, content, emoji } = body;

    // Verify user is part of this conversation
    const convo = await sql`
      SELECT id FROM conversations
      WHERE id = ${convId} AND (user_a = ${userId} OR user_b = ${userId})
      LIMIT 1
    `;
    if (!convo[0]) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    // Get the message
    const msgResult = await sql`
      SELECT * FROM messages WHERE id = ${msgId} AND conversation_id = ${convId} LIMIT 1
    `;
    const msg = msgResult[0];
    if (!msg) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // ── EDIT ────────────────────────────────────────────────────
    if (action === "edit") {
      if (msg.sender_id !== userId) {
        return NextResponse.json({ error: "Can only edit your own messages" }, { status: 403 });
      }
      if (!content?.trim()) {
        return NextResponse.json({ error: "Content required" }, { status: 400 });
      }
      // 15 minute edit window
      const ageMs = Date.now() - new Date(msg.created_at).getTime();
      if (ageMs > 15 * 60 * 1000) {
        return NextResponse.json({ error: "Edit window expired (15 minutes)" }, { status: 400 });
      }

      const result = await sql`
        UPDATE messages
        SET content = ${content.trim()}, edited = true, edited_at = NOW()
        WHERE id = ${msgId}
        RETURNING *
      `;
      return NextResponse.json(result[0]);
    }

    // ── DELETE ──────────────────────────────────────────────────
    if (action === "delete") {
      if (msg.sender_id !== userId) {
        return NextResponse.json({ error: "Can only delete your own messages" }, { status: 403 });
      }
      const result = await sql`
        UPDATE messages
        SET deleted = true, content = 'This message was deleted'
        WHERE id = ${msgId}
        RETURNING *
      `;
      return NextResponse.json(result[0]);
    }

    // ── PIN (any participant can pin) ────────────────────────────
    if (action === "pin") {
      const result = await sql`
        UPDATE messages
        SET pinned = NOT pinned
        WHERE id = ${msgId}
        RETURNING *
      `;
      return NextResponse.json(result[0]);
    }

    // ── REACT ───────────────────────────────────────────────────
    if (action === "react") {
      if (!emoji) {
        return NextResponse.json({ error: "Emoji required" }, { status: 400 });
      }
      // Toggle reaction — reactions stored as { "😂": ["userId1", "userId2"] }
      const reactions = (msg.reactions as Record<string, string[]>) ?? {};
      const users = reactions[emoji] ?? [];
      if (users.includes(userId)) {
        // Remove reaction
        reactions[emoji] = users.filter((u: string) => u !== userId);
        if (reactions[emoji].length === 0) delete reactions[emoji];
      } else {
        reactions[emoji] = [...users, userId];
      }
      const result = await sql`
        UPDATE messages SET reactions = ${JSON.stringify(reactions)}
        WHERE id = ${msgId}
        RETURNING *
      `;
      return NextResponse.json(result[0]);
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });

  } catch (error) {
    console.error("PATCH /api/conversations/[id]/messages/[msgId] error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}