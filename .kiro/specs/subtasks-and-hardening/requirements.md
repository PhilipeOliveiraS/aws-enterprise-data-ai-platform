# Requirements Document

## Introduction

TasKiro is a cyberpunk-themed Kanban board built on a React 19 SPA, an ElysiaJS-on-Bun REST API, and a `bun:sqlite` datastore, deployed CloudFront → ALB → private EC2 → SQLite on EBS. This spec has two intents captured together as the design of record:

1. **Document the as-built subtasks feature** — a per-task subtask checklist (schema, DTOs, three owner-scoped endpoints, embedded counts, and the frontend UI) that is already implemented and verified in the codebase. These requirements describe the system as it actually exists so the working contract is not churned.
2. **Specify two remaining hardening gaps** that are the real new work: SQLite durability/concurrency pragmas (GAP 1) and CloudFront managed cache policies (GAP 2). Both derive from the real-time architectural audit in [ADR 0001, Audit Addendum](../../../docs/adr/0001-ai-agent-finops-governance.md) and are constrained by [`.kiro/steering/aws-standards.md`](../../steering/aws-standards.md).

**Field-naming reconciliation.** The original loose request referred to `total_subtasks` / `completed_subtasks`. The actual implemented and frontend-consumed field names are the camelCase `subtaskTotal` / `subtaskCompleted`. These requirements use the real names throughout; no renaming is proposed, and the working contract is authoritative.

## Glossary

- **Subtask**: A child checklist item belonging to exactly one parent task (one-to-many, `ON DELETE CASCADE`). Persisted in the `subtasks` table with `id`, `task_id`, `title`, `completed` (0/1 integer), and `created_at`.
- **SubtaskDTO**: The public API/UI representation of a subtask: `{ id, taskId, title, completed: boolean, createdAt }`, where `completed` is the boolean surface of the 0/1 integer column (`completed === 1`).
- **subtaskTotal**: A derived aggregate on each `TaskDTO` equal to the count of that task's subtasks (`subtasks.length`). Always derived, never stored.
- **subtaskCompleted**: A derived aggregate on each `TaskDTO` equal to the count of that task's completed subtasks (`subtasks.filter(s => s.completed).length`). Always derived, never stored.
- **WAL**: Write-Ahead Logging, a SQLite journal mode enabling concurrent readers and a single writer; set via `PRAGMA journal_mode = WAL`.
- **Managed cache policy**: An AWS-managed CloudFront cache policy referenced by a stable AWS-wide ID (e.g. `Managed-CachingDisabled`, `Managed-CachingOptimized`) that owns TTL and caching-key behavior; mutually exclusive with legacy `forwarded_values`.
- **Origin request policy**: An AWS-managed CloudFront policy (e.g. `Managed-AllViewer`) that controls which viewer headers, cookies, and query strings are forwarded to the origin.
- **authGuard**: The ElysiaJS JWT-bearer authentication guard that fronts every task and subtask route; rejects missing/invalid tokens with `401`.
- **Owner-scoped**: Access constrained to the authenticated principal's own resources; enforced for tasks and subtasks by `getOwnedTask(id, userId)`.
- **The_API**: The ElysiaJS-on-Bun REST backend serving task and subtask routes.
- **The_Database_Layer**: The `bun:sqlite` connection and schema management module (`backend/src/db.ts`).
- **The_CloudFront_Configuration**: The Terraform CloudFront distribution definition in `infra/terraform/envs/dev/compute.tf`.
- **The_TaskCard**: The `components/TaskCard.tsx` React component rendering a single task card on the board.
- **The_EditTaskModal**: The `components/EditTaskModal.tsx` React component providing task editing plus the subtask checklist.
- **The_Board**: The `components/Dashboard.tsx` React component that owns board state.

## Requirements

### Requirement 1: Subtask Creation

**User Story:** As an authenticated user, I want to add a subtask to a task I own, so that I can break the task into a checklist of smaller items.

#### Acceptance Criteria

1. WHEN a client sends `POST /tasks/:id/subtasks` with a non-empty (server-trimmed) title for a task owned by the authenticated user, THE The_API SHALL create the subtask and return `201` with the created SubtaskDTO.
2. IF the request body title is empty, whitespace-only, or missing, THEN THE The_API SHALL reject the request with a `400` validation error and SHALL NOT create a subtask.
3. IF the parent task identified by `:id` is not owned by the authenticated user, THEN THE The_API SHALL return `404` with body `{ "error": "Task not found" }` and SHALL NOT create a subtask.
4. IF the request carries a missing or invalid JWT, THEN THE The_API SHALL return `401` and SHALL NOT create a subtask.

