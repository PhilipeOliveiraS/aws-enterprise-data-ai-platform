<!-- Power-scoped steering (taskiro-cloud-power only). See .kiro/steering/ for global, cross-power conventions. -->
# DevSecOps & Security Baseline

## S3 Isolation
- Enable `aws_s3_bucket_public_access_block` on all buckets with all 4 flags set to `true`.
- Enforce in-transit encryption by denying requests where `aws:SecureTransport = false`.

## Encryption at Rest
- Default: Customer Managed Key (AWS KMS CMK) with annual rotation enabled.
- Sandbox/Constrained fallback: `AES256` (SSE-S3) documented via formal Security Waiver ADR.
