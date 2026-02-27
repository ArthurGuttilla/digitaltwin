/**
 * GET  /api/context/status?handle=<handle>  — public: return twin status for the chat page
 * POST /api/context/status                  — protected: initialize a twin for the logged-in user
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCreatorByHandle, getCreator, upsertCreator } from "@/lib/store";
import { createProject } from "@/lib/tropicalia";

// Public — used by the /twin/[handle] chat page
export async function GET(req: NextRequest) {
  const handle = req.nextUrl.searchParams.get("handle");
  if (!handle) {
    return NextResponse.json({ error: "handle is required" }, { status: 400 });
  }

  const creator = await getCreatorByHandle(handle);
  if (!creator) {
    return NextResponse.json({
      handle: handle.toLowerCase(),
      boxId: null,
      connectedPlatforms: [],
      totalChunks: 0,
      lastIngested: null,
      ready: false,
    });
  }

  return NextResponse.json({ ...creator, ready: creator.totalChunks > 0 });
}

// Protected — creates a Tropicalia project for the signed-in creator
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { handle, displayName } = body as { handle: string; displayName?: string };

    if (!handle) {
      return NextResponse.json({ error: "handle is required" }, { status: 400 });
    }

    const userId = session.user.id;
    const normalizedHandle = handle.toLowerCase().replace(/^@/, "");

    let creator = await getCreator(userId, normalizedHandle);
    if (creator?.boxId) {
      return NextResponse.json({ ...creator, ready: creator.totalChunks > 0 });
    }

    const projectId = await createProject(normalizedHandle);

    creator = {
      userId,
      handle: normalizedHandle,
      displayName: displayName ?? handle,
      boxId: projectId,
      connectedPlatforms: [],
      totalChunks: 0,
    };
    await upsertCreator(creator);

    return NextResponse.json({ ...creator, ready: false });
  } catch (err: any) {
    console.error("[status/post]", err);
    return NextResponse.json(
      { error: err.message ?? "Failed to create twin" },
      { status: 500 }
    );
  }
}
