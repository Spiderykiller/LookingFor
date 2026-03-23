import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userId  = session?.user?.id ?? null;

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() ?? "";

    const intents = q
      ? await sql`
          SELECT
            i.id,
            i.user_id,
            i.statement,
            i.category,
            i.location,
            i.mode,
            i.created_at,
            i.expires_at,
            u.username,
            COUNT(DISTINCT r.id)                        AS response_count,
            BOOL_OR(b.user_id  = ${userId})             AS is_bookmarked,
            BOOL_OR(rr.user_id = ${userId})             AS is_responded
          FROM intents i
          JOIN users u    ON i.user_id   = u.id
          LEFT JOIN responses r   ON r.intent_id  = i.id
          LEFT JOIN bookmarks b   ON b.intent_id  = i.id AND b.user_id  = ${userId}
          LEFT JOIN responses rr  ON rr.intent_id = i.id AND rr.user_id = ${userId}
          WHERE i.expires_at > NOW()
            AND (
              i.statement    ILIKE ${'%' + q + '%'}
              OR u.username  ILIKE ${'%' + q + '%'}
              OR i.location  ILIKE ${'%' + q + '%'}
              OR i.category::text ILIKE ${'%' + q + '%'}
            )
          GROUP BY i.id, u.username
          ORDER BY
            CASE WHEN i.statement ILIKE ${'%' + q + '%'} THEN 0 ELSE 1 END,
            i.created_at DESC
          LIMIT 50
        `
      : await sql`
          SELECT
            i.id,
            i.user_id,
            i.statement,
            i.category,
            i.location,
            i.mode,
            i.created_at,
            i.expires_at,
            u.username,
            COUNT(DISTINCT r.id)                        AS response_count,
            BOOL_OR(b.user_id  = ${userId})             AS is_bookmarked,
            BOOL_OR(rr.user_id = ${userId})             AS is_responded
          FROM intents i
          JOIN users u    ON i.user_id   = u.id
          LEFT JOIN responses r   ON r.intent_id  = i.id
          LEFT JOIN bookmarks b   ON b.intent_id  = i.id AND b.user_id  = ${userId}
          LEFT JOIN responses rr  ON rr.intent_id = i.id AND rr.user_id = ${userId}
          WHERE i.expires_at > NOW()
          GROUP BY i.id, u.username
          ORDER BY i.created_at DESC
          LIMIT 50
        `;

    return NextResponse.json(intents);
  } catch (error) {
    console.error("Feed GET error:", error);
    return NextResponse.json({ error: "Failed to fetch feed" }, { status: 500 });
  }
}