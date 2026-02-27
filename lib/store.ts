/**
 * Creator profile store — backed by Postgres.
 * Public: no user auth required. Twins are identified by handle alone.
 */

import { randomUUID } from "crypto";
import { getDb } from "./db";

export type Platform = "twitter" | "youtube" | "instagram" | "manual";

export interface CreatorProfile {
  handle: string;
  displayName: string;
  boxId: string | null;
  connectedPlatforms: Platform[];
  totalChunks: number;
  lastIngested?: string;
}

interface CreatorRow {
  handle: string;
  display_name: string;
  box_id: string | null;
  connected_platforms: Platform[];
  total_chunks: number;
  last_ingested: Date | null;
}

function rowToProfile(row: CreatorRow): CreatorProfile {
  return {
    handle: row.handle,
    displayName: row.display_name,
    boxId: row.box_id,
    connectedPlatforms: row.connected_platforms,
    totalChunks: row.total_chunks,
    lastIngested: row.last_ingested?.toISOString(),
  };
}

export async function getCreator(handle: string): Promise<CreatorProfile | undefined> {
  const sql = await getDb();
  const [row] = await sql<CreatorRow[]>`
    SELECT * FROM creators WHERE handle = ${handle.toLowerCase()}
  `;
  return row ? rowToProfile(row) : undefined;
}

export async function getAllCreators(): Promise<CreatorProfile[]> {
  const sql = await getDb();
  const rows = await sql<CreatorRow[]>`
    SELECT * FROM creators ORDER BY created_at DESC
  `;
  return rows.map(rowToProfile);
}

export async function upsertCreator(profile: CreatorProfile): Promise<void> {
  const sql = await getDb();
  await sql`
    INSERT INTO creators
      (id, handle, display_name, box_id, connected_platforms, total_chunks, last_ingested)
    VALUES (
      ${randomUUID()},
      ${profile.handle.toLowerCase()},
      ${profile.displayName},
      ${profile.boxId},
      ${JSON.stringify(profile.connectedPlatforms)},
      ${profile.totalChunks},
      ${profile.lastIngested ?? null}
    )
    ON CONFLICT (handle) DO UPDATE SET
      display_name        = EXCLUDED.display_name,
      box_id              = EXCLUDED.box_id,
      connected_platforms = EXCLUDED.connected_platforms,
      total_chunks        = EXCLUDED.total_chunks,
      last_ingested       = EXCLUDED.last_ingested
  `;
}
