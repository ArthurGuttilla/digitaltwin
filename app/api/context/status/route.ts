/**
 * GET  /api/context/status?handle=<handle>  — return creator's twin status
 * POST /api/context/status                  — initialize creator + Tropicalia project
 */

import { NextRequest, NextResponse } from "next/server";
import { getCreator, upsertCreator } from "@/lib/store";
import { createProject } from "@/lib/tropicalia";

export async function GET(req: NextRequest) {
  const handle = req.nextUrl.searchParams.get("handle");
  if (!handle) {
    return NextResponse.json({ error: "handle is required" }, { status: 400 });
  }

  const normalizedHandle = handle.toLowerCase().replace(/^@/, "");
  const creator = getCreator(normalizedHandle);

  if (!creator) {
    return NextResponse.json({
      handle: normalizedHandle,
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
    const { handle, displayName } = body as {
      handle: string;
      displayName?: string;
    };

    if (!handle) {
      return NextResponse.json({ error: "handle is required" }, { status: 400 });
    }

    const normalizedHandle = handle.toLowerCase().replace(/^@/, "");
    let creator = getCreator(normalizedHandle);

    // Already initialized — return existing profile
    if (creator?.boxId) {
      return NextResponse.json({ ...creator, ready: creator.totalChunks > 0 });
    }

    // Create Tropicalia project for this twin
    const projectId = await createProject(normalizedHandle);

    creator = {
      handle: normalizedHandle,
      displayName: displayName ?? handle,
      boxId: projectId,
      connectedPlatforms: [],
      totalChunks: 0,
    };
    upsertCreator(creator);

    return NextResponse.json({ ...creator, ready: false });
  } catch (err: any) {
    console.error("[status/post]", err);
    return NextResponse.json(
      { error: err.message ?? "Failed to create twin" },
      { status: 500 }
    );
  }
}
