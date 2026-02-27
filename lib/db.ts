/**
 * Lazy Postgres client (postgres.js).
 * Nothing runs at import time — the connection is only made on the first query.
 *
 * Requires DATABASE_URL env var (Neon, Supabase, Railway, etc.)
 */

import postgres, { type Sql } from "postgres";

let client: Sql | null = null;
let migrationPromise: Promise<void> | null = null;

function getClient(): Sql {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL environment variable is not set");
    client = postgres(url, {
      ssl: url.includes("localhost") || url.includes("127.0.0.1") ? false : "require",
      // Neon's pooled URL uses PgBouncer in transaction mode, which doesn't
      // support prepared statements.
      prepare: false,
      max: 3,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }
  return client;
}

async function runMigrations(sql: Sql) {
  // If the old auth-based schema exists (creators has user_id column), drop and recreate.
  const oldSchema = await sql`
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'creators' AND column_name = 'user_id'
    LIMIT 1
  `;
  if (oldSchema.length > 0) {
    await sql`DROP TABLE IF EXISTS creators`;
    await sql`DROP TABLE IF EXISTS users`;
  }

  await sql`
    CREATE TABLE IF NOT EXISTS creators (
      id                  TEXT PRIMARY KEY,
      handle              TEXT UNIQUE NOT NULL,
      display_name        TEXT NOT NULL,
      box_id              TEXT,
      connected_platforms JSONB NOT NULL DEFAULT '[]',
      total_chunks        INTEGER NOT NULL DEFAULT 0,
      last_ingested       TIMESTAMPTZ,
      created_at          TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

/**
 * Returns the Postgres client, running migrations exactly once per process.
 * Call this at the top of every DB helper function.
 */
export async function getDb(): Promise<Sql> {
  const sql = getClient();
  if (!migrationPromise) {
    migrationPromise = runMigrations(sql);
  }
  await migrationPromise;
  return sql;
}
