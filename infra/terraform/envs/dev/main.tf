################################################################################
# TasKiro — Dev Environment — Provider & Backend
################################################################################

terraform {
  required_version = ">= 1.6"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Environment = var.environment
      CostCenter  = "TASKIRO-AI-LAB"
      ManagedBy   = "Kiro-Agent"
    }
  }
}
