# AWS Enterprise Architecture & FinOps Standards

## 1. Architectural Patterns (Serverless-First)
- **Always** favor Serverless architectures (AWS Lambda, Amazon API Gateway, Amazon DynamoDB, Amazon EventBridge, Amazon S3, Amazon Athena) to minimize idle compute costs.
- Do **not** provision Amazon EC2 instances, RDS clusters, or NAT Gateways unless explicitly requested. 
- Data processing workloads must output analytical data in **Parquet** format and store it in Amazon S3.

## 2. Security & DevSecOps (Least Privilege)
- **Never** use wildcard (`"*"`) permissions in IAM Policies or S3 Bucket Policies.
- **Always** enable AWS KMS encryption (SSE-KMS) for data at rest (S3, DynamoDB, SQS).
- Do not expose credentials, API Keys, or secrets in code. Use AWS Secrets Manager or AWS Systems Manager Parameter Store.

## 3. FinOps & Cost Allocation
- Every AWS resource capable of being tagged **must** include the following mandatory tags via Terraform `default_tags`:
  - `Environment` (e.g., dev, staging, prod)
  - `CostCenter` (e.g., DATA-AI-PLATFORM)
  - `ManagedBy` (e.g., Kiro-Agent)

## 4. Coding Standards
- **Terraform:** Use modular structures. Always declare variables with type constraints.
- **Python (Data Pipelines):** Use Type Hints. Include Docstrings for all functions. Rely on `boto3` for AWS integrations.
