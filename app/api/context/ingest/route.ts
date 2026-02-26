/**
 * POST /api/context/ingest
 *
 * Scrapes a creator's public social profile using Firecrawl (or accepts
 * manual text), then uploads it as a .txt file to their Tropicalia project.
 *
 * Body: {
 *   handle:         string   — creator's handle (identifies the twin)
 *   platform:       string   — "twitter" | "youtube" | "instagram" | "manual"
 *   platformHandle: string   — the handle on that specific platform (may differ)
 *   content?:       string   — raw text, required for platform = "manual"
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { createProject, uploadFile } from "@/lib/tropicalia";
import { crawlSocialProfile, parseManualContent } from "@/lib/social";
import type { Platform } from "@/lib/store";
import { getCreator, upsertCreator } from "@/lib/store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { handle, platform, platformHandle, content } = body as {
      handle: string;
      platform: Platform;
      platformHandle?: string;
      content?: string;
    };

    if (!handle || !platform) {
      return NextResponse.json(
        { error: "handle and platform are required" },
        { status: 400 }
      );
    }

    const normalizedHandle = handle.toLowerCase().replace(/^@/, "");
    let creator = getCreator(normalizedHandle);

    // Auto-create Tropicalia project if not yet initialized
    if (!creator || !creator.boxId) {
      const projectId = await createProject(normalizedHandle);
      creator = {
        handle: normalizedHandle,
        displayName: handle,
        boxId: projectId,
        connectedPlatforms: [],
        totalChunks: 0,
      };
      upsertCreator(creator);
    }

    // The handle to crawl — may differ from the creator's app handle
    const targetHandle = (platformHandle || normalizedHandle).replace(/^@/, "");

    let fileContent: string;
    let filename: string;

    if (platform === "manual") {
      if (!content?.trim()) {
        return NextResponse.json(
          { error: "content is required for manual ingest" },
          { status: 400 }
        );
      }
      fileContent = parseManualContent(content);
      filename = `manual_${normalizedHandle}_${Date.now()}.txt`;
    } else {
      fileContent = await crawlSocialProfile(platform, targetHandle);
      filename = `${platform}_${targetHandle}_${Date.now()}.txt`;
    }

    await uploadFile(creator.boxId!, filename, fileContent);

    const updatedPlatforms = creator.connectedPlatforms.includes(platform)
      ? creator.connectedPlatforms
      : [...creator.connectedPlatforms, platform];

    upsertCreator({
      ...creator,
      connectedPlatforms: updatedPlatforms,
      totalChunks: creator.totalChunks + 1,
      lastIngested: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      projectId: creator.boxId,
      filesUploaded: 1,
      platform,
    });
  } catch (err: any) {
    console.error("[ingest]", err);
    return NextResponse.json(
      { error: err.message ?? "Ingest failed" },
      { status: 500 }
    );
  }
}
