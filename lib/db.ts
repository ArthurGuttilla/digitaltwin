/**
 * Lazy Postgres client (postgres.js).
 * Nothing runs at import time — the connection is only made on the first query.
 *
 * Requires DATABASE_URL env var.
 * Free databases: neon.tech · supabase.com · railway.app
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
      max: 3,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }
  return client;
}

async function runMigrations(sql: Sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      email      TEXT UNIQUE NOT NULL,
      password   TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS creators (
      id                  TEXT PRIMARY KEY,
      user_id             TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      handle              TEXT NOT NULL,
      display_name        TEXT NOT NULL,
      box_id              TEXT,
      connected_platforms JSONB NOT NULL DEFAULT '[]',
      total_chunks        INTEGER NOT NULL DEFAULT 0,
      last_ingested       TIMESTAMPTZ,
      created_at          TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, handle)
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
