terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}

provider "aws" {
  region = var.region
}

resource "aws_s3_bucket" "app_logs" {
  bucket = "${var.project}-logs-${var.env}-${random_id.suffix.hex}"
}

resource "random_id" "suffix" { byte_length = 2 }

resource "aws_ecr_repository" "backend" {
  name = "${var.project}/backend"
}

resource "aws_ecr_repository" "frontend" {
  name = "${var.project}/frontend"
}

output "ecr_backend" { value = aws_ecr_repository.backend.repository_url }
output "ecr_frontend" { value = aws_ecr_repository.frontend.repository_url }
output "logs_bucket" { value = aws_s3_bucket.app_logs.bucket }
