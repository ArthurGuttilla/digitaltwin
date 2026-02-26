/**
 * Tropicalia.dev - AI Context Layer
 *
 * Tropicalia stores "context boxes" — isolated knowledge stores per creator.
 * Each creator gets a unique boxId. We push their social content as context
 * chunks and query them when generating twin responses.
 *
 * API base: https://api.tropicalia.dev
 * Auth: Bearer token via TROPICALIA_API_KEY env var
 */

const BASE_URL = process.env.TROPICALIA_BASE_URL ?? "https://api.tropicalia.dev";
const API_KEY = process.env.TROPICALIA_API_KEY ?? "";

export interface ContextChunk {
  id?: string;
  content: string;
  metadata?: Record<string, string>;
}

export interface QueryResult {
  chunks: ContextChunk[];
  relevance_scores?: number[];
}

function headers() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${API_KEY}`,
  };
}

/**
 * Create a new context box for a creator.
 * Returns the boxId to be stored on the creator's profile.
 */
export async function createBox(creatorHandle: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/v1/boxes`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ name: `twin:${creatorHandle}`, description: `Digital twin context for @${creatorHandle}` }),
  });
  if (!res.ok) throw new Error(`Tropicalia createBox failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.id as string;
}

/**
 * Ingest an array of context chunks into a creator's box.
 * Used after pulling content from social platforms.
 */
export async function ingestChunks(boxId: string, chunks: ContextChunk[]): Promise<void> {
  const res = await fetch(`${BASE_URL}/v1/boxes/${boxId}/chunks`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ chunks }),
  });
  if (!res.ok) throw new Error(`Tropicalia ingestChunks failed: ${res.status} ${await res.text()}`);
}

/**
 * Query the context box for relevant chunks given a user's message.
 * Returns the top-k most relevant context chunks.
 */
export async function queryContext(boxId: string, query: string, topK = 8): Promise<QueryResult> {
  const res = await fetch(`${BASE_URL}/v1/boxes/${boxId}/query`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ query, top_k: topK }),
  });
  if (!res.ok) throw new Error(`Tropicalia queryContext failed: ${res.status} ${await res.text()}`);
  return res.json();
}

/**
 * List all chunks in a box (for dashboard display).
 */
export async function listChunks(boxId: string): Promise<ContextChunk[]> {
  const res = await fetch(`${BASE_URL}/v1/boxes/${boxId}/chunks`, {
    headers: headers(),
  });
  if (!res.ok) throw new Error(`Tropicalia listChunks failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.chunks as ContextChunk[];
}

/**
 * Delete all chunks in a box (reset the twin's memory).
 */
export async function clearBox(boxId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/v1/boxes/${boxId}/chunks`, {
    method: "DELETE",
    headers: headers(),
  });
  if (!res.ok) throw new Error(`Tropicalia clearBox failed: ${res.status} ${await res.text()}`);
}

/**
 * Build a system prompt from retrieved context chunks.
 * This becomes the twin's "personality" for the current conversation.
 */
export function buildSystemPrompt(creatorHandle: string, chunks: ContextChunk[]): string {
  const contextBlock = chunks.map((c, i) => `[${i + 1}] ${c.content}`).join("\n\n");

  return `You are the digital twin of @${creatorHandle} — an AI that communicates exactly as they do based on their social media content.

## Your personality is derived from these real posts and content by @${creatorHandle}:

${contextBlock}

## Rules:
- Mirror their tone, vocabulary, sentence structure, and energy exactly.
- If they use slang, abbreviations, or emojis — use them too.
- Stay true to their opinions and topics they cover.
- Never break character. Never say you are an AI unless directly asked.
- When asked, respond as if you ARE @${creatorHandle}.
- Keep responses appropriately concise or detailed based on how they write.`;
}
