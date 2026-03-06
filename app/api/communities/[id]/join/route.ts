// app/api/communities/[id]/join/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql } from "@/lib/db";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Toggle: if member → leave, if not → join
    const existing = await sql`
      SELECT 1 FROM community_members
      WHERE community_id = ${id} AND user_id = ${session.user.id}
      LIMIT 1
    `;

    if (existing.length > 0) {
      // Leave — but prevent creator from leaving
      const community = await sql`
        SELECT creator_id FROM communities WHERE id = ${id} LIMIT 1
      `;
      if (community[0]?.creator_id === session.user.id) {
        return NextResponse.json({ error: "Creator cannot leave their community" }, { status: 400 });
      }
      await sql`
        DELETE FROM community_members
        WHERE community_id = ${id} AND user_id = ${session.user.id}
      `;
      return NextResponse.json({ joined: false });
    } else {
      await sql`
        INSERT INTO community_members (community_id, user_id)
        VALUES (${id}, ${session.user.id})
        ON CONFLICT DO NOTHING
      `;
      return NextResponse.json({ joined: true });
    }
  } catch (error) {
    console.error("POST /api/communities/[id]/join error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}