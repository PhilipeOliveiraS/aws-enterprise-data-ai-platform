################################################################################
# TasKiro — Security Groups (Least Privilege)
################################################################################

resource "aws_security_group" "alb" {
  name        = "${var.project_name}-alb-sg"
  description = "Allow inbound HTTP/HTTPS to the ALB from CloudFront only."
  vpc_id      = aws_vpc.main.id

  tags = {
    Name = "${var.project_name}-alb-sg"
  }
}

resource "aws_vpc_security_group_ingress_rule" "alb_http_cloudfront" {
  security_group_id = aws_security_group.alb.id
  description       = "Allow HTTP from CloudFront origin-facing ranges only"
  prefix_list_id    = var.cloudfront_origin_prefix_list_id
  from_port         = 80
  to_port           = 80
  ip_protocol       = "tcp"
}

resource "aws_vpc_security_group_egress_rule" "alb_egress" {
  security_group_id = aws_security_group.alb.id
  description       = "Allow all outbound from ALB (health checks + forwarding)"
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
}

resource "aws_security_group" "ec2" {
  name        = "${var.project_name}-ec2-sg"
  description = "Allow inbound ONLY from the ALB on the app port."
  vpc_id      = aws_vpc.main.id

  tags = {
    Name = "${var.project_name}-ec2-sg"
  }
}

resource "aws_vpc_security_group_ingress_rule" "ec2_from_alb" {
  security_group_id            = aws_security_group.ec2.id
  description                  = "App port from ALB only"
  referenced_security_group_id = aws_security_group.alb.id
  from_port                    = var.app_port
  to_port                      = var.app_port
  ip_protocol                  = "tcp"
}

resource "aws_vpc_security_group_egress_rule" "ec2_egress" {
  security_group_id = aws_security_group.ec2.id
  description       = "Allow all outbound (package updates + S3 via NAT Gateway)"
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
}
