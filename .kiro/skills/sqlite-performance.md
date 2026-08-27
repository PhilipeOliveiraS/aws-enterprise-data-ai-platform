---
name: sqlite-performance-tuning
description: Use when debugging slow queries, optimizing SQLite pragmas, or managing concurrent database transactions in Bun.
---
# SQLite Performance & Concurrency in Bun

## Overview
Guidelines for high-throughput SQLite execution using `bun:sqlite` in concurrent environments.

## Best Practices
- Keep connections open and reuse prepared statements.
- Set `busy_timeout` to at least 5000ms to handle write lock contention.
- Use `synchronous = NORMAL` in WAL mode to balance safety and write speed.
