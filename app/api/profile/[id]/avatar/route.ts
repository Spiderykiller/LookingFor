// app/api/profile/[id]/avatar/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql } from "@/lib/db";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: userId } = await params;

    // Only allow users to update their own avatar
    if (session.user.id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { avatar_url } = await req.json();

    if (!avatar_url || typeof avatar_url !== "string") {
      return NextResponse.json({ error: "avatar_url required" }, { status: 400 });
    }

    // Limit size — base64 200x200 JPEG ~ 15KB, reject anything over 100KB
    if (avatar_url.length > 100_000) {
      return NextResponse.json({ error: "Image too large" }, { status: 413 });
    }

    await sql`
      UPDATE users
      SET avatar_url = ${avatar_url}
      WHERE id = ${userId}
    `;

    return NextResponse.json({ success: true, avatar_url });

  } catch (error) {
    console.error("Avatar PATCH error:", error);
    return NextResponse.json({ error: "Failed to update avatar" }, { status: 500 });
  }
}