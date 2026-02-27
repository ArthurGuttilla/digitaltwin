/**
 * GET  /api/context/status?handle=<handle>  — return twin status
 * POST /api/context/status                  — initialize a twin (public)
 */

import { NextRequest, NextResponse } from "next/server";
import { getCreator, upsertCreator, type Platform } from "@/lib/store";
import { createProject } from "@/lib/tropicalia";

export async function GET(req: NextRequest) {
  const handle = req.nextUrl.searchParams.get("handle");
  if (!handle) {
    return NextResponse.json({ error: "handle is required" }, { status: 400 });
  }

  const creator = await getCreator(handle);
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { handle, displayName } = body as { handle: string; displayName?: string };

    if (!handle) {
      return NextResponse.json({ error: "handle is required" }, { status: 400 });
    }

    const normalizedHandle = handle.toLowerCase().replace(/^@/, "");

    const existing = await getCreator(normalizedHandle);
    if (existing?.boxId) {
      return NextResponse.json({ ...existing, ready: existing.totalChunks > 0 });
    }

    const projectId = await createProject(normalizedHandle);

    const creator = {
      handle: normalizedHandle,
      displayName: (displayName || handle).trim(),
      boxId: projectId,
      connectedPlatforms: [] as Platform[],
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
