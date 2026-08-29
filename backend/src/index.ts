import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { config } from "./config.ts";
import { initSchema } from "./db.ts";
import { authRoutes, authGuard } from "./auth.ts";
import { taskRoutes } from "./tasks.ts";
import { aiRoutes } from "./ai.ts";

initSchema();

const app = new Elysia()
  .use(
    cors({
      origin: config.corsOrigins,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
    }),
  )
  // Global error handler → consistent JSON + correct HTTP status codes.
  .onError(({ code, error, set }) => {
    if (code === "VALIDATION") {
      set.status = 422;
      return { error: "Validation failed", detail: error.message };
    }
    if (code === "NOT_FOUND") {
      set.status = 404;
      return { error: "Not found" };
    }
    // Auth guard throws with set.status already at 401.
    if (set.status === 401 || set.status === 200) {
      set.status = set.status === 200 ? 401 : set.status;
      return { error: error instanceof Error ? error.message : "Unauthorized" };
    }
    set.status = 500;
    return { error: "Internal server error" };
  })
  .get("/health", () => ({
    status: "ok",
    service: "taskiro-api",
    ai: config.bedrock.enabled ? "enabled" : "disabled",
  }))
  .use(authRoutes)
  // Current user profile (guarded).
  .group("/auth", (group) =>
    group.use(authGuard).get("/me", ({ user }) => ({
      id: user.id,
      email: user.email,
      displayName: user.display_name,
    })),
  )
  .use(taskRoutes)
  .use(aiRoutes)
  .listen(config.port);

console.log(
  `TasKiro API running at http://${app.server?.hostname}:${app.server?.port}`,
);
console.log(
  `[ai] Bedrock ${config.bedrock.enabled ? "enabled" : "disabled"} — ` +
    `model=${config.bedrock.modelId} region=${config.bedrock.region}`,
);

export type App = typeof app;
