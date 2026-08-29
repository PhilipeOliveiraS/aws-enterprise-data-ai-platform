---
name: "taskiro-cloud-power"
displayName: "TasKiro Enterprise Cloud & DevSecOps Power"
description: "Enterprise AWS cloud architecture, Terraform IaC automation, FinOps lifecycle, and DevSecOps governance for TasKiro."
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
---

# TasKiro Enterprise Cloud & DevSecOps Power

## Onboarding
1. Verify that Terraform `>= 1.5.0` and AWS CLI are configured in the environment.
2. Confirm the active AWS credentials/session target the configured region (`us-east-1`).
3. Ensure connected MCP servers (`aws-documentation`, `aws-knowledge`) are responsive before generating IaC.

## Available Tools & MCP Integrations
- `awslabs.aws-documentation-mcp-server` — Query up-to-date AWS construct specifications and API policies in real time.
- `mcp-server-git` — Inspect repository diffs and track infrastructure versioning.
- `mcp-server-sqlite` — Query local task database metadata and schemas.

## Steering Instructions
When planning or implementing infrastructure changes, follow these workflow guides:
- For FinOps tagging and cost allocation: see [steering/finops-rules.md](steering/finops-rules.md)
- For KMS and S3 security baselines: see [steering/security-baseline.md](steering/security-baseline.md)
- For ADR creation and YAML frontmatter standard: see [steering/adr-governance.md](steering/adr-governance.md)
