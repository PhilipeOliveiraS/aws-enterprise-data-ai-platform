################################################################################
# TasKiro — Outputs
################################################################################

output "document_store_bucket_name" {
  description = "Name of the S3 bucket for task attachments"
  value       = aws_s3_bucket.docs.id
}

output "document_store_bucket_arn" {
  description = "ARN of the S3 bucket for task attachments"
  value       = aws_s3_bucket.docs.arn
}