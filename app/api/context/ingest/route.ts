/**
 * POST /api/context/ingest
 *
 * Ingests social content for a creator into their Tropicalia context box.
 * Body: { handle, platform, accessToken?, userId?, content? }
 *
 * - platform = "twitter" | "youtube" | "instagram" | "manual"
 * - content (string) = raw text for manual ingestion
 * - Creates the Tropicalia box on first ingest.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  createBox,
  ingestChunks,
  clearBox,
} from "@/lib/tropicalia";
import {
  fetchTwitterPosts,
  fetchYouTubePosts,
  fetchInstagramPosts,
  parseManualContent,
} from "@/lib/social";
import type { Platform } from "@/lib/store";
import { getCreator, upsertCreator } from "@/lib/store";
import type { ContextChunk } from "@/lib/tropicalia";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { handle, platform, content, reset } = body as {
      handle: string;
      platform: Platform;
      content?: string;
      reset?: boolean;
    };

    if (!handle || !platform) {
      return NextResponse.json({ error: "handle and platform are required" }, { status: 400 });
    }

    const normalizedHandle = handle.toLowerCase().replace(/^@/, "");
    let creator = getCreator(normalizedHandle);

    // Create Tropicalia box if this is the first ingest
    if (!creator || !creator.boxId) {
      const boxId = await createBox(normalizedHandle);
      creator = {
        handle: normalizedHandle,
        displayName: handle,
        boxId,
        connectedPlatforms: [],
        totalChunks: 0,
      };
      upsertCreator(creator);
    }

    // Optionally reset the box before re-ingesting
    if (reset && creator.boxId) {
      await clearBox(creator.boxId);
      creator.totalChunks = 0;
    }

    let chunks: ContextChunk[] = [];

    switch (platform) {
      case "twitter":
        chunks = await fetchTwitterPosts(normalizedHandle);
        break;
      case "youtube":
        chunks = await fetchYouTubePosts(normalizedHandle);
        break;
      case "instagram": {
        const igUserId = body.userId as string;
        if (!igUserId) return NextResponse.json({ error: "userId required for instagram" }, { status: 400 });
        chunks = await fetchInstagramPosts(igUserId);
        break;
      }
      case "manual":
        if (!content) return NextResponse.json({ error: "content required for manual ingest" }, { status: 400 });
        chunks = parseManualContent(content, "manual");
        break;
      default:
        return NextResponse.json({ error: `Unsupported platform: ${platform}` }, { status: 400 });
    }

    if (chunks.length === 0) {
      return NextResponse.json({ error: "No content found to ingest", chunks: 0 }, { status: 200 });
    }

    await ingestChunks(creator.boxId!, chunks);

    // Update creator profile
    const updatedPlatforms = creator.connectedPlatforms.includes(platform)
      ? creator.connectedPlatforms
      : [...creator.connectedPlatforms, platform];

    upsertCreator({
      ...creator,
      connectedPlatforms: updatedPlatforms,
      totalChunks: creator.totalChunks + chunks.length,
      lastIngested: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      boxId: creator.boxId,
      chunksIngested: chunks.length,
      platform,
    });
  } catch (err: any) {
    console.error("[ingest]", err);
    return NextResponse.json({ error: err.message ?? "Ingest failed" }, { status: 500 });
  }
}
