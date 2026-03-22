// lookingfor/app/api/notifications/count/route.ts
// Returns just the unread notification count for the bell badge.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ count: 0 });
  }

  const userId = String(session.user.id);

  try {
    let count = 0;

    // Count intents with responses
    const responseResult = await sql`
      SELECT COUNT(DISTINCT i.id)::int AS n
      FROM intents i
      WHERE i.user_id = ${userId}
        AND i.expires_at > NOW()
        AND EXISTS (
          SELECT 1 FROM responses r WHERE r.intent_id = i.id
        )
    `;
    count += responseResult[0]?.n ?? 0;

    // Count expiring intents (< 2 hours)
    const expiringResult = await sql`
      SELECT COUNT(*)::int AS n
      FROM intents
      WHERE user_id = ${userId}
        AND expires_at > NOW()
        AND expires_at < NOW() + INTERVAL '2 hours'
    `;
    count += expiringResult[0]?.n ?? 0;

    return NextResponse.json({ count });

  } catch {
    return NextResponse.json({ count: 0 });
  }
}