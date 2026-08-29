/**
 * HTTP-level security tests for the TasKiro backend.
 *
 * These exercise the guarantees the codebase claims in its comments but that
 * the pure-function unit tests in ai.test.ts cannot reach:
 *
 *   - Tenant isolation / IDOR: every task & subtask query is scoped by
 *     user_id, and handlers return 404 (never 403) so resource existence is
 *     not leaked across tenants.
 *   - Authentication: registration validation, uniform login errors, real
 *     Argon2id password hashing, and the JWT guard rejecting bad tokens.
 *   - SQL-injection resilience: parameterized queries store hostile input
 *     verbatim and leave the schema intact.
 *
 * No network is used. The app is composed from the same exported route
 * plugins as src/index.ts and driven with app.handle(new Request(...)).
 * The test runner sets DB_PATH to a throwaway file and AI_ENABLED=false
 * (see the "test" script in package.json).
 */

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { Elysia } from "elysia";
import { db, initSchema } from "./db.ts";
import { config } from "./config.ts";
import { authRoutes, authGuard } from "./auth.ts";
import { taskRoutes } from "./tasks.ts";
import { aiRoutes } from "./ai.ts";

/* -------------------------------------------------------------------------- */
/* SAFETY GUARD                                                                */
/*                                                                             */
/* These tests DELETE all rows from users/tasks/subtasks between runs. That is */
/* catastrophic against a real database. Refuse to run unless DB_PATH points   */
/* at an obvious throwaway location. Run with the package "test" script, which */
/* sets DB_PATH=/tmp/taskiro-unit-test.sqlite.                                 */
/* -------------------------------------------------------------------------- */

const dbPath = config.dbPath;
const isThrowawayDb =
  dbPath.startsWith("/tmp/") || /taskiro-unit-test|test\.sqlite$/.test(dbPath);

if (!isThrowawayDb) {
  throw new Error(
    `Refusing to run destructive security tests against non-test database:\n` +
      `  ${dbPath}\n` +
      `Run via the safe script instead:  bun run test\n` +
      `(it sets DB_PATH=/tmp/taskiro-unit-test.sqlite)`,
  );
}

/* -------------------------------------------------------------------------- */
/* Test app — mirrors src/index.ts wiring, minus .listen() and CORS.           */
/* The onError handler is replicated verbatim so HTTP status codes match       */
/* production (the auth guard relies on it to surface 401).                    */
/* -------------------------------------------------------------------------- */

const app = new Elysia()
  .onError(({ code, error, set }) => {
    if (code === "VALIDATION") {
      set.status = 422;
      return { error: "Validation failed", detail: error.message };
    }
    if (code === "NOT_FOUND") {
      set.status = 404;
      return { error: "Not found" };
    }
    if (set.status === 401 || set.status === 200) {
      set.status = set.status === 200 ? 401 : set.status;
      return { error: error instanceof Error ? error.message : "Unauthorized" };
    }
    set.status = 500;
    return { error: "Internal server error" };
  })
  .use(authRoutes)
  .group("/auth", (group) =>
    group.use(authGuard).get("/me", ({ user }) => ({
      id: user.id,
      email: user.email,
      displayName: user.display_name,
    })),
  )
  .use(taskRoutes)
  .use(aiRoutes);

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

interface JsonResponse<T = JsonValue> {
  status: number;
  body: T;
}

/* Response shapes the tests read from — keeps assertions type-safe (no `any`). */
interface AuthResponse {
  token: string;
  user: { id: string; email: string; displayName: string };
}
interface ProfileResponse {
  id: string;
  email: string;
  displayName: string;
}
interface ErrorResponse {
  error: string;
}
interface SubtaskView {
  id: string;
  title: string;
  completed: boolean;
}
interface TaskView {
  id: string;
  title: string;
  subtasks: SubtaskView[];
}

