// app/api/profile/[id]/tags/route.ts
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;
    const { tags } = await req.json();

    if (!Array.isArray(tags)) {
      return NextResponse.json({ error: "Tags must be an array" }, { status: 400 });
    }

    await sql`
      UPDATE users
      SET interest_tags = ${tags.join(",")}
      WHERE id = ${userId}
    `;

    return NextResponse.json({ success: true, tags });

  } catch (error) {
    console.error("Tags PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update tags" },
      { status: 500 }
    );
  }
}