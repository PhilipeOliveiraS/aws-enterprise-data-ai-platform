---
name: sqlite-performance-tuning
description: Optimize SQLite database performance in Bun, tune WAL pragma settings, handle database lock contention, and troubleshoot slow queries.
---
# SQLite Performance Tuning in Bun

## When to Use
- Managing high-concurrency read/write transactions.
- Diagnosing database lock errors or `SQLITE_BUSY` timeouts.
- Tuning runtime pragmas for persistent EBS volumes.

## Pragma Standards
- `journal_mode = WAL`: Allows concurrent readers alongside a single writer.
- `synchronous = NORMAL`: Minimizes sync overhead while guaranteeing durability in WAL mode.
- `busy_timeout = 5000`: Sets 5-second lock backoff before throwing busy errors.
