// app/feed/page.tsx
import Feed, { FeedItem } from "@/app/components/ui/feed";
import { sql } from "@/lib/db";

async function getFeed(): Promise<FeedItem[]> {
  try {
    const rows = await sql`
      SELECT
        i.id,
        i.statement,
        i.category,
        i.location,
        i.mode,
        i.tags,
        i.duration,
        i.created_at,
        i.expires_at,
        u.username,
        COUNT(r.id) AS response_count
      FROM intents i
      JOIN users u ON i.user_id = u.id
      LEFT JOIN responses r ON r.intent_id = i.id
      WHERE i.expires_at > NOW()
      GROUP BY i.id, u.username, i.tags, i.duration
      ORDER BY i.created_at DESC
      LIMIT 50
    `;

    return rows.map((item: any) => ({
      id:            item.id,
      statement:     item.statement,
      category:      item.category,
      location:      item.location ?? null,
      expiresAt:     new Date(item.expires_at),
      createdAt:     new Date(item.created_at),
      mode:          item.mode,
      responseCount: Number(item.response_count ?? 0),
      username:      item.username,
    }));
  } catch (error) {
    console.error("Feed fetch error:", error);
    return [];
  }
}

export default async function FeedPage() {
  const items = await getFeed();
  return <Feed items={items} />;
}