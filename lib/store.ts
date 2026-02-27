/**
 * Creator profile store — backed by Postgres.
 * All functions are async; DB is lazily connected via getDb().
 */

import { randomUUID } from "crypto";
import { getDb } from "./db";

export type Platform = "twitter" | "youtube" | "instagram" | "manual";

export interface CreatorProfile {
  userId: string;
  handle: string;
  displayName: string;
  boxId: string | null;
  connectedPlatforms: Platform[];
  totalChunks: number;
  lastIngested?: string;
}

interface CreatorRow {
  user_id: string;
  handle: string;
  display_name: string;
  box_id: string | null;
  connected_platforms: Platform[];
  total_chunks: number;
  last_ingested: Date | null;
}

function rowToProfile(row: CreatorRow): CreatorProfile {
  return {
    userId: row.user_id,
    handle: row.handle,
    displayName: row.display_name,
    boxId: row.box_id,
    connectedPlatforms: row.connected_platforms,
    totalChunks: row.total_chunks,
    lastIngested: row.last_ingested?.toISOString(),
  };
}

export async function getCreator(
  userId: string,
  handle: string
): Promise<CreatorProfile | undefined> {
  const sql = await getDb();
  const [row] = await sql<CreatorRow[]>`
    SELECT * FROM creators
    WHERE user_id = ${userId} AND handle = ${handle.toLowerCase()}
  `;
  return row ? rowToProfile(row) : undefined;
}

/** Public lookup by handle (used by the /twin/[handle] chat page). */
export async function getCreatorByHandle(
  handle: string
): Promise<CreatorProfile | undefined> {
  const sql = await getDb();
  const [row] = await sql<CreatorRow[]>`
    SELECT * FROM creators
    WHERE handle = ${handle.toLowerCase()}
    ORDER BY created_at DESC
    LIMIT 1
  `;
  return row ? rowToProfile(row) : undefined;
}

export async function upsertCreator(profile: CreatorProfile): Promise<void> {
  const sql = await getDb();
  await sql`
    INSERT INTO creators
      (id, user_id, handle, display_name, box_id, connected_platforms, total_chunks, last_ingested)
    VALUES (
      ${randomUUID()},
      ${profile.userId},
      ${profile.handle.toLowerCase()},
      ${profile.displayName},
      ${profile.boxId},
      ${JSON.stringify(profile.connectedPlatforms)},
      ${profile.totalChunks},
      ${profile.lastIngested ?? null}
    )
    ON CONFLICT (user_id, handle) DO UPDATE SET
      display_name        = EXCLUDED.display_name,
      box_id              = EXCLUDED.box_id,
      connected_platforms = EXCLUDED.connected_platforms,
      total_chunks        = EXCLUDED.total_chunks,
      last_ingested       = EXCLUDED.last_ingested
  `;
}

export async function getUserCreators(userId: string): Promise<CreatorProfile[]> {
  const sql = await getDb();
  const rows = await sql<CreatorRow[]>`
    SELECT * FROM creators
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `;
  return rows.map(rowToProfile);
}

export async function deleteCreator(userId: string, handle: string): Promise<void> {
  const sql = await getDb();
  await sql`
    DELETE FROM creators
    WHERE user_id = ${userId} AND handle = ${handle.toLowerCase()}
  `;
}
