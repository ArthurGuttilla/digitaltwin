/**
 * SQLite database connection.
 * Database file is stored in ./data/app.db (gitignored).
 * Runs migrations on first import.
 */

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DATA_DIR = path.join(process.cwd(), "data");
fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, "app.db"), { timeout: 10000 });

// WAL mode allows concurrent reads while a write lock is held.
// busy_timeout makes readers/writers wait instead of immediately failing.
db.pragma("journal_mode = WAL");
db.pragma("busy_timeout = 10000");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id   TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS creators (
    id                  TEXT PRIMARY KEY,
    user_id             TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    handle              TEXT NOT NULL,
    display_name        TEXT NOT NULL,
    box_id              TEXT,
    connected_platforms TEXT NOT NULL DEFAULT '[]',
    total_chunks        INTEGER NOT NULL DEFAULT 0,
    last_ingested       TEXT,
    created_at          TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, handle)
  );
`);

export default db;
