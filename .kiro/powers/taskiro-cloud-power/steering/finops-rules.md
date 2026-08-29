<!-- Power-scoped steering (taskiro-cloud-power only). See .kiro/steering/ for global, cross-power conventions. -->
# FinOps Workflow & Cost Allocation Rules

## Mandatory Tagging
Every provisioned AWS resource must enforce standard tags:
- `Environment`: target deployment stage (`dev`, `staging`, `prod`)
- `CostCenter`: `"TASKIRO-AI-LAB"`
- `ManagedBy`: `"Kiro-Agent"`

## Storage Tiering Policy
- S3 objects must configure automated transition to `STANDARD_IA` at 30 days.
- Non-current versions transition to `GLACIER` at 90 days.
