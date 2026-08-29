################################################################################
# TasKiro — Outputs
################################################################################

# ─── Application endpoints ────────────────────────────────────────────────────

output "cloudfront_domain_name" {
  description = "Public CloudFront domain serving the application (https)."
  value       = aws_cloudfront_distribution.app.domain_name
}

output "cloudfront_url" {
  description = "Full CloudFront URL for the application."
  value       = "https://${aws_cloudfront_distribution.app.domain_name}"
}

output "alb_dns_name" {
  description = "Internal ALB DNS name (origin; reachable from CloudFront only)."
  value       = aws_lb.app.dns_name
}

# ─── Rollback / teardown resource IDs ─────────────────────────────────────────

output "rollback_resource_ids" {
  description = "Key resource IDs for rollback and manual teardown reference."
  value = {
    vpc_id                = aws_vpc.main.id
    public_subnet_ids     = aws_subnet.public[*].id
    private_subnet_ids    = aws_subnet.private[*].id
    internet_gateway_id   = aws_internet_gateway.igw.id
    nat_gateway_id        = aws_nat_gateway.nat.id
    nat_eip_id            = aws_eip.nat.id
    alb_sg_id             = aws_security_group.alb.id
    ec2_sg_id             = aws_security_group.ec2.id
    iam_role_name         = aws_iam_role.ec2.name
    instance_profile_name = aws_iam_instance_profile.ec2.name
    instance_id           = aws_instance.app.id
    data_volume_id        = aws_ebs_volume.data.id
    alb_arn               = aws_lb.app.arn
    target_group_arn      = aws_lb_target_group.app.arn
    cloudfront_dist_id    = aws_cloudfront_distribution.app.id
    artifact_bucket       = aws_s3_bucket.artifacts.id
    artifact_key          = aws_s3_object.app_artifact.key
  }
}

# ─── Artifact Store Outputs ───────────────────────────────────────────────────

output "artifact_bucket_name" {
  description = "Name of the S3 bucket holding the deployment artifact"
  value       = aws_s3_bucket.artifacts.id
}

output "artifact_bucket_arn" {
  description = "ARN of the S3 bucket holding the deployment artifact"
  value       = aws_s3_bucket.artifacts.arn
}
