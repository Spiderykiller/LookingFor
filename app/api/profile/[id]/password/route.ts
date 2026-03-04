// app/api/profile/[id]/password/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql } from "@/lib/db";
import { compare, hash } from "bcryptjs";

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

    if (session.user.id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "currentPassword and newPassword are required" },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Fetch current hashed password — only local accounts have one
    const userRecord = await sql`
      SELECT password, provider FROM users WHERE id = ${userId} LIMIT 1
    `;

    if (!userRecord[0]) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (userRecord[0].provider !== "local") {
      return NextResponse.json(
        { error: "Password change is only available for email accounts" },
        { status: 400 }
      );
    }

    if (!userRecord[0].password) {
      return NextResponse.json({ error: "No password set" }, { status: 400 });
    }

    // Verify current password
    const isValid = await compare(currentPassword, String(userRecord[0].password));
    if (!isValid) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 401 }
      );
    }

    // Hash and save new password
    const hashed = await hash(newPassword, 10);

    await sql`
      UPDATE users SET password = ${hashed} WHERE id = ${userId}
    `;

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Password PATCH error:", error);
    return NextResponse.json({ error: "Failed to update password" }, { status: 500 });
  }
}