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

  /**
   * Amazon Bedrock settings.
   *
   * Credentials are NEVER read from here — the AWS SDK default credential
   * chain resolves them (environment variables locally, EC2 instance profile
   * in production). Nothing credential-shaped is stored in this file.
   */
  bedrock: {
    region: process.env.AWS_REGION ?? "us-east-1",
    /**
     * Cross-region inference profile ID. Most current Claude models are
     * INFERENCE_PROFILE-only on Bedrock, so the "us." prefix is required;
     * the bare `anthropic.*` model IDs are ON_DEMAND/legacy and will fail.
     */
    modelId:
      process.env.BEDROCK_MODEL_ID ??
      "us.anthropic.claude-haiku-4-5-20251001-v1:0",
    maxTokens: Number(process.env.BEDROCK_MAX_TOKENS ?? 1024),
    /** Set AI_ENABLED=false to serve 503 from /ai/* without calling Bedrock. */
    enabled: (process.env.AI_ENABLED ?? "true").toLowerCase() !== "false",
  },
} as const;
