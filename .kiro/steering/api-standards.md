---
inclusion: fileMatch
fileMatchPattern: "backend/src/**/*.ts"
---
# Backend API & Data Integrity Standards

## Context References
Refer to the current schema definition:
#[[file:backend/src/db.ts]]

## Rules
- Strictly type all ElysiaJS endpoints.
- Preserve SQLite PRAGMA journal_mode = WAL and synchronous = NORMAL.
- Ensure ON DELETE CASCADE is maintained for all child relations.
