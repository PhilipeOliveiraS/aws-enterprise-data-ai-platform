import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { config } from "./config.ts";

/**
 * Native Bun SQLite database. In production this file lives on an attached
 * EBS volume (see aws-standards.md); the path is configurable via DB_PATH.
 *
 * config.dbPath is always ABSOLUTE (resolved in config.ts), so the file
 * location is independent of the shell's current working directory.
 */

// Ensure the parent directory exists (e.g. /opt/taskiro/data on EBS).
mkdirSync(dirname(config.dbPath), { recursive: true });

export const db = new Database(config.dbPath, { create: true });

// Pragmas for reliability + concurrency (order matters: journal_mode first).
db.exec("PRAGMA journal_mode = WAL;");     // readers/writers concurrent
db.exec("PRAGMA synchronous = NORMAL;");   // pair with WAL — flush at checkpoint, not every commit
db.exec("PRAGMA foreign_keys = ON;");      // enforce ON DELETE CASCADE
db.exec("PRAGMA busy_timeout = 5000;");    // wait up to 5s for the single writer instead of erroring

// Log the resolved location once on boot so local file management is transparent.
console.log(`[db] SQLite database at: ${config.dbPath}`);

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

  db.exec(`
    CREATE TABLE IF NOT EXISTS subtasks (
      id         TEXT PRIMARY KEY,
      task_id    TEXT NOT NULL,
      title      TEXT NOT NULL,
      completed  INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );
  `);

  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_subtasks_task ON subtasks(task_id);",
  );
}