### Requirement 2: Subtask Toggle

**User Story:** As an authenticated user, I want to toggle a subtask's completion, so that I can track progress on a task I own.

#### Acceptance Criteria

1. WHEN a client sends `PATCH /tasks/:id/subtasks/:subtaskId/toggle` for a subtask belonging to an owned parent task, THE The_API SHALL invert the subtask's `completed` value (`1` becomes `0`, `0` becomes `1`) and return `200` with the updated SubtaskDTO.
2. IF the parent task identified by `:id` is not owned by the authenticated user, THEN THE The_API SHALL return `404` with body `{ "error": "Task not found" }` and SHALL NOT modify any subtask.
3. IF the subtask identified by `:subtaskId` does not exist or its `task_id` does not equal `:id`, THEN THE The_API SHALL return `404` with body `{ "error": "Subtask not found" }` and SHALL NOT modify any subtask.
4. IF the request carries a missing or invalid JWT, THEN THE The_API SHALL return `401` and SHALL NOT modify any subtask.

### Requirement 3: Subtask Deletion

**User Story:** As an authenticated user, I want to delete a subtask from a task I own, so that I can remove checklist items that are no longer relevant.

#### Acceptance Criteria

1. WHEN a client sends `DELETE /tasks/:id/subtasks/:subtaskId` for a subtask belonging to an owned parent task, THE The_API SHALL remove the subtask record and return `204` with an empty body.
2. IF the parent task identified by `:id` is not owned by the authenticated user, THEN THE The_API SHALL return `404` with body `{ "error": "Task not found" }` and SHALL NOT delete any subtask.
3. IF the subtask identified by `:subtaskId` does not exist or its `task_id` does not equal `:id`, THEN THE The_API SHALL return `404` with body `{ "error": "Subtask not found" }` and SHALL NOT delete any subtask.
4. IF the request carries a missing or invalid JWT, THEN THE The_API SHALL return `401` and SHALL NOT delete any subtask.

### Requirement 4: Embedded Subtasks and Derived Counts

**User Story:** As a board user, I want each task response to include its subtasks and progress counts, so that the board can render progress without extra round-trips.

#### Acceptance Criteria

1. WHEN a client sends `GET /tasks`, THE The_API SHALL return `200` with an array of TaskDTOs where each TaskDTO includes `subtasks` ordered by `created_at`, `subtaskTotal`, and `subtaskCompleted`.
2. WHEN a client sends `GET /tasks/:id` for an owned task, THE The_API SHALL return the TaskDTO populated with `subtasks` ordered by `created_at`, `subtaskTotal`, and `subtaskCompleted`.
3. WHEN a client creates a task via `POST /tasks`, updates a task via `PUT /tasks/:id`, or moves a task via `PATCH /tasks/:id/status`, THE The_API SHALL return the resulting TaskDTO populated with `subtasks` ordered by `created_at`, `subtaskTotal`, and `subtaskCompleted`.
4. THE The_API SHALL derive `subtaskTotal` as the count of the task's subtasks and `subtaskCompleted` as the count of the task's completed subtasks, and SHALL NOT persist either count.

### Requirement 5: Referential Integrity and Cascade Delete

**User Story:** As a data steward, I want subtasks to be structurally tied to their parent task, so that deleting a task never leaves orphaned subtasks.

#### Acceptance Criteria

1. THE The_Database_Layer SHALL define the `subtasks` table with `FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE`.
2. WHEN a task is deleted, THE The_Database_Layer SHALL remove all subtasks whose `task_id` equals that task's id.
3. THE The_Database_Layer SHALL enable `PRAGMA foreign_keys = ON` at connection open so that the `ON DELETE CASCADE` constraint is enforced.

### Requirement 6: SQLite Durability and Concurrency Hardening (GAP 1)

**User Story:** As an operator, I want the SQLite connection tuned for durability and concurrency, so that the single-writer datastore stays reliable under contention.

#### Acceptance Criteria

