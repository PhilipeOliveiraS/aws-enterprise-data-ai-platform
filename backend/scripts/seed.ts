/**
 * Deterministic development seed for TasKiro.
 *
 * Reconstructs the 12-task board for ana@taskiro.app across the three Kanban
 * columns, with subtasks, priorities, tags, and due dates.
 *
 * Connection handling
 * -------------------
 * This script imports the application's own `db` singleton from ../src/db.ts
 * rather than opening its own handle. That is deliberate: the singleton already
 * applies the required pragmas in the correct order (journal_mode=WAL first,
 * then synchronous=NORMAL, foreign_keys=ON, busy_timeout=5000) and resolves
 * DB_PATH to an absolute location independent of the shell's cwd. Opening a
 * second connection here would risk seeding a different file or running without
 * WAL and without ON DELETE CASCADE enforcement.
 *
 * Because it imports ../src/config.ts transitively, JWT_SECRET must be set.
 * Bun auto-loads backend/.env, so `bun run seed` from the backend package works
 * without extra flags.
 *
 * Usage
 * -----
 *   bun run seed              # seeds an empty board; refuses to overwrite
 *   bun run seed -- --reset   # deletes ana@taskiro.app's tasks, then reseeds
 *
 * Scope safety: every destructive statement is filtered by this user's id, so
 * no other account's data is ever touched.
 */

import { db, initSchema } from "../src/db.ts";
import type { Priority, TaskStatus } from "../src/types.ts";

/* -------------------------------------------------------------------------- */
/* Seed account                                                               */
/* -------------------------------------------------------------------------- */

const SEED_USER = {
  email: "ana@taskiro.app",
  /** Development-only credential. Never reuse this value outside local seeds. */
  password: "taskiro123",
  displayName: "Ana",
} as const;

/* -------------------------------------------------------------------------- */
/* Seed data                                                                  */
/* -------------------------------------------------------------------------- */

interface SeedSubtask {
  title: string;
  completed: boolean;
}

interface SeedTask {
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  tags: string[];
  /** ISO date (YYYY-MM-DD), or null when no due date is set. */
  dueDate: string | null;
  subtasks: SeedSubtask[];
}

/**
 * Tags are stored WITHOUT the leading "#". TaskCard.tsx renders `#{tag}`, so
 * storing "#aws" would display as "##aws".
 *
 * `position` is not declared here; it is assigned per column from array order.
 */
