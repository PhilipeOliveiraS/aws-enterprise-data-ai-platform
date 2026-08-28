---
author: Philipe Oliveira
role: Cloud Platform Engineer & AI Specialist
date: 2026-08-28
status: accepted
tags: [AWS S3, AWS KMS, Terraform, FinOps, DevSecOps, Model Context Protocol, MCP, Cloud Platform Engineering, IaC]
---

# ADR 0003: Provisioning Enterprise S3 Document Store with Dedicated KMS & FinOps Lifecycle

## 1. Context and Technological Challenge
As **TasKiro** expands its enterprise capabilities, there is an immediate requirement to support persistent attachments, audit logs, and analytical document storage. While task metadata remains managed by the high-performance `bun:sqlite` engine, physical files require dedicated, scalable object storage.

The architectural challenge involved:
1. Enforcing enterprise-grade encryption and access governance (WORM, zero public access) for document storage without operational overhead.
2. Integrating automated FinOps lifecycle policies to minimize long-term storage costs.
3. Leveraging the **AWS Documentation MCP Server** to perform real-time verification of 2026 AWS security baselines and automatically synthesize Terraform configurations.

## 2. Architectural Decision
We architected and implemented the **TasKiro Enterprise Document Store** using Terraform (`infra/terraform/envs/dev/s3-document-store.tf`) with the following technical specifications:

* **Customer Managed Key (AWS KMS CMK):** Dedicated KMS key with automatic rotation, enforcing server-side encryption (`SSE-KMS`) on all objects and preventing unencrypted transmissions by denying non-TLS traffic (`aws:SecureTransport = false`).
* **S3 Security & Isolation:** Enabled `aws_s3_bucket_public_access_block` (blocking all public ACLs and policies) combined with bucket versioning for data durability.
* **FinOps Lifecycle Transitions:** Automated cost-optimization rules transitioning non-current versions to `STANDARD_IA` after 30 days and archiving to `GLACIER` after 90 days.
* **Autonomous IaC Generation via MCP:** Utilized the Kiro agent integrated with `awslabs.aws-documentation-mcp-server` to query official AWS documentation in real time, validating construct attributes against up-to-date compliance standards prior to Terraform generation.

## 3. Business Consequences and Strategic Benefits
Aligned with the *AWS Well-Architected Framework* (Security, Reliability, and Cost Optimization pillars):

* **DevSecOps & Data Protection:** Dedicated KMS isolation ensures separation of duties, comprehensive CloudTrail auditing, and zero risk of accidental public exposure.
* **FinOps Efficiency:** Predictable storage cost control through automatic tiering reduces long-term archive expenses by up to 80% without manual intervention.
* **Agentic IaC Governance:** Demonstrates practical autonomous infrastructure delivery—leveraging MCP tooling to eliminate static training hallucination and enforce compliance-by-code at generation time.
