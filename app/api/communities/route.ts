// app/api/communities/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const search = req.nextUrl.searchParams.get("q") ?? "";

    const communities = await sql`
      SELECT
        c.id,
        c.name,
        c.description,
        c.category,
        c.created_at,
        u.username AS creator_name,
        COUNT(DISTINCT cm.user_id) AS member_count,
        COUNT(DISTINCT cp.id)      AS post_count
      FROM communities c
      LEFT JOIN users u             ON c.creator_id   = u.id
      LEFT JOIN community_members cm ON cm.community_id = c.id
      LEFT JOIN community_posts   cp ON cp.community_id = c.id
      WHERE c.name ILIKE ${'%' + search + '%'}
         OR c.description ILIKE ${'%' + search + '%'}
         OR c.category    ILIKE ${'%' + search + '%'}
      GROUP BY c.id, u.username
      ORDER BY member_count DESC, c.created_at DESC
      LIMIT 50
    `;

    return NextResponse.json(communities);
  } catch (error) {
    console.error("GET /api/communities error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, description, category } = await req.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: "Community name is required" }, { status: 400 });
    }
    if (name.trim().length < 3) {
      return NextResponse.json({ error: "Name must be at least 3 characters" }, { status: 400 });
    }
    if (name.trim().length > 40) {
      return NextResponse.json({ error: "Name must be under 40 characters" }, { status: 400 });
    }

    // Create community
    const result = await sql`
      INSERT INTO communities (name, description, category, creator_id)
      VALUES (${name.trim()}, ${description?.trim() || null}, ${category || null}, ${session.user.id})
      RETURNING id, name, description, category, created_at
    `;

    // Auto-join creator
    await sql`
      INSERT INTO community_members (community_id, user_id)
      VALUES (${result[0].id}, ${session.user.id})
      ON CONFLICT DO NOTHING
    `;

    return NextResponse.json(result[0], { status: 201 });
  } catch (error: any) {
    if (error?.code === "23505") {
      return NextResponse.json({ error: "A community with this name already exists" }, { status: 409 });
    }
    console.error("POST /api/communities error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}