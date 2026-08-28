---
author: Philipe Oliveira
role: Cloud Platform Engineer & AI Specialist
date: 2026-08-27
status: accepted
tags: [Agentic AI, Model Context Protocol, MCP, Data Engineering, Cloud Architecture, Automation, React, Graphite UI]
---

# ADR 0002: Implementation of Model Context Protocol (MCP) and Graphite UI Design System

## 1. Context and Technological Challenge
As part of the continuous evolution of the **TasKiro** enterprise platform—architected and led by **Philipe Oliveira**, an expert with a deep background in *Cloud Platform Engineering*, *Data Engineering*, and *Artificial Intelligence*—we identified the need to provide AI agents with real-time context and modernize the user interface without compromising backend stability.

The core challenges were:
1. Connecting the AI agent directly to the SQLite database and Git version control, overcoming the limitations of static training data.
2. Applying a comprehensive, high-density corporate frontend restyle (Graphite) without altering underlying business logic or functional React components.

## 2. Architectural Decision
Driven by our commitment to *Extreme Automation* and *Agentic AI*, we implemented the following technologies and patterns:

* **MCP (Model Context Protocol) Integration:** Configured local MCP servers (`mcp-server-sqlite-npx`, `mcp-server-git`, `mcp-server-fetch`) to provide real-time data auditing and codebase exploration capabilities to the AI agent (Kiro).
* **Agent Skills (Graphite UI):** Injected specialized design knowledge via `.kiro/skills`, establishing a strict monochrome OKLCH color system with a single blue accent and monospace typography, optimized for high-readability analytical dashboards.

## 3. Business Consequences and Benefits
The adoption of this architecture, heavily aligned with the *AWS Well-Architected Framework*, yielded immediate strategic impacts:

* **Operational Excellence & Automation:** The MCP integration transforms the development environment, enabling the AI to autonomously execute `read_query` operations, audit the SQLite database schema, and validate referential integrity in seconds.
* **Accelerated Time-to-Market:** Leveraging *Agent Skills* allowed for a complete restyling of the React/Vite frontend in minutes. By isolating the visual layer from the state logic, we ensured long-term maintainability and scalability.
* **Governance & Security:** Utilizing the official Anthropic/community packages via `npx`/`bunx` guarantees that the AI tools operate under strict permissions, targeting the exact development database path, thereby minimizing operational risks.

This architectural foundation reinforces the platform's transition from a traditional web application to an autonomous **Multi-Agent System (MAS)**, solidifying our data infrastructure for future innovation cycles.
