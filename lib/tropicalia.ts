/**
 * Tropicalia.dev — AI Context Layer
 *
 * API reference:
 *  POST /v1/projects            → create a project (one per creator twin)
 *  POST /v1/upload/file               → upload a document into a project (multipart)
 *  POST /v1/projects/:id/query  → query relevant context from a project
 *
 * Auth: env var TROPICALIA_API (Bearer token, format: tr_...)
 */

const BASE_URL = "https://api.tropicalia.dev";
const API_KEY = process.env.TROPICALIA_API ?? "";

function authHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${API_KEY}` };
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TropicaliaProject {
  id: string;
  name: string;
}

export interface QueryResult {
  content: string;
  score?: number;
}

// ─── Safe JSON helper — prevents "Unexpected end of JSON input" ───────────────

async function safeJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text || text.trim() === "") {
    throw new Error(`Tropicalia returned empty body (HTTP ${res.status})`);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      `Tropicalia returned non-JSON (HTTP ${res.status}): ${text.slice(0, 300)}`
    );
  }
}

// ─── Projects ─────────────────────────────────────────────────────────────────

/**
 * Create a new Tropicalia project for a creator twin.
 * Returns the project ID stored on the creator's profile.
 */
export async function createProject(creatorHandle: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/v1/projects`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({
      name: `twin:${creatorHandle}`,
      description: `Digital twin context for @${creatorHandle}`,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Tropicalia createProject failed (HTTP ${res.status}): ${body}`);
  }

  const data = await safeJson<Record<string, any>>(res);

  // Log the full response so we can see the actual shape in Vercel logs
  console.log("[createProject] Tropicalia response:", JSON.stringify(data));

  // Handle common response shapes
  const id: string | undefined =
    data.public_id ??
    data.id ??
    data.project_id ??
    data.projectId ??
    data.data?.id ??
    data.project?.id;

  if (!id) {
    throw new Error(
      `Tropicalia createProject: could not find project ID in response: ${JSON.stringify(data)}`
    );
  }

  return id;
}

// ─── File upload ──────────────────────────────────────────────────────────────

/**
 * Upload a plain-text document into a creator's Tropicalia project.
 * Each social platform sync = one file.  Uses multipart/form-data.
 */
export async function uploadFile(
  projectId: string,
  filename: string,
  content: string | Blob
): Promise<void> {
  const form = new FormData();
  form.append("project_id", projectId);
  form.append(
    "file",
    typeof content === "string"
      ? new Blob([content], { type: "text/markdown" })
      : content,
    filename
  );

  const res = await fetch(`${BASE_URL}/v1/upload/file`, {
    method: "POST",
    // Do NOT set Content-Type — fetch sets the multipart boundary automatically
    headers: authHeaders(),
    body: form,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Tropicalia uploadFile failed (HTTP ${res.status}): ${body}`);
  }
}

// ─── Query ────────────────────────────────────────────────────────────────────

/**
 * Query a creator's project for the most relevant context.
 * Called on every chat message to ground Claude's response.
 */
export async function queryContext(
  projectId: string,
  query: string,
  topK = 8
): Promise<QueryResult[]> {
  const res = await fetch(`${BASE_URL}/v1/projects/${projectId}/query`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ query, top_k: topK }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Tropicalia queryContext failed (HTTP ${res.status}): ${body}`);
  }

  const data = await safeJson<{ results: QueryResult[] }>(res);
  return data.results ?? [];
}

// ─── System prompt ────────────────────────────────────────────────────────────

/**
 * Build a Claude system prompt from Tropicalia's retrieved context results.
 */
export function buildSystemPrompt(
  creatorHandle: string,
  results: QueryResult[]
): string {
  const contextBlock = results
    .map((r, i) => `[${i + 1}] ${r.content}`)
    .join("\n\n");

  return `You are the digital twin of @${creatorHandle} — an AI that communicates exactly as they do, based on their real social media content and writing.

## Context retrieved from @${creatorHandle}'s public content:

${contextBlock || "(No context yet — ask the creator to sync their socials.)"}

## Rules:
- Mirror their tone, vocabulary, sentence structure, and energy exactly.
- If they use slang, abbreviations, or emojis — use them too.
- Stay true to their opinions and the topics they cover.
- Never break character or admit you are an AI unless directly asked.
- Respond as if you ARE @${creatorHandle}.
- Match the length and style of how they naturally write.`;
}
