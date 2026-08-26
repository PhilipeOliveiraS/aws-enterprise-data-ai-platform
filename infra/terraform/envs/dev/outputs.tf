################################################################################
# TasKiro — Outputs
################################################################################

output "vpc_id" {
  description = "The ID of the TasKiro VPC."
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "IDs of the public subnets (ALB placement)."
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "IDs of the private subnets (EC2 placement)."
  value       = aws_subnet.private[*].id
}

output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer."
  value       = aws_lb.app.dns_name
}

output "alb_arn" {
  description = "ARN of the Application Load Balancer."
  value       = aws_lb.app.arn
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain (public entry point)."
  value       = aws_cloudfront_distribution.app.domain_name
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID (for cache invalidation)."
  value       = aws_cloudfront_distribution.app.id
}

output "ec2_instance_id" {
  description = "ID of the TasKiro application EC2 instance."
  value       = aws_instance.app.id
}

output "ec2_private_ip" {
  description = "Private IP of the EC2 instance (no public IP by design)."
  value       = aws_instance.app.private_ip
}

output "ebs_volume_id" {
  description = "ID of the EBS data volume for SQLite persistence."
  value       = aws_ebs_volume.data.id
}
