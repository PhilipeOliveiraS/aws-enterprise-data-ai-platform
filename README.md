# AWS Enterprise AI Platform (TasKiro Edition)

This repository consolidates the architecture and implementation of a full-stack task management application (TasKiro), orchestrated by Artificial Intelligence agents (Kiro / AWS) under strict enterprise governance.

## Overview and Demonstrated Capabilities

This project acts as an advanced engineering laboratory, elevating a standard web application to a C-Level enterprise standard, highlighting proficiency in the following disciplines:

*   **AI Solutions Architecture & AI Engineering:** AI Agents orchestration using Model Context Protocol (MCP) with context injection via Steering Files and Custom Agents.
*   **Full-Stack Engineering:** Implementation using a modern, high-performance stack: **Bun, React 19, Tailwind v4, ElysiaJS, and SQLite**.
*   **Cloud Platform Engineering:** Designing a resilient AWS architecture featuring CloudFront, Application Load Balancers, and Private EC2 Instances via NAT Gateway.
*   **DevSecOps & FinOps:** Implementation of Agent Hooks for static formatting, strict IAM *Least Privilege* policies, and mandatory Cost Allocation Tags enforced at the AI-generation level.

## Directory Architecture
- `docs/adr/`: Architecture Decision Records documenting trade-offs and executive decisions.
- `infra/`: Infrastructure components and deployment scripts.
- `src/` (or root depending on AI Spec): Full-stack application source code.
- `.kiro/`: AI Governance (Steering, Hooks, and Restricted Agents).
- `.github/workflows/`: Headless automation for CI/CD via Kiro CLI.
