---
inclusion: always
---
# Technical Stack & Coding Guidelines

## Tech Stack
- **Runtime & Toolchain**: Bun (>= 1.2.0) for execution, package management, and test running.
- **Frontend**: React 19, TypeScript (strict mode), Tailwind CSS v4, and shadcn/ui design tokens.
- **Backend**: ElysiaJS REST API with end-to-end typed schema validation.
- **Database**: Native `bun:sqlite` with Write-Ahead Logging (`WAL`), `synchronous = NORMAL`, and `busy_timeout = 5000`.
- **Infrastructure**: HashiCorp Terraform targeting AWS Provider v5.x (CloudFront, ALB, Private EC2, EBS).

## Engineering Standards
- **Strict Typing**: No explicit `any`. Ensure total compile-time safety across frontend and backend DTOs.
- **Error Handling**: Standardized HTTP status codes (400 for bad payloads, 401 for unauthorized access, 404 for missing resources).
- **Zero Hardcoded Secrets**: Secrets must only be sourced via environment variables (`.env`).
