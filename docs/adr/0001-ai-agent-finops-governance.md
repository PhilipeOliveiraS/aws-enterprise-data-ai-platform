# ADR 0001: Implementation of FinOps & DevSecOps Governance for AI Agents

## Status
Accepted

## Context
The use of generative AI assistants accelerates the development of our full-stack application (Bun, React, ElysiaJS). However, allowing AI to autonomously provision AWS infrastructure introduces risks of non-compliance (e.g., public EC2 instances) and FinOps violations.

## Decision
We established a strict "Governance-First" AI model.
1. **Infrastructure by Design:** The AI agent is bound by *Global Steering* rules, forcing the AWS architecture to follow a secure pattern: CloudFront -> ALB -> Private EC2 -> SQLite on EBS, ensuring no direct internet access to the compute layer.
2. **FinOps Enforcement:** Mandatory *Billing Tags* (Environment, CostCenter) must be generated for all AWS resources.
3. **Shift-Left Security:** Local hooks will intercept AI outputs to enforce code formatting, while Custom Read-Only Agents will act as security auditors before any code is committed.

## Consequences
- **Positive:** Guarantees that AI-generated code and infrastructure are production-ready, secure, and financially trackable.
- **Negative:** Imposes constraints on the AI, requiring precise prompt engineering to avoid conflicts with established steering rules.
