# 🧠 Agentic Governance & Custom Powers

On this platform, the AI agent does not operate generically. We built taskiro-cloud-power, a custom Power that injects corporate context and constrains the agent's decisions through Steering Guides — behavioral directives injected into the system prompt.

This ensures that all generated code and provisioned infrastructure are born compliant with company policy, rather than audited after the fact.

## 📂 Steering Structure (Agent Direction)

Steering files live in .kiro/powers/taskiro-cloud-power/steering/ and act as immutable "laws" for the AI:

### 1. security-baseline.md (DevSecOps & Hardening)

Defines non-negotiable infrastructure security rules:

* S3 Isolation: Requires aws_s3_bucket_public_access_block with all four restrictive flags enabled.
* Encryption at Rest: Enforces Customer Managed Keys (AWS KMS) with annual rotation enabled.
* In-Transit Encryption: Rejects requests where aws:SecureTransport = false.

### 2. finops-rules.md (Cloud Cost Optimization)

Ensures the AI prioritizes financial efficiency in its code recommendations:

* Serverless-first sizing (e.g., Aurora Serverless v2, AWS Lambda).
* Automatic retention and lifecycle rules for logs (CloudWatch) and objects (S3).
* Prevents over-provisioning during prototyping.

### 3. adr-governance.md (Architectural Decision Records)

Standardizes the recording of engineering decisions. The agent is instructed to:

* Automatically document structural changes.
* Analyze the context, discarded options, and consequences of each technical choice.
* Keep the project's history traceable for audits.

## 🚀 Hybrid Integration: Custom Power + External MCPs

taskiro-cloud-power acts as the orchestrating brain, dictating how things should be done, while third-party MCP servers act as the operational "arms":

* Queries the Terraform Registry while respecting the security baseline.
* Stores ADRs and architectural decisions in persistent semantic memory (power-qdrant-qdrant), letting the AI retrieve past decisions via Retrieval-Augmented Generation (RAG).
* Reads and audits repository history via git-platform and task metadata via sqlite-taskiro.

Global, cross-power conventions (API, infrastructure, AWS, product, and tech standards) live separately in .kiro/steering/, and are intentionally kept apart from this Power's scoped rules — see the header comment in .kiro/steering/adr-standards.md for the rationale.
