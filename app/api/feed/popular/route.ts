// app/api/feed/popular/route.ts
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET() {
  try {
    const categories = await sql`
      SELECT
        unnest(category) AS cat,
        COUNT(*)         AS count
      FROM intents
      WHERE expires_at > NOW()
      GROUP BY 1
      ORDER BY count DESC
      LIMIT 8
    `;

    const recent = await sql`
      SELECT DISTINCT ON (u.id)
        i.statement,
        i.mode,
        u.username
      FROM intents i
      JOIN users u ON i.user_id = u.id
      WHERE i.expires_at > NOW()
      ORDER BY u.id, i.created_at DESC
      LIMIT 6
    `;

    return NextResponse.json({
      categories: categories.map((c: any) => c.cat),
      suggestions: recent,
    });
  } catch (error) {
    console.error("GET /api/feed/popular error:", error);
    return NextResponse.json({ categories: [], suggestions: [] });
  }
}