# Enterprise Architecture & Coding Standards

## 1. Technology Stack
- **Frontend:** React 19, Tailwind CSS v4, shadcn/ui.
- **Backend:** ElysiaJS (REST API) running on Bun.
- **Database:** `bun:sqlite` (Native Bun SQLite).
- **Authentication:** JWT with hashed passwords (`Bun.password`).

## 2. AWS Infrastructure Guidelines
- **Architecture Pattern:** The application must be deployed using Amazon CloudFront -> Application Load Balancer (ALB) -> EC2 Instances in Private Subnets.
- **Egress:** Use a NAT Gateway for outbound traffic from the private EC2 instances.
- **Storage:** The SQLite database must reside on an attached EBS volume.
- **Security:** EC2 instances must NEVER have public IP addresses. Security Groups must strictly limit traffic (e.g., ALB only communicates with EC2 on specific ports).

## 3. FinOps & Cost Allocation
- Every generated AWS resource (e.g., EC2, VPC, ALB) must include the following mandatory tags:
  - `Environment: Production`
  - `CostCenter: TASKIRO-AI-LAB`
  - `ManagedBy: Kiro-Agent`

## 4. Coding Standards
- Implement clean, modular components.
- Ensure all API endpoints handle errors gracefully and return appropriate HTTP status codes.
- Do not hardcode secrets or AWS credentials.
