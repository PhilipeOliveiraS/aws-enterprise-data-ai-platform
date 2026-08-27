---
inclusion: fileMatch
fileMatchPattern: "infra/terraform/**/*.tf"
---
# AWS Infrastructure & FinOps Governance

## Context References
Refer to ADR 0001 for architectural decisions:
#[[file:docs/adr/0001-ai-agent-finops-governance.md]]

## Rules
- Target AWS Provider v5.x with explicit lock files.
- Default tags MUST include: Environment, CostCenter, ManagedBy.
- Managed Cache Policies MUST be used for CloudFront distributions.