async function call<T = JsonValue>(
  method: string,
  path: string,
  opts: { token?: string; body?: unknown } = {},
): Promise<JsonResponse<T>> {
  const headers: Record<string, string> = {};
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";

  const res = await app.handle(
    new Request(`http://localhost${path}`, {
      method,
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    }),
  );

  const text = await res.text();
  let body: unknown = null;
  if (text.length > 0) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  return { status: res.status, body: body as T };
}

/** Register a fresh user and return { token, id }. */
async function register(
  email: string,
  password = "sup3r-secret-pw",
  displayName = "Test User",
): Promise<{ token: string; id: string }> {
  const res = await call<AuthResponse>("POST", "/auth/register", {
    body: { email, password, displayName },
  });
  expect(res.status).toBe(201);
  return { token: res.body.token, id: res.body.user.id };
}

/** Unique email per invocation so tests never collide on the UNIQUE index. */
function uniqueEmail(tag: string): string {
  return `${tag}-${crypto.randomUUID()}@example.com`;
}

/* -------------------------------------------------------------------------- */
/* Isolation: start each suite from empty tables.                              */
/* -------------------------------------------------------------------------- */

beforeAll(() => {
  initSchema();
  // subtasks/tasks cascade from users, but clear explicitly for determinism.
  db.exec("DELETE FROM subtasks;");
  db.exec("DELETE FROM tasks;");
  db.exec("DELETE FROM users;");
});

afterAll(() => {
  db.exec("DELETE FROM subtasks;");
  db.exec("DELETE FROM tasks;");
  db.exec("DELETE FROM users;");
});

/* -------------------------------------------------------------------------- */
/* Authentication                                                              */
/* -------------------------------------------------------------------------- */

describe("auth — registration validation", () => {
  test("rejects a malformed email with 422", async () => {
    const res = await call("POST", "/auth/register", {
      body: { email: "not-an-email", password: "longenough1", displayName: "X" },
    });
    expect(res.status).toBe(422);
  });

  test("rejects a password shorter than 8 characters with 422", async () => {
    const res = await call("POST", "/auth/register", {
      body: { email: uniqueEmail("short-pw"), password: "short", displayName: "X" },
    });
    expect(res.status).toBe(422);
  });

  test("rejects an empty display name with 422", async () => {
    const res = await call("POST", "/auth/register", {
      body: { email: uniqueEmail("no-name"), password: "longenough1", displayName: "   " },
    });
    expect(res.status).toBe(422);
  });

  test("rejects a duplicate email with 409", async () => {
    const email = uniqueEmail("dup");
    await register(email);
    const res = await call("POST", "/auth/register", {
      body: { email, password: "longenough1", displayName: "Second" },
    });
    expect(res.status).toBe(409);
  });

  test("normalizes email case so duplicates cannot be smuggled in", async () => {
    const email = uniqueEmail("case").toLowerCase();
    await register(email);
    const res = await call("POST", "/auth/register", {
      body: { email: email.toUpperCase(), password: "longenough1", displayName: "Dupe" },
    });
    expect(res.status).toBe(409);
  });
});

describe("auth — password hashing", () => {
  test("never stores the plaintext password; hash verifies with Bun.password", async () => {
    const email = uniqueEmail("hash");
    const password = "correct horse battery staple";
    const { id } = await register(email, password);

    const row = db
      .query<{ password_hash: string }, [string]>(
        "SELECT password_hash FROM users WHERE id = ?",
      )
      .get(id)!;

    // Plaintext is never persisted.
    expect(row.password_hash).not.toBe(password);
    expect(row.password_hash).not.toContain(password);
    // Argon2id hashes are PHC-formatted ("$argon2id$...").
    expect(row.password_hash.startsWith("$argon2")).toBe(true);
    // And the stored hash actually verifies the original password.
    expect(await Bun.password.verify(password, row.password_hash)).toBe(true);
  });
});

