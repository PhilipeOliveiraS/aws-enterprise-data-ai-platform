# ADR 0004: Security Waiver / Risk Acceptance — S3 Document Store (Temporary Lab Sandbox)

## Status
Accepted — **conditional, time-boxed waiver** (temporary sandbox only)

## Scope
- **Resource:** `infra/terraform/envs/dev/s3-document-store.tf` (TasKiro Enterprise Document Store S3 bucket) and the related `provider "aws"` block in `main.tf`.
- **Environment:** AWS Event Engine **workshop / sandbox account only**, assumed role `WSParticipantRole`.
- **Explicitly NOT applicable to:** any long-lived `dev`, `staging`, or `production` account. This waiver does not amend the standing DevSecOps/FinOps baseline in ADR 0001 or the workspace steering rules — it is an exception scoped to a throwaway lab.

## Context
This deployment runs inside a heavily constrained, temporary AWS Event Engine account whose `WSParticipantRole` carries Service Control Policies (SCPs) with explicit denies. The reported denies are:
`kms:CreateKey`, `kms:TagResource`, `s3:GetBucketTagging`, `s3:GetBucketAcl`.

To let `terraform apply` succeed under these limits, the module was intentionally downgraded from the hardened baseline (documented in the prior security audit). This ADR records that decision as a formal risk acceptance so the divergence is visible and auditable rather than silent.

## Decision
We accept the following deviations from the standard baseline **for the lifetime of this lab account only**. The code is left as-is; nothing is reverted.

| # | Deviation (current state) | Justification | SCP-forced? |
|---|---|---|---|
| 1 | **SSE-S3 (`AES256`) instead of SSE-KMS with a Customer Managed Key** — no `aws_kms_key`, no rotation, no key policy | `kms:CreateKey` and `kms:TagResource` are explicitly denied, so a CMK cannot be created or tagged. SSE-S3 is the correct fallback and still encrypts all objects at rest by default. | ✅ Yes — genuinely SCP-forced |
| 2 | **No resource tags** (bucket) and **`default_tags` removed** from the provider — FinOps tags `Environment` / `CostCenter=TASKIRO-AI-LAB` / `ManagedBy=Kiro-Agent` are absent | Accepted for the sandbox. **See caveat below** — the listed S3 denies are *read* actions, so this may be broader than strictly required. | ⚠️ Partially — see caveat |
| 3 | **`skip_metadata_api_check = true`** on the provider | Operational convenience for the lab runner. | ❌ No — not SCP-forced (documented as convenience) |
| 4 | **`force_destroy = true`** on the bucket | Enables clean teardown of the throwaway lab bucket without manual object purging. Acceptable only because the data is disposable lab content. | ❌ No — lab-lifecycle convenience |

### Honest caveats on the justifications
So this record stays defensible under review, the following nuances are noted rather than glossed over:

- **The two S3 denies (`s3:GetBucketTagging`, `s3:GetBucketAcl`) are READ actions.** They block *reading* tagging/ACL state, not *writing* it. They do **not**, by themselves, prevent `PutBucketTagging` or provider `default_tags` at create time. If tag *writes* are also blocked, the relevant deny would be `s3:PutBucketTagging` (not listed). The removal of tags is therefore accepted as a sandbox simplification, but it is **not fully explained** by the SCPs as stated. Cost allocation for this bucket will be unlabeled for the lab's duration.
- **`skip_metadata_api_check = true` is not a permissions workaround.** No SCP requires it; it only stops Terraform from probing IMDS for credentials. It is harmless here but is recorded as convenience, not necessity.
- **The CMK downgrade (item 1) is the one deviation that genuinely follows from the SCPs.**

## Permitted Baseline — Confirmed Active
The following controls remain fully implemented and were confirmed by `terraform validate` (configuration valid, formatted). These are **not** waived and represent the security floor even in the sandbox:

- ✅ **Public Access Block** — all four flags (`block_public_acls`, `block_public_policy`, `ignore_public_acls`, `restrict_public_buckets`) set to `true`. The bucket is not publicly accessible.
- ✅ **Versioning** — enabled (`status = "Enabled"`).
- ✅ **Lifecycle / FinOps tiering** — noncurrent versions transition to `STANDARD_IA` after 30 days and to `GLACIER` after 90 days.
- ✅ **Encryption at rest** — present via SSE-S3 (`AES256`); every object is still encrypted, just with AWS-managed keys rather than a CMK.
- ✅ **Unique bucket name** — via `random_string` suffix.

## Consequences
- **Positive:** The module deploys successfully within the lab's SCP constraints while preserving public-access blocking, versioning, at-rest encryption, and FinOps lifecycle rules.
- **Negative / accepted risk:** No customer-controlled key (no key-policy revocation or `kms:Decrypt` audit trail), no cost-allocation tags, weaker teardown protection (`force_destroy`), and no TLS-only bucket policy. These are tolerated **only** because the account is temporary and holds disposable lab data.

## Expiry & Re-Hardening Trigger
- **Valid only while** the temporary Event Engine account exists. This waiver **expires with the sandbox** and must not be carried into any persistent environment.
- **Before promoting this module to any real `dev`/`staging`/`prod` account**, the hardened baseline MUST be restored: CMK + SSE-KMS with rotation and S3 Bucket Keys, mandatory FinOps tags + provider `default_tags`, removal of `force_destroy`, a TLS-only (`aws:SecureTransport=false` deny) bucket policy, and explicit `BucketOwnerEnforced` ownership controls. (These were present in the original hardened draft.)

## References
- ADR 0001 — FinOps & DevSecOps Governance (standing baseline this waiver excepts).
- Prior security audit of `s3-document-store.tf` (source of the deviation list).
- `.kiro/steering` — infra-standards (FinOps tags, managed policies) and company-security (encryption, least privilege).
