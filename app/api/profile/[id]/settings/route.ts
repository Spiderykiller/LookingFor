// lookingfor/app/api/profile/[id]/settings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id || String(session.user.id) !== params.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rows = await sql`
      SELECT settings FROM users WHERE id = ${params.id} LIMIT 1
    `;
    const settings = rows[0]?.settings ?? {};
    return NextResponse.json(settings);
  } catch (err) {
    console.error("[settings/GET]", err);
    return NextResponse.json({}, { status: 200 }); // fail gracefully
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id || String(session.user.id) !== params.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    // Merge incoming settings with existing ones (JSONB merge)
    await sql`
      UPDATE users
      SET settings = COALESCE(settings, '{}') || ${JSON.stringify(body)}::jsonb
      WHERE id = ${params.id}
    `;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[settings/PATCH]", err);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}