# Implementation Plan: Subtasks & Hardening

## Overview

This plan implements the **two remaining hardening gaps** from the Subtasks & Hardening spec. The subtasks lifecycle (schema, DTOs, three owner-scoped endpoints, embedding, and the full frontend UI) is **already implemented and verified** in the codebase and is documented in `design.md` as the design of record — it is NOT reimplemented here.

The actionable new work is:
- **GAP 1** — SQLite durability/concurrency pragmas in `backend/src/db.ts` (Requirement 6).
- **GAP 2** — CloudFront managed cache policies in `infra/terraform/envs/dev/compute.tf` (Requirement 7).
- **Final cross-cutting verification** — confirm no regression to the as-built feature.

GAP 1 and GAP 2 are independent and could be done in parallel; GAP 1 is listed first because it is self-contained and unblocks a persistence smoke test.

## Already Implemented (As-Built — do NOT rebuild)

The following exists, is verified, and maps to Requirements 1, 2, 3, 4, 5 (partial), 8, 9, 10, 11. These are checked to make clear they are complete; only verify, never re-implement.

- [x] Schema: `subtasks` table + `idx_subtasks_task` index + `FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE` (as-built — verify only) _Requirements: 5.1, 5.2_
- [x] Backend types: `SubtaskRow`, `SubtaskDTO`, `toSubtaskDTO` (0/1 → boolean); `TaskDTO` with `subtasks`, `subtaskTotal`, `subtaskCompleted` (derived, never stored) (as-built — verify only) _Requirements: 4.4_
- [x] Endpoints: `POST /tasks/:id/subtasks`, `PATCH /tasks/:id/subtasks/:subtaskId/toggle`, `DELETE /tasks/:id/subtasks/:subtaskId` — owner-scoped via `getOwnedTask`, parent param `:id` (documented router constraint) (as-built — verify only) _Requirements: 1, 2, 3_
- [x] Embedding: `subtasks` + counts embedded across all task responses (`GET /tasks`, `GET /tasks/:id`, `POST /tasks`, `PUT /tasks/:id`, `PATCH /tasks/:id/status`) (as-built — verify only) _Requirements: 4.1, 4.2, 4.3_
- [x] API client: `api.addSubtask`, `api.toggleSubtask`, `api.deleteSubtask` (as-built — verify only) _Requirements: 9.2_
- [x] `EditTaskModal` checklist: add/toggle/delete, per-row `pendingSubtaskIds` guard, inline `subtaskError`, `onSubtasksChanged`, clean unmount on close (as-built — verify only) _Requirements: 9.1, 9.3, 9.4, 9.5, 10.1, 10.2_
- [x] `TaskCard` progress bar: `"{subtaskCompleted} of {subtaskTotal} subtasks completed"` + gradient bar, shown only when `subtaskTotal > 0` (as-built — verify only) _Requirements: 8.1, 8.2, 8.3_
- [x] `Dashboard.handleSubtasksChanged`: recomputes counts and patches task state in place, no refetch (as-built — verify only) _Requirements: 11.1, 11.2_

## Tasks

- [x] 1. GAP 1 — Add SQLite durability/concurrency pragmas (`backend/src/db.ts`)
  - [x] 1.1 Add the missing pragmas in the exact ordered sequence
    - In `backend/src/db.ts`, immediately after opening the `bun:sqlite` database, set the four pragmas in this exact order: `PRAGMA journal_mode = WAL;`, then `PRAGMA synchronous = NORMAL;`, then `PRAGMA foreign_keys = ON;`, then `PRAGMA busy_timeout = 5000;`
    - Add `synchronous = NORMAL` and `busy_timeout = 5000` (the two new pragmas); keep `journal_mode = WAL` and `foreign_keys = ON`
    - `journal_mode` MUST be set before `synchronous`
    - Do not change schema, DTOs, or any other module
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x]* 1.2 Verify the connection reports the expected pragma values
    - **Property 8: GAP 1 invariant**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5**
    - After boot, read back via PRAGMA queries (bun:sqlite) and assert: `journal_mode = wal`, `synchronous = 1` (NORMAL), `foreign_keys = 1`, `busy_timeout = 5000`
    - Confirm the existing subtask cascade-delete still works (deleting a task removes its subtasks) — i.e. `foreign_keys` stays ON
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 5.3_

