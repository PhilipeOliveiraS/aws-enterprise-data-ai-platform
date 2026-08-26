import { Elysia, t } from "elysia";
import { db } from "./db.ts";
import { authGuard } from "./auth.ts";
import { toTaskDTO, type TaskRow } from "./types.ts";

const statusSchema = t.Union([
  t.Literal("todo"),
  t.Literal("in-progress"),
  t.Literal("done"),
]);

const prioritySchema = t.Union([
  t.Literal("low"),
  t.Literal("medium"),
  t.Literal("high"),
  t.Literal("critical"),
]);

function getOwnedTask(id: string, userId: string): TaskRow | null {
  return (
    db
      .query<TaskRow, [string, string]>(
        "SELECT * FROM tasks WHERE id = ? AND user_id = ?",
      )
      .get(id, userId) ?? null
  );
}

export const taskRoutes = new Elysia({ prefix: "/tasks" })
  .use(authGuard)

  // READ — list all tasks for the authenticated user.
  .get("/", ({ user }) => {
    const rows = db
      .query<TaskRow, [string]>(
        "SELECT * FROM tasks WHERE user_id = ? ORDER BY status, position, created_at",
      )
      .all(user.id);
    return rows.map(toTaskDTO);
  })

  // READ — single task.
  .get("/:id", ({ user, params, set }) => {
    const row = getOwnedTask(params.id, user.id);
    if (!row) {
      set.status = 404;
      return { error: "Task not found" };
    }
    return toTaskDTO(row);
  })

  // CREATE
  .post(
    "/",
    ({ user, body, set }) => {
      const id = crypto.randomUUID();
      const status = body.status ?? "todo";

      const nextPos = db
        .query<{ pos: number }, [string, string]>(
          "SELECT COALESCE(MAX(position) + 1, 0) AS pos FROM tasks WHERE user_id = ? AND status = ?",
        )
        .get(user.id, status);

      db.query(
        `INSERT INTO tasks (id, user_id, title, description, status, priority, tags, assignee, position)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        id,
        user.id,
        body.title.trim(),
        body.description?.trim() ?? "",
        status,
        body.priority ?? "medium",
        JSON.stringify(body.tags ?? []),
        body.assignee?.trim() ?? "",
        nextPos?.pos ?? 0,
      );

      const row = getOwnedTask(id, user.id)!;
      set.status = 201;
      return toTaskDTO(row);
    },
    {
      body: t.Object({
        title: t.String({ minLength: 1 }),
        description: t.Optional(t.String()),
        status: t.Optional(statusSchema),
        priority: t.Optional(prioritySchema),
        tags: t.Optional(t.Array(t.String())),
        assignee: t.Optional(t.String()),
      }),
    },
  )

  // UPDATE — partial edit of a task's fields.
  .put(
    "/:id",
    ({ user, params, body, set }) => {
      const existing = getOwnedTask(params.id, user.id);
      if (!existing) {
        set.status = 404;
        return { error: "Task not found" };
      }

      const merged = {
        title: body.title?.trim() ?? existing.title,
        description: body.description?.trim() ?? existing.description,
        status: body.status ?? existing.status,
        priority: body.priority ?? existing.priority,
        tags: body.tags ? JSON.stringify(body.tags) : existing.tags,
        assignee: body.assignee?.trim() ?? existing.assignee,
      };

      db.query(
        `UPDATE tasks
         SET title = ?, description = ?, status = ?, priority = ?, tags = ?, assignee = ?,
             updated_at = datetime('now')
         WHERE id = ? AND user_id = ?`,
      ).run(
        merged.title,
        merged.description,
        merged.status,
        merged.priority,
        merged.tags,
        merged.assignee,
        params.id,
        user.id,
      );

      return toTaskDTO(getOwnedTask(params.id, user.id)!);
    },
    {
      body: t.Object({
        title: t.Optional(t.String({ minLength: 1 })),
        description: t.Optional(t.String()),
        status: t.Optional(statusSchema),
        priority: t.Optional(prioritySchema),
        tags: t.Optional(t.Array(t.String())),
        assignee: t.Optional(t.String()),
      }),
    },
  )

  // UPDATE STATUS/COLUMN — dedicated Kanban move endpoint.
  .patch(
    "/:id/status",
    ({ user, params, body, set }) => {
      const existing = getOwnedTask(params.id, user.id);
      if (!existing) {
        set.status = 404;
        return { error: "Task not found" };
      }

      const position =
        body.position ??
        (
          db
            .query<{ pos: number }, [string, string]>(
              "SELECT COALESCE(MAX(position) + 1, 0) AS pos FROM tasks WHERE user_id = ? AND status = ?",
            )
            .get(user.id, body.status)?.pos ?? 0
        );

      db.query(
        `UPDATE tasks SET status = ?, position = ?, updated_at = datetime('now')
         WHERE id = ? AND user_id = ?`,
      ).run(body.status, position, params.id, user.id);

      return toTaskDTO(getOwnedTask(params.id, user.id)!);
    },
    {
      body: t.Object({
        status: statusSchema,
        position: t.Optional(t.Number()),
      }),
    },
  )

  // DELETE
  .delete("/:id", ({ user, params, set }) => {
    const existing = getOwnedTask(params.id, user.id);
    if (!existing) {
      set.status = 404;
      return { error: "Task not found" };
    }
    db.query("DELETE FROM tasks WHERE id = ? AND user_id = ?").run(
      params.id,
      user.id,
    );
    set.status = 204;
    return null;
  });
