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

---

## Addendum: Real-Time Architectural Audit (2026-08-26)

This addendum records a real-time audit of our stack against current advisories and
best practices. Versions audited (from lockfiles): React 19.2.x, ElysiaJS 1.4.30,
Bun 1.4.0, Terraform AWS provider `~> 5.0`. Findings are evidence-based; external
sources are linked at the end. Content was rephrased for compliance with licensing
restrictions.

### 1. Security & Compliance

**React 19 — Server Components advisories (NOT APPLICABLE to us).**
A cluster of high-impact advisories affects React Server Components (RSC) and Server
Functions: a pre-auth RCE (CVE-2025-55182), a source-code-exposure issue
(CVE-2025-55183), and multiple denial-of-service issues (CVE-2025-55184,
CVE-2025-67779, CVE-2026-23864). These are triggered through Server Function
endpoints and only affect apps built on a framework/bundler that supports RSC
(e.g. Next.js). Our frontend is a **Vite client-only SPA** — a code search confirmed
no `use server`, `react-server`, or `server-dom` usage — so these vulnerabilities do
not apply. Action: keep React patched and do not adopt RSC/Server Functions without
re-reviewing these advisories.

**ElysiaJS 1.4.x — patch currency matters.**
Advisories have been reported against Elysia including a prototype-pollution issue
(CVE-2025-66456) and denial-of-service issues fixed in the 1.4.x line
(CVE-2026-56669, CVE-2026-30837 ReDoS). We run 1.4.30. Action: stay on the latest
1.4.x patch and monitor the advisory feed. Recommended hardening: add security
response headers (an Elysia "helmet"-style middleware) and keep strict input schema
validation on every route (we already use `t.Object` schemas).

**Bun SQLite WAL — durability tuning.**
WAL lets readers and writers proceed concurrently, but WAL alone still defaults to
`synchronous=FULL`, which forces a disk flush per commit and negates most of WAL's
throughput benefit. The widely recommended production pairing is
`PRAGMA journal_mode = WAL` **plus** `PRAGMA synchronous = NORMAL` (documented as a
large TPS improvement with good durability). Our `backend/src/db.ts` sets WAL and
`foreign_keys = ON` but not `synchronous = NORMAL`.
- Recommended: add `PRAGMA synchronous = NORMAL;` and `PRAGMA busy_timeout = 5000;`
  (brief wait for the single writer), and keep transactions short.
- Operational: WAL adds `-wal`/`-shm` sidecar files and needs periodic checkpointing;
  ensure the EBS-backed backup path captures a checkpointed database.

### 2. AWS & Terraform Best Practices (provider v5.x)

**Aligned with current guidance:**
- **Three-tier SG isolation** — ALB faces the internet; EC2 accepts traffic only from
  the ALB security group (referenced by SG id, not CIDR). This matches the
  recommended layered pattern.
- **Standalone SG rules** — we use `aws_vpc_security_group_ingress_rule` /
  `..._egress_rule` as separate resources with explicit egress, which is the current
  recommendation over inline rules.
- **Private compute** — EC2 has no public IP and reaches the internet via NAT; matches
  private-subnet best practice.

**Recommended improvements:**
- **CloudFront `forwarded_values` is deprecated.** Our `compute.tf` uses the legacy
  `forwarded_values` block. AWS and the Terraform AWS provider recommend replacing it
  with `aws_cloudfront_cache_policy` (via `cache_policy_id`) and
  `aws_cloudfront_origin_request_policy` (via `origin_request_policy_id`). Practical
  mapping for our two behaviors: use the managed **CachingDisabled** policy for the
  default (API/dynamic) behavior and a **CachingOptimized**-style policy for
  `/assets/*` (static). Note the two are mutually exclusive — a behavior cannot set
  both `forwarded_values` and a cache policy.
- **IAM roles over keys** — per AWS prescriptive guidance, prefer IAM roles
  (temporary, auto-rotating credentials) for the EC2 instance profile and any
  automation, avoiding long-lived access keys.
- **Remote state** — a dev-local state file risks drift; consider an S3 + DynamoDB
  (or S3 native locking) backend before sharing this environment.

### 3. Referenced External Sources

Security advisories:
- React RSC RCE — CVE-2025-55182: https://github.com/advisories/GHSA-fv66-9v8q-g76r
- React RSC DoS / source exposure: https://react.dev/blog/2025/12/11/denial-of-service-and-source-code-exposure-in-react-server-components
- React RSC DoS — CVE-2026-23864: https://github.com/advisories/GHSA-83fc-fqcc-2hmg
- Elysia prototype pollution — CVE-2025-66456: https://www.sentinelone.com/vulnerability-database/cve-2025-66456/
- Elysia DoS — CVE-2026-56669: https://www.sentinelone.com/vulnerability-database/cve-2026-56669/
- Elysia ReDoS — CVE-2026-30837: https://www.sentinelone.com/vulnerability-database/cve-2026-30837/
- Elysia security-headers middleware: https://github.com/aashahin/elysiajs-helmet

SQLite / WAL:
- Official WAL documentation: https://www.sqlite.org/wal.html
- WAL + synchronous=NORMAL throughput benchmark: https://travishorn.com/a-hands-on-exploration-of-sqlite-for-production/
- SQLite production failure modes: https://ark.marianposaceanu.com/sqlite-production-failure-modes

AWS / Terraform:
- AWS Prescriptive Guidance — Terraform AWS Provider best practices: https://docs.aws.amazon.com/prescriptive-guidance/latest/terraform-aws-provider-best-practices/security.html
- Managing AWS security groups with Terraform: https://spacelift.io/blog/terraform-security-group
- CloudFront managed cache policies: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-cache-policies.html
- CloudFront `forwarded_values` deprecation (provider issue #30328): https://github.com/hashicorp/terraform-provider-aws/issues/30328

### Audit Consequences
- **Positive:** No applicable critical CVEs given our client-only React SPA; core AWS
  security posture (private EC2, ALB-only ingress, standalone SG rules) aligns with
  current best practice.
- **Action items:** (1) add `synchronous = NORMAL` + `busy_timeout` pragmas;
  (2) migrate CloudFront to managed cache policies (retire `forwarded_values`);
  (3) track Elysia 1.4.x patches and add security headers; (4) adopt IAM roles and a
  remote state backend before promoting beyond dev.
