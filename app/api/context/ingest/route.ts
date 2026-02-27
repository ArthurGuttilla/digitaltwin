/**
 * POST /api/context/ingest
 *
 * Scrapes a URL with Firecrawl (or accepts manual text) then uploads
 * the resulting text as a .txt file to the creator's Tropicalia project.
 *
 * Body:
 *   handle:         string  — creator's twin handle
 *   platform:       string  — "twitter" | "youtube" | "instagram" | "manual"
 *   url?:           string  — full URL to scrape (preferred for social platforms)
 *   platformHandle? string  — fallback handle if url is omitted
 *   content?:       string  — raw text, required when platform = "manual"
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createProject, uploadFile } from "@/lib/tropicalia";
import { crawlUrl, crawlSocialProfile, parseManualContent } from "@/lib/social";
import type { Platform } from "@/lib/store";
import { getCreator, upsertCreator } from "@/lib/store";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { handle, platform, url, platformHandle, content } = body as {
      handle: string;
      platform: Platform;
      url?: string;
      platformHandle?: string;
      content?: string;
    };

    if (!handle || !platform) {
      return NextResponse.json(
        { error: "handle and platform are required" },
        { status: 400 }
      );
    }

    const userId = session.user.id;
    const normalizedHandle = handle.toLowerCase().replace(/^@/, "");
    let creator = await getCreator(userId, normalizedHandle);

    // Auto-create Tropicalia project on first ingest
    if (!creator?.boxId) {
      const projectId = await createProject(normalizedHandle);
      creator = {
        userId,
        handle: normalizedHandle,
        displayName: handle,
        boxId: projectId,
        connectedPlatforms: [],
        totalChunks: 0,
      };
      await upsertCreator(creator);
    }

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
      // Use the full URL if the frontend sent one; otherwise build from handle
      if (url?.trim()) {
        fileContent = await crawlUrl(url.trim());
      } else {
        const targetHandle = (platformHandle || normalizedHandle).replace(/^@/, "");
        fileContent = await crawlSocialProfile(platform, targetHandle);
      }
      const slug = url
        ? new URL(url).hostname.replace(/\./g, "_")
        : platform;
      filename = `${slug}_${normalizedHandle}_${Date.now()}.txt`;
    }

    await uploadFile(creator.boxId!, filename, fileContent);

    const updatedPlatforms = creator.connectedPlatforms.includes(platform)
      ? creator.connectedPlatforms
      : [...creator.connectedPlatforms, platform];

    await upsertCreator({
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
      scrapedUrl: url ?? null,
    });
  } catch (err: any) {
    console.error("[ingest]", err);
    return NextResponse.json(
      { error: err.message ?? "Ingest failed" },
      { status: 500 }
    );
  }
}
