/**
 * POST /api/context/ingest/file
 *
 * Accepts a multipart form upload and ingests the file into the creator's
 * Tropicalia project.
 *
 * Form fields:
 *   handle:   string  — creator's twin handle
 *   platform: string  — defaults to "manual"
 *   file:     File    — .txt, .md, .csv, .pdf, .png, .jpg, .jpeg
 */

import { NextRequest, NextResponse } from "next/server";
import { createProject, uploadFile } from "@/lib/tropicalia";
import type { Platform } from "@/lib/store";
import { getCreator, upsertCreator } from "@/lib/store";

const TEXT_EXTENSIONS = new Set(["txt", "md", "csv"]);

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();

    const handle = form.get("handle") as string | null;
    const platform = ((form.get("platform") as string) ?? "manual") as Platform;
    const file = form.get("file") as File | null;

    if (!handle || !file) {
      return NextResponse.json(
        { error: "handle and file are required" },
        { status: 400 }
      );
    }

    const normalizedHandle = handle.toLowerCase().replace(/^@/, "");
    let creator = await getCreator(normalizedHandle);

    if (!creator?.boxId) {
      const projectId = await createProject(normalizedHandle);
      creator = {
        handle: normalizedHandle,
        displayName: handle,
        boxId: projectId,
        connectedPlatforms: [],
        totalChunks: 0,
      };
      await upsertCreator(creator);
    }

    const ext = (file.name.split(".").pop() ?? "").toLowerCase();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const timestamp = Date.now();

    let uploadFilename: string;
    let uploadContent: string | Blob;

    if (TEXT_EXTENSIONS.has(ext) || file.type.startsWith("text/")) {
      // Read as text and wrap in a markdown document
      const text = await file.text();
      uploadContent = `# ${file.name}\nUploaded: ${new Date().toISOString()}\n\n${text}`;
      uploadFilename = `${normalizedHandle}_${timestamp}_${safeName.replace(/\.[^.]+$/, ".md")}`;
    } else {
      // Forward binary file (PDF, image) directly to Tropicalia
      uploadContent = new Blob([await file.arrayBuffer()], { type: file.type });
      uploadFilename = `${normalizedHandle}_${timestamp}_${safeName}`;
    }

    await uploadFile(creator.boxId!, uploadFilename, uploadContent);

    const updatedPlatforms = creator.connectedPlatforms.includes(platform)
      ? creator.connectedPlatforms
      : [...creator.connectedPlatforms, platform];

    await upsertCreator({
      ...creator,
      connectedPlatforms: updatedPlatforms,
      totalChunks: creator.totalChunks + 1,
      lastIngested: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, filesUploaded: 1, platform });
  } catch (err: any) {
    console.error("[ingest/file]", err);
    return NextResponse.json(
      { error: err.message ?? "Ingest failed" },
      { status: 500 }
    );
  }
}
