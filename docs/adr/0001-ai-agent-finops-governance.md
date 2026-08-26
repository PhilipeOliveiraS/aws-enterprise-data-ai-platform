# ADR 0001: Implementation of FinOps Governance for AI Agents

## Status
Accepted

## Context
The use of generative AI assistants (such as Kiro) accelerates development but introduces risks of provisioning infrastructure outside corporate standards (e.g., oversized EC2 instances) and excessive token/credit consumption during code iteration.

## Decision
We established a "Human Planning, Synthetic Execution" model. 
1. **FinOps by Design:** The AI agent will operate under strict *Global Steering* rules, being forced to use only Serverless services (Lambda, DynamoDB, S3) with mandatory *Billing Tags*.
2. **Shift-Left Security:** The AI will not have Auto-Approve permission for destructive operations. Local hooks (via shell CLI) will validate the code (linting and security checks) before any AI iteration, optimizing credit usage.

## Consequences
- **Positive:** Mitigated financial risk. Guarantee that the generated code meets the AWS Well-Architected Framework standards before deployment.
- **Negative:** Requires initial setup time to configure the Steering and Custom Agents environment.
