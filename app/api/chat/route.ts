/**
 * POST /api/chat
 *
 * Streaming chat endpoint. On each message:
 *  1. Query Tropicalia for the most relevant context from the creator's project
 *  2. Build a system prompt that makes Claude respond as the creator's twin
 *  3. Stream Claude's response back to the client
 *
 * Body: {
 *   handle:   string                              — creator's handle
 *   messages: { role: "user"|"assistant", content: string }[]
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { queryContext, buildSystemPrompt } from "@/lib/tropicalia";
import { getCreatorByHandle } from "@/lib/store";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { handle, messages } = body as {
      handle: string;
      messages: { role: "user" | "assistant"; content: string }[];
    };

    if (!handle || !messages?.length) {
      return NextResponse.json(
        { error: "handle and messages are required" },
        { status: 400 }
      );
    }

    const normalizedHandle = handle.toLowerCase().replace(/^@/, "");
    const creator = await getCreatorByHandle(normalizedHandle);

    if (!creator?.boxId) {
      return NextResponse.json(
        { error: `No project found for @${normalizedHandle}. Please sync social content first.` },
        { status: 404 }
      );
    }

    // Use the latest user message as the Tropicalia query
    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
    const query = lastUserMessage?.content ?? "";

    // Pull relevant context chunks from Tropicalia
    const results = await queryContext(creator.boxId, query, 8);
    const systemPrompt = buildSystemPrompt(normalizedHandle, results);

    // Stream Claude's response
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
    return NextResponse.json(
      { error: err.message ?? "Chat failed" },
      { status: 500 }
    );
  }
}
