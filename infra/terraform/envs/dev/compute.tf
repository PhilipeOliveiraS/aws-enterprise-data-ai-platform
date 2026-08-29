################################################################################
# TasKiro — Compute, Load Balancing & CDN
################################################################################

data "aws_ami" "al2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-2023.*-arm64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }

  filter {
    name   = "architecture"
    values = ["arm64"]
  }
}

resource "aws_instance" "app" {
  ami                    = data.aws_ami.al2023.id
  instance_type          = var.instance_type
  subnet_id              = aws_subnet.private[0].id
  vpc_security_group_ids = [aws_security_group.ec2.id]
  iam_instance_profile   = aws_iam_instance_profile.ec2.name

  associate_public_ip_address = false
  key_name                    = var.key_pair_name != "" ? var.key_pair_name : null

  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 1
    instance_metadata_tags      = "disabled"
  }

  root_block_device {
    volume_type           = "gp3"
    volume_size           = 10
    encrypted             = true
    delete_on_termination = true
  }

  user_data_replace_on_change = true

  user_data = base64encode(<<-EOF
    #!/bin/bash
    set -euo pipefail
    exec > >(tee /var/log/taskiro-bootstrap.log) 2>&1

    echo "[taskiro] Starting bootstrap at $(date -u)"

    DATA_DEV=""
    for dev in /dev/xvdf /dev/nvme1n1; do
      if [ -b "$dev" ]; then DATA_DEV="$dev"; break; fi
    done
    while [ -z "$DATA_DEV" ]; do
      sleep 2
      for dev in /dev/xvdf /dev/nvme1n1; do
        if [ -b "$dev" ]; then DATA_DEV="$dev"; break; fi
      done
    done
    echo "[taskiro] Data volume: $DATA_DEV"

    if ! blkid "$DATA_DEV"; then
      mkfs.ext4 -L taskiro-data "$DATA_DEV"
    fi

    mkdir -p /opt/taskiro/data
    mount "$DATA_DEV" /opt/taskiro/data
    grep -q "/opt/taskiro/data" /etc/fstab || \
      echo "LABEL=taskiro-data /opt/taskiro/data ext4 defaults,nofail 0 2" >> /etc/fstab

    dnf install -y unzip tar >/dev/null 2>&1 || yum install -y unzip tar

    export BUN_INSTALL=/opt/bun
    curl -fsSL https://bun.sh/install | bash
    ln -sf /opt/bun/bin/bun /usr/local/bin/bun

    REGION=$(curl -s -H "X-aws-ec2-metadata-token: $(curl -s -X PUT 'http://169.254.169.254/latest/api/token' -H 'X-aws-ec2-metadata-token-ttl-seconds: 60')" http://169.254.169.254/latest/meta-data/placement/region)
    mkdir -p /opt/taskiro/app
    aws s3 cp "s3://${aws_s3_bucket.artifacts.id}/${aws_s3_object.app_artifact.key}" /tmp/backend.zip --region "$REGION"
    unzip -o /tmp/backend.zip -d /opt/taskiro/app
    rm -f /tmp/backend.zip

    cd /opt/taskiro/app
    /usr/local/bin/bun install --production

    ENV_FILE=/opt/taskiro/taskiro.env
    if [ ! -f "$ENV_FILE" ]; then
      JWT_SECRET=$(openssl rand -hex 48)
      cat > "$ENV_FILE" <<ENVEOF
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=7d
PORT=${var.app_port}
DB_PATH=/opt/taskiro/data/taskiro.sqlite
CORS_ORIGINS=https://${aws_cloudfront_distribution.app.domain_name}
ENVEOF
      chmod 600 "$ENV_FILE"
    fi

    cat > /etc/systemd/system/taskiro.service <<UNITEOF
[Unit]
Description=TasKiro API (Bun/ElysiaJS)
After=network-online.target opt-taskiro-data.mount
Wants=network-online.target

[Service]
Type=simple
EnvironmentFile=/opt/taskiro/taskiro.env
WorkingDirectory=/opt/taskiro/data
ExecStart=/usr/local/bin/bun run /opt/taskiro/app/src/index.ts
Restart=always
RestartSec=3
User=root

[Install]
WantedBy=multi-user.target
UNITEOF

    systemctl daemon-reload
    systemctl enable --now taskiro.service

    echo "[taskiro] Bootstrap complete at $(date -u)"
  EOF
  )

  tags = {
    Name = "${var.project_name}-app-server"
  }

  depends_on = [
    aws_s3_object.app_artifact,
    aws_cloudfront_distribution.app,
  ]
}

resource "aws_ebs_volume" "data" {
  availability_zone = var.availability_zones[0]
  size              = var.ebs_volume_size
  type              = var.ebs_volume_type
  encrypted         = true

  tags = {
    Name = "${var.project_name}-data-volume"
  }
}

resource "aws_volume_attachment" "data" {
  device_name = "/dev/xvdf"
  volume_id   = aws_ebs_volume.data.id
  instance_id = aws_instance.app.id
}

resource "aws_lb" "app" {
  name               = "${var.project_name}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  tags = {
    Name = "${var.project_name}-alb"
  }
}

resource "aws_lb_target_group" "app" {
  name     = "${var.project_name}-tg"
  port     = var.app_port
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id

  health_check {
    enabled             = true
    path                = "/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200"
  }

  tags = {
    Name = "${var.project_name}-tg"
  }
}

resource "aws_lb_target_group_attachment" "app" {
  target_group_arn = aws_lb_target_group.app.arn
  target_id        = aws_instance.app.id
  port             = var.app_port
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.app.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }

  tags = {
    Name = "${var.project_name}-listener-http"
  }
}

resource "aws_cloudfront_distribution" "app" {
  enabled             = true
  comment             = "TasKiro CDN - edge cache + SSL termination"
  default_root_object = ""
  price_class         = "PriceClass_100"

  origin {
    domain_name = aws_lb.app.dns_name
    origin_id   = "alb-origin"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    target_origin_id       = "alb-origin"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods         = ["GET", "HEAD", "OPTIONS"]
    compress               = true

    cache_policy_id          = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"
    origin_request_policy_id = "216adef6-5c7f-47e4-b989-5492eafa07d3"
  }

  ordered_cache_behavior {
    path_pattern           = "/assets/*"
    target_origin_id       = "alb-origin"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD", "OPTIONS"]
    compress               = true

    cache_policy_id = "658327ea-f89d-4fab-a63d-7e88637488eb"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Name = "${var.project_name}-cloudfront"
  }
}
