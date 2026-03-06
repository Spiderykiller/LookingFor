// app/api/communities/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();

    const community = await sql`
      SELECT
        c.id, c.name, c.description, c.category, c.created_at, c.creator_id,
        u.username AS creator_name,
        COUNT(DISTINCT cm.user_id) AS member_count,
        COUNT(DISTINCT cp.id)      AS post_count
      FROM communities c
      LEFT JOIN users u              ON c.creator_id   = u.id
      LEFT JOIN community_members cm ON cm.community_id = c.id
      LEFT JOIN community_posts   cp ON cp.community_id = c.id
      WHERE c.id = ${id}
      GROUP BY c.id, u.username
    `;

    if (!community[0]) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }

    const posts = await sql`
      SELECT
        cp.id, cp.content, cp.created_at,
        u.username, u.avatar_url
      FROM community_posts cp
      JOIN users u ON cp.user_id = u.id
      WHERE cp.community_id = ${id}
      ORDER BY cp.created_at DESC
      LIMIT 50
    `;

    // Check if current user is a member
    let isMember = false;
    if (session?.user?.id) {
      const membership = await sql`
        SELECT 1 FROM community_members
        WHERE community_id = ${id} AND user_id = ${session.user.id}
        LIMIT 1
      `;
      isMember = membership.length > 0;
    }

    return NextResponse.json({ community: community[0], posts, isMember });
  } catch (error) {
    console.error("GET /api/communities/[id] error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}