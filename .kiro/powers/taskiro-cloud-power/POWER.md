---
name: TasKiro Enterprise Cloud & DevSecOps Power
description: Advanced cloud architecture, Terraform automation, FinOps cost-allocation, and DevSecOps governance for TasKiro.
triggers:
  - aws
  - terraform
  - cloud
  - s3
  - kms
  - finops
  - devsecops
  - deploy
  - infrastructure
author: Philipe Oliveira
version: 1.0.0
---

# TasKiro Enterprise Cloud & DevSecOps Power

## Overview
This Power activates automatically whenever infrastructure, cloud platforms, or deployment tasks are referenced. It enforces enterprise-grade C-Level engineering standards, security baselines, and rigorous FinOps governance.

## Core Directives & Behaviors

1. **FinOps Compliance First:**
   - Every AWS resource provisioned via Terraform must include mandatory tagging: `Environment`, `CostCenter = "TASKIRO-AI-LAB"`, and `ManagedBy = "Kiro-Agent"`.
   - Lifecycle rules and storage tiering (e.g., Standard-IA, Glacier) must be evaluated for all data stores.

2. **DevSecOps & Security Baseline:**
   - Enforce least-privilege IAM policies.
   - Mandate encryption at rest using Customer Managed KMS Keys (CMK) with rotation enabled whenever the target environment allows it, or document formal Security Waivers (ADRs) under constraints.
   - Block public access completely (`block_public_acls`, `block_public_policy`, `ignore_public_acls`, `restrict_public_buckets = true`).

3. **Agentic RAG & MCP Integration:**
   - Utilize connected AWS Documentation MCP servers in real time to validate construct attributes against current standards before writing any code.
   - Prioritize modular, clean, and production-ready IaC syntax.

4. **Documentation & Traceability:**
   - All major architectural deviations or constraints must result in a clean Architecture Decision Record (ADR) following the standard YAML frontmatter template.