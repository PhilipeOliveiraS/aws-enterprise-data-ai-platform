import { Database } from "bun:sqlite";
import { config } from "./config.ts";

/**
 * Native Bun SQLite database. In production this file lives on an attached
 * EBS volume (see aws-standards.md); the path is configurable via DB_PATH.
 */
export const db = new Database(config.dbPath, { create: true });

// Pragmas for reliability + concurrency.
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");

/** Create tables if they do not exist. Safe to call on every boot. */
export function initSchema(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      email         TEXT NOT NULL UNIQUE,
      display_name  TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id          TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL,
      title       TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      status      TEXT NOT NULL DEFAULT 'todo'
                    CHECK (status IN ('todo','in-progress','done')),
      priority    TEXT NOT NULL DEFAULT 'medium'
                    CHECK (priority IN ('low','medium','high','critical')),
      tags        TEXT NOT NULL DEFAULT '[]',
      assignee    TEXT NOT NULL DEFAULT '',
      position    INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id, status, position);",
  );
}