describe("auth — login error uniformity (account enumeration defense)", () => {
  test("wrong password and unknown account return identical 401 bodies", async () => {
    const email = uniqueEmail("login");
    await register(email, "the-real-password-1");

    const wrongPw = await call<ErrorResponse>("POST", "/auth/login", {
      body: { email, password: "wrong-password" },
    });
    const noUser = await call<ErrorResponse>("POST", "/auth/login", {
      body: { email: uniqueEmail("ghost"), password: "whatever-123" },
    });

    expect(wrongPw.status).toBe(401);
    expect(noUser.status).toBe(401);
    // Same status AND same message — no signal distinguishes the two cases.
    expect(wrongPw.body).toEqual(noUser.body);
    expect(wrongPw.body.error).toBe("Invalid email or password");
  });

  test("valid credentials return a token", async () => {
    const email = uniqueEmail("ok-login");
    await register(email, "valid-password-99");
    const res = await call<AuthResponse>("POST", "/auth/login", {
      body: { email, password: "valid-password-99" },
    });
    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe("string");
  });
});

describe("auth — JWT guard", () => {
  test("rejects a request with no Authorization header (401)", async () => {
    const res = await call("GET", "/auth/me");
    expect(res.status).toBe(401);
  });

  test("rejects a malformed Authorization header (401)", async () => {
    const res = await call("GET", "/auth/me", { token: "" });
    const raw = await app.handle(
      new Request("http://localhost/auth/me", {
        headers: { Authorization: "Token abc" },
      }),
    );
    expect(res.status).toBe(401);
    expect(raw.status).toBe(401);
  });

  test("rejects a forged / invalid bearer token (401)", async () => {
    const res = await call("GET", "/auth/me", {
      token: "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhdHRhY2tlciJ9.not-a-real-signature",
    });
    expect(res.status).toBe(401);
  });

  test("accepts a valid token and returns the caller's profile", async () => {
    const email = uniqueEmail("me");
    const { token, id } = await register(email);
    const res = await call<ProfileResponse>("GET", "/auth/me", { token });
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(id);
    expect(res.body.email).toBe(email);
  });
});

/* -------------------------------------------------------------------------- */
/* Tenant isolation / IDOR                                                     */
/* -------------------------------------------------------------------------- */

