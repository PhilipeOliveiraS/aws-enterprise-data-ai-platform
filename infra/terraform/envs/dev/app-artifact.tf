################################################################################
# TasKiro — Dedicated Application Artifact Packaging & Storage
################################################################################

resource "random_id" "artifact_suffix" {
  byte_length = 4
}

resource "aws_s3_bucket" "artifacts" {
  bucket        = "${var.project_name}-app-artifacts-${random_id.artifact_suffix.hex}"
  force_destroy = true

  tags = {
    Name = "${var.project_name}-app-artifacts"
  }
}

resource "aws_s3_bucket_public_access_block" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

data "archive_file" "backend" {
  type        = "zip"
  source_dir  = "${path.module}/../../../../backend"
  output_path = "${path.module}/.artifacts/backend.zip"

  excludes = [
    "node_modules",
    ".env",
    "taskiro.sqlite",
    "taskiro.sqlite-shm",
    "taskiro.sqlite-wal",
    "bun.lock",
  ]
}

resource "aws_s3_object" "app_artifact" {
  bucket = aws_s3_bucket.artifacts.id
  key    = "artifacts/backend-${data.archive_file.backend.output_md5}.zip"
  source = data.archive_file.backend.output_path
  etag   = data.archive_file.backend.output_md5

  tags = {
    Name = "${var.project_name}-backend-artifact"
  }
}