const SEED_TASKS: readonly SeedTask[] = [
  /* ------------------------------ TO DO (4) ------------------------------- */
  {
    title: "Review platform Cloud architecture",
    description:
      "Walk the CloudFront -> ALB -> private EC2 topology against the AWS Well-Architected pillars and record any deviations.",
    status: "todo",
    priority: "high",
    tags: ["cloud-architecture", "aws", "well-architected", "review"],
    dueDate: null,
    subtasks: [],
  },
  {
    title: "Configure NAT Gateway for private subnets",
    description:
      "Provision NAT Gateway egress so private-subnet instances can reach the internet without receiving inbound traffic.",
    status: "todo",
    priority: "medium",
    tags: ["terraform", "vpc", "networking", "nat-gateway", "infrastructure"],
    dueDate: "2026-09-05",
    subtasks: [
      { title: "Allocate an Elastic IP for the NAT Gateway", completed: false },
      {
        title: "Add a 0.0.0.0/0 route to the private route table",
        completed: false,
      },
    ],
  },
  {
    title: "Write property-based tests for the tasks module",
    description:
      "Cover task and subtask invariants with generative tests: ownership scoping, cascade delete, and idempotent toggling.",
    status: "todo",
    priority: "medium",
    tags: ["testing", "property-based-testing", "backend", "elysiajs"],
    dueDate: null,
    subtasks: [],
  },
  {
    // Placeholder requested to bring the To Do column to 4 tasks.
    title: "Document the REST API surface in an OpenAPI spec",
    description:
      "Placeholder backlog item. Generate an OpenAPI document from the Elysia route schemas and publish it under docs/.",
    status: "todo",
    priority: "low",
    tags: ["documentation", "openapi", "backend"],
    dueDate: null,
    subtasks: [],
  },

  /* --------------------------- IN PROGRESS (4) --------------------------- */
  {
    title: "Fix deploy pipeline in GitHub Actions",
    description:
      "The workflow validates but never deploys. Add the missing SSM-based deploy stage and gate it on the backend test suite.",
    status: "in-progress",
    priority: "high",
    tags: ["ci-cd", "github-actions", "devops", "bun", "terraform"],
    dueDate: "2026-08-31",
    subtasks: [
      { title: "Pin the Bun version used by the runner", completed: true },
      { title: "Add `bun run test` as a blocking gate", completed: false },
      {
        title: "Wire an SSM send-command deploy step for private EC2",
        completed: false,
      },
      { title: "Validate mandatory FinOps tags before apply", completed: false },
      { title: "Publish the build artifact to S3", completed: false },
    ],
  },
  {
    title: "Tune SQLite pragmas (WAL and busy_timeout)",
    description:
      "Measure write throughput under concurrent subtask inserts and tune the WAL checkpoint interval and busy_timeout backoff.",
    status: "in-progress",
    priority: "medium",
    tags: ["sqlite", "data-engineering", "performance", "wal"],
    dueDate: "2026-09-02",
    subtasks: [],
  },
  {
    title: "Integrate semantic search with Qdrant",
    description:
      "Embed task and subtask text into the taskiro-memories collection and expose a semantic lookup path for the Copilot.",
    status: "in-progress",
    priority: "medium",
    tags: ["qdrant", "vector-search", "rag", "data-pipeline", "ai"],
    dueDate: "2026-09-08",
    subtasks: [
      {
        title: "Stand up the Qdrant collection and MCP server config",
        completed: true,
      },
      {
        title: "Backfill embeddings for existing tasks and subtasks",
        completed: false,
      },
    ],
  },
  {
    title: "Implement rate limiting on the auth API",
    description:
      "Throttle /auth/login and /auth/register per client to blunt credential-stuffing attempts.",
    status: "in-progress",
    priority: "high",
    tags: [],
    dueDate: "2026-09-04",
    subtasks: [],
  },

  /* ------------------------------- DONE (4) ------------------------------ */
  {
    title: "Configure Managed Cache Policy on CloudFront",
    description:
      "Replaced legacy forwarded_values with AWS managed cache policies: CachingOptimized for static assets, CachingDisabled for dynamic routes.",
    status: "done",
    priority: "medium",
    tags: ["cloudfront", "cdn", "caching", "aws"],
    dueDate: null,
    subtasks: [],
  },
  {
    title: "Enable versioning and SSE on the S3 bucket",
    description:
      "Turned on bucket versioning and server-side encryption, and denied any request arriving over plaintext HTTP.",
    status: "done",
    priority: "high",
    tags: ["s3", "storage", "encryption", "data-engineering"],
    dueDate: null,
    subtasks: [
      { title: "Enable bucket versioning", completed: true },
      {
        title: "Apply SSE and deny aws:SecureTransport=false",
        completed: true,
      },
    ],
  },
  {
    title: "Add mandatory FinOps tags to resources",
    description:
      "Applied Environment, CostCenter, and ManagedBy across every billable resource for cost allocation.",
    status: "done",
    priority: "low",
    tags: ["finops", "terraform", "cost-allocation", "tagging"],
    dueDate: null,
    subtasks: [],
  },
  {
    title: "Migrate password hashing to Bun.password",
    description:
      "Dropped the external hashing dependency in favour of Bun.password (argon2id by default).",
    status: "done",
    priority: "high",
    tags: [],
    dueDate: null,
    subtasks: [],
  },
];

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

interface UserIdRow {
  id: string;
}

interface CountRow {
  count: number;
}

interface PragmaRow {
  value: string | number;
}

/** Read a scalar pragma so the run can prove which durability settings applied. */
function readPragma(name: string): string {
  const row = db
    .query<PragmaRow, []>(`PRAGMA ${name}`)
    .get();
  if (!row) return "unknown";
  const [first] = Object.values(row);
  return String(first);
}

/**
 * Insert the seed user if absent, or refresh the password hash if present.
 * Returns the user id either way.
 */
async function upsertSeedUser(): Promise<{ id: string; created: boolean }> {
  const passwordHash = await Bun.password.hash(SEED_USER.password);

  const existing = db
    .query<UserIdRow, [string]>("SELECT id FROM users WHERE email = ?")
    .get(SEED_USER.email);

  if (existing) {
    db.query(
      "UPDATE users SET display_name = ?, password_hash = ? WHERE id = ?",
    ).run(SEED_USER.displayName, passwordHash, existing.id);
    return { id: existing.id, created: false };
  }

  const id = crypto.randomUUID();
  db.query(
    `INSERT INTO users (id, email, display_name, password_hash)
     VALUES (?, ?, ?, ?)`,
  ).run(id, SEED_USER.email, SEED_USER.displayName, passwordHash);
  return { id, created: true };
}

/* -------------------------------------------------------------------------- */
/* Main                                                                       */
/* -------------------------------------------------------------------------- */

