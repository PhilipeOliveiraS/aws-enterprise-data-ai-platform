---
name: "taskiro-cloud-power"
displayName: "TasKiro Enterprise Cloud & DevSecOps Power"
description: "Enterprise AWS cloud architecture, Terraform IaC automation, FinOps lifecycle, persistent semantic memory, and DevSecOps governance for TasKiro."
keywords:
  - "aws"
  - "terraform"
  - "cloud"
  - "s3"
  - "kms"
  - "finops"
  - "devsecops"
  - "deploy"
  - "infrastructure"
  - "adr"
  - "governance"
  - "qdrant"
---

# TasKiro Enterprise Cloud & DevSecOps Power

## Onboarding

1. Verify that Terraform >= 1.5.0 and AWS CLI are configured in the environment.
2. Confirm the active AWS credentials/session target the configured region (us-east-1).
3. Ensure connected MCP servers (awslabs.aws-documentation-mcp-server, aws-knowledge-mcp, power-qdrant-qdrant) are responsive before generating IaC.
4. Confirm the local Qdrant instance is reachable (:6333/:6334) before relying on semantic memory recall.

## Available Tools & MCP Integrations

- awslabs.aws-documentation-mcp-server — Query up-to-date AWS construct specifications and API policies in real time.
- aws-knowledge-mcp — Well-Architected guidance via the AWS Knowledge API.
- power-qdrant-qdrant (mcp-server-qdrant) — Persistent semantic memory (vector storage and RAG recall) for architectural decisions.
- git-platform (mcp-server-git) — Inspect repository diffs and track infrastructure versioning.
- sqlite-taskiro (mcp-server-sqlite-npx) — Query the local task database metadata and schemas.
- fetch-docs (mcp-server-fetch) — Fetch and read arbitrary documentation URLs referenced during planning.

## Steering Instructions

When planning or implementing infrastructure changes, follow these workflow guides:

- For FinOps tagging and cost allocation: see [steering/finops-rules.md](steering/finops-rules.md)
- For KMS and S3 security baselines: see [steering/security-baseline.md](steering/security-baseline.md)
- For ADR creation and YAML frontmatter standard: see [steering/adr-governance.md](steering/adr-governance.md)
