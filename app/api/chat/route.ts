/**
 * POST /api/chat
 *
 * Streaming chat endpoint that uses Tropicalia context to respond as the creator's twin.
 *
 * Body: {
 *   handle: string         — creator's handle
 *   messages: { role, content }[]  — conversation history
 * }
 *
 * Returns a streaming text/event-stream response.
 */

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { queryContext, buildSystemPrompt } from "@/lib/tropicalia";
import { getCreator } from "@/lib/store";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { handle, messages } = body as {
      handle: string;
      messages: { role: "user" | "assistant"; content: string }[];
    };

    if (!handle || !messages?.length) {
      return NextResponse.json({ error: "handle and messages are required" }, { status: 400 });
    }

    const normalizedHandle = handle.toLowerCase().replace(/^@/, "");
    const creator = getCreator(normalizedHandle);

    if (!creator || !creator.boxId) {
      return NextResponse.json(
        { error: `No context found for @${normalizedHandle}. Please ingest social content first.` },
        { status: 404 }
      );
    }

    // Get the latest user message to use as the context query
    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
    const query = lastUserMessage?.content ?? "";

    // Pull relevant context from Tropicalia
    const contextResult = await queryContext(creator.boxId, query, 8);
    const systemPrompt = buildSystemPrompt(normalizedHandle, contextResult.chunks);

    // Stream response from Claude
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const claudeStream = anthropic.messages.stream({
          model: "claude-sonnet-4-6",
          max_tokens: 1024,
          system: systemPrompt,
          messages,
        });

        for await (const event of claudeStream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err: any) {
    console.error("[chat]", err);
    return NextResponse.json({ error: err.message ?? "Chat failed" }, { status: 500 });
  }
}
