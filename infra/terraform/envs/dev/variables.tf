################################################################################
# TasKiro — Dev Environment Variables
################################################################################

variable "aws_region" {
  description = "AWS region for all resources."
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project identifier used in resource naming."
  type        = string
  default     = "taskiro"
}

variable "environment" {
  description = "Deployment environment (maps to the mandatory Environment tag)."
  type        = string
  default     = "Production"
}

# ─── Networking ───────────────────────────────────────────────────────────────

variable "vpc_cidr" {
  description = "CIDR block for the VPC."
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for the two public subnets (one per AZ)."
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for the two private subnets (one per AZ)."
  type        = list(string)
  default     = ["10.0.10.0/24", "10.0.11.0/24"]
}

variable "availability_zones" {
  description = "Two AZs for high-availability placement."
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
}

# ─── Compute ──────────────────────────────────────────────────────────────────

variable "instance_type" {
  description = "EC2 instance type for the TasKiro application server."
  type        = string
  default     = "t3.small"
}

variable "key_pair_name" {
  description = "Name of an existing EC2 Key Pair for SSH access (via bastion / SSM)."
  type        = string
  default     = ""
}

variable "ebs_volume_size" {
  description = "Size (GiB) of the dedicated EBS volume for the SQLite database."
  type        = number
  default     = 20
}

variable "ebs_volume_type" {
  description = "EBS volume type (gp3 recommended for cost-performance)."
  type        = string
  default     = "gp3"
}

# ─── Application ──────────────────────────────────────────────────────────────

variable "app_port" {
  description = "Port exposed by the ElysiaJS backend inside the EC2 instance."
  type        = number
  default     = 3000
}
