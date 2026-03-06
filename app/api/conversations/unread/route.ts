// app/api/conversations/unread/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ count: 0 });
    }

    const result = await sql`
      SELECT COUNT(*)::int AS count
      FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE (c.user_a = ${session.user.id} OR c.user_b = ${session.user.id})
        AND m.sender_id != ${session.user.id}
        AND m.read = false
    `;

    return NextResponse.json({ count: result[0]?.count ?? 0 });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}