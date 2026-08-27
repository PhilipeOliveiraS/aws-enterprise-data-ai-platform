/**
 * Central configuration. Secrets are read exclusively from environment
 * variables per .kiro/steering/aws-standards.md — nothing is hardcoded.
 */

import { isAbsolute, resolve } from "node:path";

const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret || jwtSecret.length < 16) {
  throw new Error(
    "JWT_SECRET is missing or too short. Set it in backend/.env " +
      "(copy backend/.env.example to backend/.env and generate a secret, " +
      "e.g. `openssl rand -hex 48`).",
  );
}

/**
 * Resolve the SQLite path to an ABSOLUTE location so it never depends on the
 * shell's current working directory.
 *
 * - Local dev: DB_PATH is a relative path (default "./taskiro.sqlite"),
 *   resolved against the backend package root (one level up from src/).
 * - Production (AWS): DB_PATH is an absolute path on the attached EBS volume,
 *   e.g. /opt/taskiro/data/taskiro.sqlite — used as-is.
 */
const rawDbPath = process.env.DB_PATH ?? "./taskiro.sqlite";
const packageRoot = resolve(import.meta.dir, "..");
const dbPath = isAbsolute(rawDbPath)
  ? rawDbPath
  : resolve(packageRoot, rawDbPath);

export const config = {
  jwtSecret,
  port: Number(process.env.PORT ?? 3000),
  // Comma-separated list of allowed origins for CORS.
  corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:5173")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
  // Access token lifetime.
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  // Absolute, cwd-independent path to the SQLite database file.
  dbPath,
} as const;
