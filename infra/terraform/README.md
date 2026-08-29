# TasKiro Infrastructure as Code (Terraform)

This directory contains the declarative Terraform modules and environment configurations for the TasKiro enterprise platform.

## Architecture Overview
- **Networking:** Multi-AZ VPC with public and private subnets, Internet Gateway, and single NAT Gateway for cost-optimized egress.
- **Compute:** AWS Graviton (`t4g.small` ARM64) EC2 instance running in private subnets with mandatory IMDSv2.
- **Security & Access:** Administration strictly via AWS Systems Manager (SSM Session Manager); ALB ingress locked down to CloudFront managed prefix lists (`pl-3b927c52`).
- **Storage & State:** Dedicated encrypted EBS (`gp3`) volume for SQLite WAL persistence and S3 bucket for application deployment artifacts.
- **Edge:** CloudFront distribution with HTTPS redirection, dynamic route pass-through, and static asset caching.

## Deployment Paths
1. **Agentic Provisioning (Lab Default):** Orchestrated dynamically via Kiro Agent and the `cloud-architect` Power (`call_aws`).
2. **Declarative IaC (Enterprise Production):** Executed via standard Terraform workflow (`terraform init -> plan -> apply`) in environments with full VPC/EBS provisioning privileges.
