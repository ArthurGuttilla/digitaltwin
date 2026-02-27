/**
 * Creator profile store — backed by SQLite (data/app.db).
 */

import { randomUUID } from "crypto";
import db from "./db";

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
  id: string;
  user_id: string;
  handle: string;
  display_name: string;
  box_id: string | null;
  connected_platforms: string;
  total_chunks: number;
  last_ingested: string | null;
}

function rowToProfile(row: CreatorRow): CreatorProfile {
  return {
    userId: row.user_id,
    handle: row.handle,
    displayName: row.display_name,
    boxId: row.box_id,
    connectedPlatforms: JSON.parse(row.connected_platforms) as Platform[],
    totalChunks: row.total_chunks,
    lastIngested: row.last_ingested ?? undefined,
  };
}

export function getCreator(userId: string, handle: string): CreatorProfile | undefined {
  const row = db
    .prepare("SELECT * FROM creators WHERE user_id = ? AND handle = ?")
    .get(userId, handle.toLowerCase()) as CreatorRow | undefined;
  return row ? rowToProfile(row) : undefined;
}

/** Public lookup by handle (used by the /twin/[handle] chat page). */
export function getCreatorByHandle(handle: string): CreatorProfile | undefined {
  const row = db
    .prepare("SELECT * FROM creators WHERE handle = ? ORDER BY created_at DESC LIMIT 1")
    .get(handle.toLowerCase()) as CreatorRow | undefined;
  return row ? rowToProfile(row) : undefined;
}

export function upsertCreator(profile: CreatorProfile): void {
  db.prepare(`
    INSERT INTO creators (id, user_id, handle, display_name, box_id, connected_platforms, total_chunks, last_ingested)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, handle) DO UPDATE SET
      display_name        = excluded.display_name,
      box_id              = excluded.box_id,
      connected_platforms = excluded.connected_platforms,
      total_chunks        = excluded.total_chunks,
      last_ingested       = excluded.last_ingested
  `).run(
    randomUUID(),
    profile.userId,
    profile.handle.toLowerCase(),
    profile.displayName,
    profile.boxId,
    JSON.stringify(profile.connectedPlatforms),
    profile.totalChunks,
    profile.lastIngested ?? null
  );
}

export function getUserCreators(userId: string): CreatorProfile[] {
  const rows = db
    .prepare("SELECT * FROM creators WHERE user_id = ? ORDER BY created_at DESC")
    .all(userId) as CreatorRow[];
  return rows.map(rowToProfile);
}

export function deleteCreator(userId: string, handle: string): void {
  db.prepare("DELETE FROM creators WHERE user_id = ? AND handle = ?")
    .run(userId, handle.toLowerCase());
}
