/**
 * GET /api/context/status?handle=<handle>
 *
 * Returns the current state of a creator's digital twin context.
 */

import { NextRequest, NextResponse } from "next/server";
import { getCreator, upsertCreator } from "@/lib/store";
import { createBox } from "@/lib/tropicalia";

export async function GET(req: NextRequest) {
  const handle = req.nextUrl.searchParams.get("handle");
  if (!handle) return NextResponse.json({ error: "handle is required" }, { status: 400 });

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

  return NextResponse.json({
    ...creator,
    ready: creator.totalChunks > 0,
  });
}

/**
 * POST /api/context/status
 *
 * Initialize a creator profile (creates their Tropicalia box).
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { handle, displayName } = body as { handle: string; displayName?: string };

  if (!handle) return NextResponse.json({ error: "handle is required" }, { status: 400 });
  const normalizedHandle = handle.toLowerCase().replace(/^@/, "");

  let creator = getCreator(normalizedHandle);
  if (creator?.boxId) {
    return NextResponse.json({ ...creator, ready: creator.totalChunks > 0 });
  }

  const boxId = await createBox(normalizedHandle);
  creator = {
    handle: normalizedHandle,
    displayName: displayName ?? handle,
    boxId,
    connectedPlatforms: [],
    totalChunks: 0,
  };
  upsertCreator(creator);

  return NextResponse.json({ ...creator, ready: false });
}
