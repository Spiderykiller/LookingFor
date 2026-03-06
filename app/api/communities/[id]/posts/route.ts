// app/api/communities/[id]/posts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql } from "@/lib/db";

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
    const { content } = await req.json();

    if (!content?.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }
    if (content.trim().length > 500) {
      return NextResponse.json({ error: "Post too long (max 500 chars)" }, { status: 400 });
    }

    // Must be a member to post
    const membership = await sql`
      SELECT 1 FROM community_members
      WHERE community_id = ${id} AND user_id = ${session.user.id}
      LIMIT 1
    `;
    if (!membership[0]) {
      return NextResponse.json({ error: "Join this community to post" }, { status: 403 });
    }

    const result = await sql`
      INSERT INTO community_posts (community_id, user_id, content)
      VALUES (${id}, ${session.user.id}, ${content.trim()})
      RETURNING id, content, created_at
    `;

    return NextResponse.json({
      ...result[0],
      username:   session.user.name ?? "Anonymous",
      avatar_url: null,
    }, { status: 201 });
  } catch (error) {
    console.error("POST /api/communities/[id]/posts error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}