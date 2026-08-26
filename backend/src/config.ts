/**
 * Central configuration. Secrets are read exclusively from environment
 * variables per .kiro/steering/aws-standards.md — nothing is hardcoded.
 */

const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret || jwtSecret.length < 16) {
  throw new Error(
    "JWT_SECRET is missing or too short. Set it in backend/.env " +
      "(a local .env is generated automatically on first run via setup).",
  );
}

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
  dbPath: process.env.DB_PATH ?? "taskiro.sqlite",
} as const;
