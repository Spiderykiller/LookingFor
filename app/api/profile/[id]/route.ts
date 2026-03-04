// app/api/profile/[id]/route.ts
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;

    const user = await sql`
      SELECT id, username, location, current_mode, interest_tags, provider, avatar_url
      FROM users
      WHERE id = ${userId}
    `;

    if (user.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const activeIntents = await sql`
      SELECT 
        i.id,
        i.statement,
        i.category,
        i.mode,
        i.tags,
        i.expires_at,
        COUNT(r.id) AS responses
      FROM intents i
      LEFT JOIN responses r ON r.intent_id = i.id
      WHERE i.user_id = ${userId}
        AND i.expires_at > NOW()
      GROUP BY i.id, i.tags
      ORDER BY i.created_at DESC
    `;

    const stats = await sql`
      SELECT
        (SELECT COUNT(*) FROM intents WHERE user_id = ${userId}) AS total_posts,
        (SELECT COUNT(*) FROM responses WHERE user_id = ${userId}) AS total_responses,
        (SELECT COUNT(*) FROM intents WHERE user_id = ${userId} AND expires_at > NOW()) AS active_now
    `;

    // interest_tags stored as comma-separated string in users table
    const interests = user[0].interest_tags
      ? String(user[0].interest_tags).split(",").filter(Boolean)
      : [];

    return NextResponse.json({
      user:         user[0],
      activeIntents,
      interests,
      stats:        stats[0],
    });

  } catch (error) {
    console.error("Profile GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;
    const { username, location } = await req.json();

    await sql`
      UPDATE users
      SET username = ${username},
          location = ${location}
      WHERE id = ${userId}
    `;

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Profile PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}