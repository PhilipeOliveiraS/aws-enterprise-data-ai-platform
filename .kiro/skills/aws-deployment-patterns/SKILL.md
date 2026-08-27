---
name: aws-deployment-patterns
description: Reference enterprise AWS architecture patterns for containerless Bun deployments, ALB configuration, CloudFront caching, and private VPC setups.
---
# Enterprise AWS Deployment Patterns

## When to Use
- Designing or troubleshooting CloudFront origin policies and ALB forwarding.
- Configuring private EC2 subnets with NAT Gateway egress.
- Verifying least-privilege IAM roles and IMDSv2 metadata enforcement.

## Architectural Rules
1. Ingress path: CloudFront (HTTPS) -> ALB (Public Subnets) -> EC2 (Private Subnet).
2. Compute access: Strictly AWS SSM Session Manager (Port 22 disabled).
3. Tag enforcement: `Project=taskiro`, `Environment=demo`, `CostCenter=TASKIRO-AI-LAB`.
