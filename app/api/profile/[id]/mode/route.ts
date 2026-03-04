// app/api/profile/[id]/mode/route.ts
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params; // Next.js 15 — params is a Promise
    const { mode } = await req.json();

    if (!mode || !["looking", "offering"].includes(mode)) {
      return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
    }

    await sql`
      UPDATE users
      SET current_mode = ${mode}
      WHERE id = ${userId}
    `;

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Mode PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update mode" },
      { status: 500 }
    );
  }
}