- [x] 2. GAP 2 — Migrate CloudFront to managed cache policies (`infra/terraform/envs/dev/compute.tf`)
  - [x] 2.1 Add the three managed-policy data sources
    - Add `data "aws_cloudfront_cache_policy" "caching_disabled"` with `name = "Managed-CachingDisabled"`
    - Add `data "aws_cloudfront_cache_policy" "caching_optimized"` with `name = "Managed-CachingOptimized"`
    - Add `data "aws_cloudfront_origin_request_policy" "all_viewer"` with `name = "Managed-AllViewer"`
    - These are AWS-managed data sources and take no tags
    - _Requirements: 7.1, 7.2_

  - [x] 2.2 Migrate the `default_cache_behavior` (API proxy) to managed policies
    - Remove the `forwarded_values` block and all inline `min_ttl` / `default_ttl` / `max_ttl` from the default behavior
    - Set `cache_policy_id = data.aws_cloudfront_cache_policy.caching_disabled.id`
    - Set `origin_request_policy_id = data.aws_cloudfront_origin_request_policy.all_viewer.id`
    - _Requirements: 7.1, 7.3, 7.4_

  - [x] 2.3 Migrate the `/assets/*` `ordered_cache_behavior` to managed policy
    - Remove the `forwarded_values` block and all inline `min_ttl` / `default_ttl` / `max_ttl` from the `/assets/*` behavior
    - Set `cache_policy_id = data.aws_cloudfront_cache_policy.caching_optimized.id`
    - Ensure no behavior sets both `forwarded_values` and `cache_policy_id`
    - Leave the provider `default_tags` FinOps tags (`Environment`, `CostCenter`, `ManagedBy`) untouched on taggable resources
    - _Requirements: 7.2, 7.3, 7.4, 7.5_

  - [x]* 2.4 Verify the Terraform config validates and is clean of `forwarded_values`
    - **Property 9: GAP 2 invariant**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4**
    - Run `terraform fmt` and `terraform validate` in `infra/terraform/envs/dev/` (both must pass)
    - Confirm no `forwarded_values` block remains on either migrated behavior and no behavior sets both `forwarded_values` and `cache_policy_id`
    - Confirm the `default_tags`/FinOps tags remain untouched on taggable resources
    - _Requirements: 7.3, 7.4, 7.5_

- [x] 3. Final cross-cutting verification (no regression to as-built feature)
  - [x] 3.1 Confirm the frontend still builds
    - Run `bun run build` in `frontend/` and confirm zero type/Rollup errors (the subtasks UI is as-built; this just confirms no regression)
    - _Requirements: 8.1, 8.2, 8.3, 9.1, 11.1_

  - [x] 3.2 Confirm both dev servers remain running without downtime
    - Confirm backend `:3000` `/health` returns `200` and frontend `:5173` returns `200`
    - _Requirements: 6.1_

  - [x]* 3.3 Live smoke check of subtask CRUD persistence after the db.ts pragma change
    - **Property 3: Cascade delete removes subtasks** / **Property 5: Counts equal derived aggregates**
    - **Validates: Requirements 5.2, 5.3, 4.1, 4.4**
    - Create a task → add a subtask → toggle it → `GET` and confirm `subtaskTotal` / `subtaskCompleted` counts → delete the task and confirm the subtask is cascade-removed
    - Clean up any test data created during the smoke check
    - _Requirements: 4.1, 4.4, 5.2, 5.3_

## Notes

- Tasks marked with `*` are optional (verification sub-tasks) and can be skipped for a faster path, though they are strongly recommended given the durability/infra nature of the changes.
- The "Already Implemented (As-Built)" section is checked-complete on purpose — those items are the design of record and must not be rebuilt. Only verify them if needed.
- GAP 1 (Task 1) and GAP 2 (Task 2) are independent and can run in parallel; GAP 1 is listed first because it unblocks the persistence smoke test in Task 3.
- Each actionable task references the specific requirement clauses and, where applicable, the correctness property it validates (Property 8 for GAP 1, Property 9 for GAP 2).
- No source code, design, or requirements documents are modified by this planning artifact.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1"] },
    { "id": 1, "tasks": ["1.2", "2.2"] },
    { "id": 2, "tasks": ["2.3"] },
    { "id": 3, "tasks": ["2.4", "3.1", "3.2"] },
    { "id": 4, "tasks": ["3.3"] }
  ]
}
```