describe("tenant isolation — cross-user access is denied with 404", () => {
  test("user B cannot read, update, move, or delete user A's task", async () => {
    const alice = await register(uniqueEmail("alice"));
    const bob = await register(uniqueEmail("bob"));

    // Alice creates a task.
    const created = await call<TaskView>("POST", "/tasks", {
      token: alice.token,
      body: { title: "Alice private task" },
    });
    expect(created.status).toBe(201);
    const taskId: string = created.body.id;

    // Bob is authenticated but must not see it in his own list.
    const bobList = await call<TaskView[]>("GET", "/tasks", { token: bob.token });
    expect(bobList.status).toBe(200);
    expect(Array.isArray(bobList.body)).toBe(true);
    expect(bobList.body.some((t) => t.id === taskId)).toBe(false);

    // Every direct access by Bob returns 404 (existence not leaked as 403).
    const bobRead = await call("GET", `/tasks/${taskId}`, { token: bob.token });
    expect(bobRead.status).toBe(404);

    const bobUpdate = await call("PUT", `/tasks/${taskId}`, {
      token: bob.token,
      body: { title: "hijacked" },
    });
    expect(bobUpdate.status).toBe(404);

    const bobMove = await call("PATCH", `/tasks/${taskId}/status`, {
      token: bob.token,
      body: { status: "done" },
    });
    expect(bobMove.status).toBe(404);

    const bobDelete = await call("DELETE", `/tasks/${taskId}`, { token: bob.token });
    expect(bobDelete.status).toBe(404);

    // Alice's task is untouched.
    const aliceRead = await call<TaskView>("GET", `/tasks/${taskId}`, { token: alice.token });
    expect(aliceRead.status).toBe(200);
    expect(aliceRead.body.title).toBe("Alice private task");
  });

  test("user B cannot attach, toggle, or delete subtasks on user A's task", async () => {
    const alice = await register(uniqueEmail("alice2"));
    const bob = await register(uniqueEmail("bob2"));

    const task = await call<TaskView>("POST", "/tasks", {
      token: alice.token,
      body: { title: "Parent task" },
    });
    const taskId: string = task.body.id;

    const sub = await call<SubtaskView>("POST", `/tasks/${taskId}/subtasks`, {
      token: alice.token,
      body: { title: "Alice subtask" },
    });
    expect(sub.status).toBe(201);
    const subId: string = sub.body.id;

    // Bob cannot create a subtask under Alice's task.
    const bobCreate = await call("POST", `/tasks/${taskId}/subtasks`, {
      token: bob.token,
      body: { title: "intruder subtask" },
    });
    expect(bobCreate.status).toBe(404);

    // Bob cannot toggle or delete Alice's subtask.
    const bobToggle = await call(
      "PATCH",
      `/tasks/${taskId}/subtasks/${subId}/toggle`,
      { token: bob.token },
    );
    expect(bobToggle.status).toBe(404);

    const bobDelete = await call("DELETE", `/tasks/${taskId}/subtasks/${subId}`, {
      token: bob.token,
    });
    expect(bobDelete.status).toBe(404);

    // The subtask still exists and is still incomplete for Alice.
    const aliceView = await call<TaskView>("GET", `/tasks/${taskId}`, { token: alice.token });
    expect(aliceView.body.subtasks).toHaveLength(1);
    expect(aliceView.body.subtasks[0].completed).toBe(false);
  });

  test("AI /breakdown ownership check returns 404 for another tenant's task", async () => {
    const alice = await register(uniqueEmail("alice3"));
    const bob = await register(uniqueEmail("bob3"));

    const task = await call<TaskView>("POST", "/tasks", {
      token: alice.token,
      body: { title: "Alice AI task" },
    });
    const taskId: string = task.body.id;

    // Ownership is checked BEFORE Bedrock is invoked, so this is a clean 404
    // even with AI_ENABLED=false in the test environment.
    const bobBreakdown = await call("POST", "/ai/breakdown", {
      token: bob.token,
      body: { taskId },
    });
    expect(bobBreakdown.status).toBe(404);
  });

  test("a non-existent task id yields the same 404 as another user's task (no enumeration)", async () => {
    const bob = await register(uniqueEmail("bob4"));
    const res = await call("GET", `/tasks/${crypto.randomUUID()}`, {
      token: bob.token,
    });
    expect(res.status).toBe(404);
  });
});

/* -------------------------------------------------------------------------- */
/* SQL-injection resilience                                                    */
/* -------------------------------------------------------------------------- */

describe("SQL-injection resilience (parameterized queries)", () => {
  test("hostile task title is stored verbatim and the schema survives", async () => {
    const alice = await register(uniqueEmail("sqli"));

    const injection = "Robert'); DROP TABLE tasks;-- ";
    const created = await call<TaskView>("POST", "/tasks", {
      token: alice.token,
      body: { title: injection },
    });
    expect(created.status).toBe(201);

    // The tasks table still exists and is queryable.
    const stillThere = db
      .query<{ n: number }, []>("SELECT COUNT(*) AS n FROM tasks")
      .get()!;
    expect(stillThere.n).toBeGreaterThanOrEqual(1);

    // Payload was treated as data — round-trips exactly (trimmed), not executed.
    const read = await call<TaskView>("GET", `/tasks/${created.body.id}`, {
      token: alice.token,
    });
    expect(read.status).toBe(200);
    expect(read.body.title).toBe(injection.trim());
  });

  test("hostile email in login is neutralized (no auth bypass, no error leak)", async () => {
    const res = await call<ErrorResponse>("POST", "/auth/login", {
      body: { email: "' OR '1'='1", password: "' OR '1'='1" },
    });
    // Treated as a literal (invalid) email/credential → uniform 401, tables intact.
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid email or password");

    const usersTable = db
      .query<{ name: string }, []>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='users'",
      )
      .get();
    expect(usersTable?.name).toBe("users");
  });
});
