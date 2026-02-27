/**
 * GET /api/user/twins  — protected
 *
 * Returns all digital twins belonging to the currently signed-in user.
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserCreators } from "@/lib/store";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const creators = getUserCreators(session.user.id);
  return NextResponse.json({ creators });
}
