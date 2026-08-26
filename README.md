# AWS Enterprise Data & AI Platform

This repository consolidates the architecture and implementation of an event-driven data platform on AWS, orchestrated by Artificial Intelligence agents with strict enterprise governance.

## Overview and Demonstrated Capabilities

This project acts as an advanced engineering laboratory, highlighting proficiency in the following disciplines:

*   **AI Solutions Architecture & AI Engineering:** AI Agents orchestration (Kiro / Model Context Protocol) with context injection via Steering and Custom Agents.
*   **Data Engineering:** Construction of serverless ETL pipelines for data ingestion and transformation.
*   **Data Science & Machine Learning:** Structuring environments for training and inference of predictive models.
*   **Cloud Platform Engineering:** Cross-Platform approach with provisioning via Terraform (IaC) and containerization via Docker.
*   **DevSecOps & FinOps:** Implementation of Agent Hooks for static security validation (Shift-Left Security), application of *Least Privilege* principles in IAM, and enforcement of low-cost Serverless architectures.

## Directory Architecture
- `docs/adr/`: Architecture Decision Records documenting trade-offs and executive decisions.
- `infra/`: Immutable infrastructure divided between Terraform environments and Docker images.
- `src/`: Source code isolated by domain (Data Pipelines and ML Models).
- `.kiro/`: AI Governance (Steering, Hooks, and Restricted Agents).
- `.github/workflows/`: Headless automation for CI/CD.
