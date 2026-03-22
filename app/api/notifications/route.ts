// lookingfor/app/api/notifications/route.ts
// Derived notifications — no notifications table needed.
// Builds notifications from existing data: intent responses + expiring intents.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = String(session.user.id);

  try {
    const notifications: any[] = [];

    // ── Intent responses ────────────────────────────────────────
    // Intents owned by this user that have at least 1 response
    const intentsWithResponses = await sql`
      SELECT
        i.id,
        i.statement,
        i.mode,
        i.created_at,
        i.expires_at,
        COUNT(r.id)::int AS response_count
      FROM intents i
      LEFT JOIN responses r ON r.intent_id = i.id
      WHERE i.user_id = ${userId}
        AND i.expires_at > NOW()
        AND COUNT(r.id) > 0
      GROUP BY i.id
      HAVING COUNT(r.id) > 0
      ORDER BY i.created_at DESC
      LIMIT 20
    `;

    for (const intent of intentsWithResponses) {
      notifications.push({
        id:      `resp-${intent.id}`,
        type:    "response",
        title:   `${intent.response_count} response${intent.response_count !== 1 ? "s" : ""} on your intent`,
        sub:     intent.statement.slice(0, 80) + (intent.statement.length > 80 ? "…" : ""),
        time:    intent.created_at,
        read:    false,
        icon:    "✉️",
        iconBg:  "rgba(228,87,46,0.12)",
        targetId: intent.id,
      });
    }

    // ── Expiring soon (< 2 hours) ───────────────────────────────
    const expiring = await sql`
      SELECT id, statement, expires_at
      FROM intents
      WHERE user_id = ${userId}
        AND expires_at > NOW()
        AND expires_at < NOW() + INTERVAL '2 hours'
      ORDER BY expires_at ASC
      LIMIT 5
    `;

    for (const intent of expiring) {
      const ms       = new Date(intent.expires_at).getTime() - Date.now();
      const minsLeft = Math.floor(ms / 60000);
      notifications.push({
        id:      `exp-${intent.id}`,
        type:    "expiring",
        title:   "Your intent is expiring soon",
        sub:     `"${intent.statement.slice(0, 60)}…" — ${minsLeft}m left`,
        time:    new Date().toISOString(),
        read:    false,
        icon:    "⏰",
        iconBg:  "rgba(239,68,68,0.12)",
        targetId: intent.id,
      });
    }

    // Sort: by time desc
    notifications.sort((a, b) =>
      new Date(b.time).getTime() - new Date(a.time).getTime()
    );

    return NextResponse.json(notifications);

  } catch (err) {
    console.error("[api/notifications] error:", err);
    return NextResponse.json([], { status: 200 }); // fail gracefully
  }
}