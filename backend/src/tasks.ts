import { Elysia, t } from "elysia";
import { db } from "./db.ts";
import { authGuard } from "./auth.ts";
import {
  toTaskDTO,
  toSubtaskDTO,
  type TaskRow,
  type SubtaskRow,
  type SubtaskDTO,
} from "./types.ts";

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

/** Load all subtasks for a task, ordered by creation time. */
function getSubtasks(taskId: string): SubtaskDTO[] {
  return db
    .query<SubtaskRow, [string]>(
      "SELECT * FROM subtasks WHERE task_id = ? ORDER BY created_at",
    )
    .all(taskId)
    .map(toSubtaskDTO);
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
    return rows.map((row) => toTaskDTO(row, getSubtasks(row.id)));
  })

  // READ — single task.
  .get("/:id", ({ user, params, set }) => {
    const row = getOwnedTask(params.id, user.id);
    if (!row) {
      set.status = 404;
      return { error: "Task not found" };
    }
    return toTaskDTO(row, getSubtasks(row.id));
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
      return toTaskDTO(row, getSubtasks(id));
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

      return toTaskDTO(
        getOwnedTask(params.id, user.id)!,
        getSubtasks(params.id),
      );
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

      return toTaskDTO(
        getOwnedTask(params.id, user.id)!,
        getSubtasks(params.id),
      );
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
  })

  // CREATE SUBTASK — attach a subtask to an owned parent task.
  .post(
    "/:id/subtasks",
    ({ user, params, body, set }) => {
      const parent = getOwnedTask(params.id, user.id);
      if (!parent) {
        set.status = 404;
        return { error: "Task not found" };
      }

      const id = crypto.randomUUID();
      db.query(
        "INSERT INTO subtasks (id, task_id, title, completed) VALUES (?, ?, ?, 0)",
      ).run(id, params.id, body.title.trim());

      const row = db
        .query<SubtaskRow, [string]>("SELECT * FROM subtasks WHERE id = ?")
        .get(id)!;

      set.status = 201;
      return toSubtaskDTO(row);
    },
    {
      body: t.Object({
        title: t.String({ minLength: 1 }),
      }),
    },
  )

  // TOGGLE SUBTASK — flip the completed flag.
  // NOTE: the parent-task path param must be named ":id" to match the other
  // "/:id/..." routes — the router rejects mixing param names at the same slot.
  .patch("/:id/subtasks/:subtaskId/toggle", ({ user, params, set }) => {
    const parent = getOwnedTask(params.id, user.id);
    if (!parent) {
      set.status = 404;
      return { error: "Task not found" };
    }

    const subtask = db
      .query<SubtaskRow, [string]>("SELECT * FROM subtasks WHERE id = ?")
      .get(params.subtaskId);

    if (!subtask || subtask.task_id !== params.id) {
      set.status = 404;
      return { error: "Subtask not found" };
    }

    const next = subtask.completed === 1 ? 0 : 1;
    db.query("UPDATE subtasks SET completed = ? WHERE id = ?").run(
      next,
      params.subtaskId,
    );

    const row = db
      .query<SubtaskRow, [string]>("SELECT * FROM subtasks WHERE id = ?")
      .get(params.subtaskId)!;

    return toSubtaskDTO(row);
  })

  // DELETE SUBTASK
  .delete("/:id/subtasks/:subtaskId", ({ user, params, set }) => {
    const parent = getOwnedTask(params.id, user.id);
    if (!parent) {
      set.status = 404;
      return { error: "Task not found" };
    }

    const subtask = db
      .query<SubtaskRow, [string]>("SELECT * FROM subtasks WHERE id = ?")
      .get(params.subtaskId);

    if (!subtask || subtask.task_id !== params.id) {
      set.status = 404;
      return { error: "Subtask not found" };
    }

    db.query("DELETE FROM subtasks WHERE id = ?").run(params.subtaskId);
    set.status = 204;
    return null;
  });
