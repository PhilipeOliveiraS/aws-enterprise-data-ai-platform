################################################################################
# TasKiro — IAM: EC2 Instance Role, Profile & Least-Privilege Policies
################################################################################

data "aws_iam_policy_document" "ec2_assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "ec2" {
  name               = "${var.project_name}-ec2-role"
  assume_role_policy = data.aws_iam_policy_document.ec2_assume_role.json

  tags = {
    Name = "${var.project_name}-ec2-role"
  }
}

resource "aws_iam_role_policy_attachment" "ssm_core" {
  role       = aws_iam_role.ec2.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

data "aws_iam_policy_document" "artifact_read" {
  statement {
    sid     = "ReadAppArtifact"
    effect  = "Allow"
    actions = ["s3:GetObject"]
    resources = [
      "${aws_s3_bucket.artifacts.arn}/${aws_s3_object.app_artifact.key}",
    ]
  }

  statement {
    sid       = "ListArtifactBucket"
    effect    = "Allow"
    actions   = ["s3:ListBucket"]
    resources = [aws_s3_bucket.artifacts.arn]

    condition {
      test     = "StringLike"
      variable = "s3:prefix"
      values   = ["artifacts/*"]
    }
  }
}

resource "aws_iam_role_policy" "artifact_read" {
  name   = "${var.project_name}-artifact-read"
  role   = aws_iam_role.ec2.id
  policy = data.aws_iam_policy_document.artifact_read.json
}

resource "aws_iam_instance_profile" "ec2" {
  name = "${var.project_name}-ec2-profile"
  role = aws_iam_role.ec2.name

  tags = {
    Name = "${var.project_name}-ec2-profile"
  }
}