1. WHEN The_Database_Layer initializes the connection, THE The_Database_Layer SHALL apply `PRAGMA journal_mode = WAL`.
2. WHEN The_Database_Layer initializes the connection, THE The_Database_Layer SHALL apply `PRAGMA synchronous = NORMAL`.
3. WHEN The_Database_Layer initializes the connection, THE The_Database_Layer SHALL apply `PRAGMA foreign_keys = ON`.
4. WHEN The_Database_Layer initializes the connection, THE The_Database_Layer SHALL apply `PRAGMA busy_timeout = 5000`.
5. WHEN The_Database_Layer applies the connection pragmas, THE The_Database_Layer SHALL set `journal_mode` before `synchronous`.

### Requirement 7: CloudFront Managed Cache Policies (GAP 2)

**User Story:** As an infrastructure engineer, I want CloudFront to use AWS managed cache policies instead of deprecated `forwarded_values`, so that caching intent is maintained by AWS and remains compliant with the stack standards.

#### Acceptance Criteria

1. THE The_CloudFront_Configuration SHALL apply the `Managed-CachingDisabled` managed cache policy and the `Managed-AllViewer` origin request policy to the default (API proxy) cache behavior.
2. THE The_CloudFront_Configuration SHALL apply the `Managed-CachingOptimized` managed cache policy to the `/assets/*` ordered cache behavior.
3. THE The_CloudFront_Configuration SHALL NOT set both `forwarded_values` and `cache_policy_id` on any single cache behavior.
4. THE The_CloudFront_Configuration SHALL NOT retain any `forwarded_values` block or inline `min_ttl` / `default_ttl` / `max_ttl` on the migrated cache behaviors.
5. THE The_CloudFront_Configuration SHALL continue applying the FinOps mandatory tags (`Environment`, `CostCenter`, `ManagedBy`) to taggable resources via the provider `default_tags` block, while the AWS-managed cache and origin request policies remain untagged data sources.

### Requirement 8: TaskCard Progress Indicator

**User Story:** As a board user, I want each task card to show subtask progress, so that I can see completion at a glance.

#### Acceptance Criteria

1. WHILE viewing a TaskCard whose `subtaskTotal` is greater than 0, THE The_TaskCard SHALL render an inline progress indicator showing `"{subtaskCompleted} of {subtaskTotal} subtasks completed"`.
2. WHILE viewing a TaskCard whose `subtaskTotal` is greater than 0, THE The_TaskCard SHALL render an animated cyberpunk progress bar whose width equals `subtaskCompleted / subtaskTotal * 100%`.
3. WHEN a TaskCard's `subtaskTotal` is 0, THE The_TaskCard SHALL render no progress section.

### Requirement 9: EditTaskModal Subtask Management

**User Story:** As a user editing a task, I want to manage its subtasks in real time, so that I can build and update the checklist without leaving the modal.

#### Acceptance Criteria

1. WHEN a user opens The_EditTaskModal for a task, THE The_EditTaskModal SHALL display the task's subtask checklist.
2. WHEN a user creates, toggles, or deletes a subtask in The_EditTaskModal, THE The_EditTaskModal SHALL perform the mutation immediately against the API independently of the Save action.
3. WHILE a subtask row has a mutation in flight, THE The_EditTaskModal SHALL disable that row's controls via a per-row in-flight guard so only that row is affected.
4. IF a subtask mutation request fails, THEN THE The_EditTaskModal SHALL surface the error inline and clear the affected row's pending state.
5. WHEN a subtask create, toggle, or delete completes, THE The_EditTaskModal SHALL notify the board via `onSubtasksChanged(taskId, subtasks)`.

### Requirement 10: Modal Overlay Cleanup

**User Story:** As a user, I want modals to close cleanly, so that the board stays interactive after I dismiss a dialog.

#### Acceptance Criteria

1. WHEN a user closes a modal via backdrop click or the Escape key, THE The_EditTaskModal SHALL remove its overlay without leaving trapped pointer events.
2. WHEN a modal is closed, THE The_EditTaskModal SHALL unmount its panel and backdrop by returning nothing while not open or without a task.

### Requirement 11: Board Sync Without Refetch

**User Story:** As a board user, I want subtask changes to update the board immediately, so that progress stays accurate without reloading data.

#### Acceptance Criteria

1. WHEN a subtask is created, toggled, or deleted in The_EditTaskModal, THE The_Board SHALL recompute the affected task's `subtaskTotal` and `subtaskCompleted` and patch that task's state in place without a full refetch.
2. WHEN The_Board patches an affected task in place, THE The_Board SHALL leave all other tasks' state unchanged.
