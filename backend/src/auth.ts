import { Elysia, t } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { db } from "./db.ts";
import { config } from "./config.ts";
import type { UserRow } from "./types.ts";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Shared JWT plugin instance. Registered under the name "jwt" so it can be
 * reused (deduped) across route groups.
 */
export const jwtPlugin = new Elysia({ name: "jwt" }).use(
  jwt({
    name: "jwt",
    secret: config.jwtSecret,
    exp: config.jwtExpiresIn,
  }),
);

/**
 * Auth guard: verifies the Bearer token and injects the authenticated user.
 * Any route using `.use(authGuard)` gets a resolved `user` in context and is
 * rejected with 401 when the token is missing or invalid.
 */
export const authGuard = new Elysia({ name: "auth-guard" })
  .use(jwtPlugin)
  .derive({ as: "scoped" }, async ({ jwt, headers, set }) => {
    const header = headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      set.status = 401;
      throw new Error("Missing or malformed Authorization header");
    }

    const token = header.slice(7);
    const payload = await jwt.verify(token);
    if (!payload || typeof payload.sub !== "string") {
      set.status = 401;
      throw new Error("Invalid or expired token");
    }

    const user = db
      .query<UserRow, [string]>("SELECT * FROM users WHERE id = ?")
      .get(payload.sub);

    if (!user) {
      set.status = 401;
      throw new Error("User no longer exists");
    }

    return { user };
  });

export const authRoutes = new Elysia({ prefix: "/auth" })
  .use(jwtPlugin)
  .post(
    "/register",
    async ({ body, jwt, set }) => {
      const email = body.email.trim().toLowerCase();
      const displayName = body.displayName.trim();

      if (!EMAIL_RE.test(email)) {
        set.status = 422;
        return { error: "A valid email is required" };
      }
      if (body.password.length < 8) {
        set.status = 422;
        return { error: "Password must be at least 8 characters" };
      }
      if (displayName.length < 1) {
        set.status = 422;
        return { error: "Display name is required" };
      }

      const existing = db
        .query<UserRow, [string]>("SELECT * FROM users WHERE email = ?")
        .get(email);
      if (existing) {
        set.status = 409;
        return { error: "An account with this email already exists" };
      }

      // Hash with Bun.password (argon2id by default) — no external crypto libs.
      const passwordHash = await Bun.password.hash(body.password);
      const id = crypto.randomUUID();

      db.query(
        `INSERT INTO users (id, email, display_name, password_hash)
         VALUES (?, ?, ?, ?)`,
      ).run(id, email, displayName, passwordHash);

      const token = await jwt.sign({ sub: id });
      set.status = 201;
      return {
        token,
        user: { id, email, displayName },
      };
    },
    {
      body: t.Object({
        email: t.String(),
        password: t.String(),
        displayName: t.String(),
      }),
    },
  )
  .post(
    "/login",
    async ({ body, jwt, set }) => {
      const email = body.email.trim().toLowerCase();

      const user = db
        .query<UserRow, [string]>("SELECT * FROM users WHERE email = ?")
        .get(email);

      // Uniform error to avoid leaking which accounts exist.
      const invalid = () => {
        set.status = 401;
        return { error: "Invalid email or password" };
      };

      if (!user) return invalid();

      const ok = await Bun.password.verify(body.password, user.password_hash);
      if (!ok) return invalid();

      const token = await jwt.sign({ sub: user.id });
      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.display_name,
        },
      };
    },
    {
      body: t.Object({
        email: t.String(),
        password: t.String(),
      }),
    },
  );