async function main(): Promise<void> {
  const reset = process.argv.includes("--reset");

  // Safe on a fresh or restored database: creates tables only if absent.
  initSchema();

  console.log("[seed] pragmas in effect:");
  for (const pragma of [
    "journal_mode",
    "synchronous",
    "foreign_keys",
    "busy_timeout",
  ]) {
    console.log(`  ${pragma.padEnd(14)} = ${readPragma(pragma)}`);
  }

  const { id: userId, created } = await upsertSeedUser();
  console.log(
    `[seed] user ${SEED_USER.email} ${created ? "created" : "already existed, password refreshed"} (id=${userId})`,
  );

  const existingTasks =
    db
      .query<CountRow, [string]>(
        "SELECT COUNT(*) AS count FROM tasks WHERE user_id = ?",
      )
      .get(userId)?.count ?? 0;

  if (existingTasks > 0 && !reset) {
    console.error(
      `\n[seed] ABORTED. ${SEED_USER.email} already has ${existingTasks} task(s).\n` +
        "        Re-run with --reset to delete them and rebuild the board:\n" +
        "          bun run seed -- --reset\n",
    );
    process.exit(1);
  }

  const insertTask = db.query(
    `INSERT INTO tasks
       (id, user_id, title, description, status, priority, tags, assignee, position, due_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const insertSubtask = db.query(
    "INSERT INTO subtasks (id, task_id, title, completed) VALUES (?, ?, ?, ?)",
  );

  let taskCount = 0;
  let subtaskCount = 0;
  let completedSubtasks = 0;

  // One transaction: either the whole board lands or none of it does.
  db.transaction(() => {
    if (existingTasks > 0) {
      // Count children first: `changes` from the DELETE below reports tasks AND
      // cascade-removed subtasks combined, which would misreport the task total.
      const staleSubtasks =
        db
          .query<CountRow, [string]>(
            `SELECT COUNT(*) AS count FROM subtasks s
             JOIN tasks t ON t.id = s.task_id
             WHERE t.user_id = ?`,
          )
          .get(userId)?.count ?? 0;

      // ON DELETE CASCADE removes the child subtasks. Scoped to this user only.
      db.query("DELETE FROM tasks WHERE user_id = ?").run(userId);
      console.log(
        `[seed] --reset: removed ${existingTasks} task(s) and ` +
          `${staleSubtasks} cascaded subtask(s) for ${SEED_USER.email}`,
      );
    }

    // position restarts at 0 within each column, following array order.
    const nextPosition: Record<TaskStatus, number> = {
      todo: 0,
      "in-progress": 0,
      done: 0,
    };

    for (const task of SEED_TASKS) {
      const taskId = crypto.randomUUID();
      insertTask.run(
        taskId,
        userId,
        task.title,
        task.description,
        task.status,
        task.priority,
        JSON.stringify(task.tags),
        "", // assignee: not part of the recovered state
        nextPosition[task.status],
        task.dueDate,
      );
      nextPosition[task.status] += 1;
      taskCount += 1;

      for (const subtask of task.subtasks) {
        insertSubtask.run(
          crypto.randomUUID(),
          taskId,
          subtask.title,
          subtask.completed ? 1 : 0,
        );
        subtaskCount += 1;
        if (subtask.completed) completedSubtasks += 1;
      }
    }
  })();

  /* ------------------------------ Verification ------------------------------ */

  const byStatus = db
    .query<{ status: TaskStatus; count: number }, [string]>(
      "SELECT status, COUNT(*) AS count FROM tasks WHERE user_id = ? GROUP BY status",
    )
    .all(userId);

  const persistedSubtasks =
    db
      .query<CountRow, [string]>(
        `SELECT COUNT(*) AS count FROM subtasks s
         JOIN tasks t ON t.id = s.task_id
         WHERE t.user_id = ?`,
      )
      .get(userId)?.count ?? 0;

  const persistedCompleted =
    db
      .query<CountRow, [string]>(
        `SELECT COUNT(*) AS count FROM subtasks s
         JOIN tasks t ON t.id = s.task_id
         WHERE t.user_id = ? AND s.completed = 1`,
      )
      .get(userId)?.count ?? 0;

  console.log("\n[seed] board rebuilt — Production workspace");
  console.log("  column        tasks");
  for (const column of ["todo", "in-progress", "done"] as const) {
    const found = byStatus.find((row) => row.status === column)?.count ?? 0;
    console.log(`  ${column.padEnd(13)} ${found}`);
  }
  console.log(`  total tasks   ${taskCount}`);
  console.log(
    `  subtasks      ${persistedSubtasks} (${persistedCompleted} completed)`,
  );

  // Fail loudly if what we wrote is not what the database now holds.
  if (persistedSubtasks !== subtaskCount || persistedCompleted !== completedSubtasks) {
    console.error(
      `\n[seed] VERIFICATION FAILED: expected ${subtaskCount} subtasks ` +
        `(${completedSubtasks} completed), found ${persistedSubtasks} ` +
        `(${persistedCompleted} completed).`,
    );
    process.exit(1);
  }

  console.log(
    `\n[seed] done. Sign in as ${SEED_USER.email} / ${SEED_USER.password}\n`,
  );
}

await main();
