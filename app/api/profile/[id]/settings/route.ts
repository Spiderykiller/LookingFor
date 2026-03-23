// lookingfor/app/api/profile/[id]/settings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id || String(session.user.id) !== id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rows = await sql`
      SELECT settings FROM users WHERE id = ${id} LIMIT 1
    `;
    return NextResponse.json(rows[0]?.settings ?? {});
  } catch {
    return NextResponse.json({});
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id || String(session.user.id) !== id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    await sql`
      UPDATE users
      SET settings = COALESCE(settings, '{}') || ${JSON.stringify(body)}::jsonb
      WHERE id = ${id}
    `;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[settings/PATCH]", err);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}