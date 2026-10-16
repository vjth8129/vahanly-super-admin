#!/usr/bin/env bash
# One script to deploy the super-admin portal to an AWS stack created by the API's
# scripts/aws-deploy.sh (car-wash-apis repo). The portal is static files served by the
# nginx on the API's EC2 instance at https://<host>/admin/, so its "infrastructure" is
# that stack.
#
# Run it with no arguments and it will:
#   1. Print the IAM permissions your access key needs.
#   2. Ask for that access key + secret (or read them from the environment).
#   3. Look up the stack's EC2 instance and Elastic IP, by name tag.
#   4. If the stack doesn't exist yet, offer to create it (API + database + nginx +
#      TLS) by running the API repo's scripts/aws-deploy.sh with the same answers.
#   5. Build the portal and publish it via scripts/deploy-ec2.sh.
#
# Safe to re-run - every run just publishes the current code.
#
# Usage:
#   ./scripts/aws-deploy.sh --show-permissions   # print the IAM policy and exit
#   ./scripts/aws-deploy.sh                      # interactive
#
# Non-interactive, set these in the environment instead of being prompted:
#   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY  - required
#   AWS_REGION   - default: ap-south-1
#   STACK_NAME   - default: carwash (must match the name the API stack was created with)
#   API_REPO     - path to the car-wash-apis checkout (default: ../car-wash-apis), only
#                  used to create a missing stack and to find its saved SSH key
#   SSH_KEY      - path to <stack>-deploy-key.pem; if omitted, the API repo's saved copy
#                  is used, else EC2 Instance Connect

set -euo pipefail

STACK_NAME="${STACK_NAME:-carwash}"
AWS_REGION="${AWS_REGION:-ap-south-1}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_REPO="${API_REPO:-$REPO_ROOT/../car-wash-apis}"

print_iam_policy() {
  cat << 'EOF'
================================================================================
 IAM permissions needed
================================================================================
Use an IAM user with PROGRAMMATIC ACCESS ONLY (never the account's root user).

To only publish the portal to an existing stack, this is enough:
EOF
  cat << 'POLICY'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "CarWashAdminDeploy",
      "Effect": "Allow",
      "Action": [
        "sts:GetCallerIdentity",
        "ec2:DescribeInstances",
        "ec2:DescribeAddresses",
        "ec2-instance-connect:SendSSHPublicKey"
      ],
      "Resource": "*"
    }
  ]
}
POLICY
  cat << 'EOF'

If the stack doesn't exist yet and you want this script to create it, the key also
needs the API stack's permissions - see:
  car-wash-apis/scripts/aws-deploy.sh --show-permissions
  (quick option: AmazonEC2FullAccess + AmazonRDSFullAccess)

IAM user -> Security credentials -> Create access key (Command Line Interface).
================================================================================
EOF
}

for arg in "$@"; do
  [ "$arg" = "--show-permissions" ] && { print_iam_policy; exit 0; }
done
print_iam_policy

# ---------------------------------------------------------------------------
# Credentials and config
# ---------------------------------------------------------------------------
if [ -z "${AWS_ACCESS_KEY_ID:-}" ]; then
  read -r -p "AWS Access Key ID: " AWS_ACCESS_KEY_ID
fi
if [ -z "${AWS_SECRET_ACCESS_KEY:-}" ]; then
  read -r -s -p "AWS Secret Access Key: " AWS_SECRET_ACCESS_KEY
  echo
fi
if [ -t 0 ]; then
  read -r -p "Stack name [${STACK_NAME}]: " input_stack
  STACK_NAME="${input_stack:-$STACK_NAME}"
  read -r -p "AWS region [${AWS_REGION}]: " input_region
  AWS_REGION="${input_region:-$AWS_REGION}"
fi

export AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_REGION
export AWS_DEFAULT_REGION="$AWS_REGION"
unset AWS_PROFILE

log() { echo "==> $*"; }

log "Verifying credentials"
aws sts get-caller-identity --output json

# ---------------------------------------------------------------------------
# Find the stack (created by the API repo's aws-deploy.sh)
# ---------------------------------------------------------------------------
find_instance() {
  INSTANCE_ID="$(aws ec2 describe-instances \
    --filters Name=tag:Name,Values="$STACK_NAME-api" Name=instance-state-name,Values=running \
    --query 'Reservations[0].Instances[0].InstanceId' --output text 2>/dev/null || true)"
  [ -n "$INSTANCE_ID" ] && [ "$INSTANCE_ID" != "None" ]
}

if ! find_instance; then
  log "No running instance tagged $STACK_NAME-api in $AWS_REGION"
  if [ ! -x "$API_REPO/scripts/aws-deploy.sh" ]; then
    echo "Create the stack first with car-wash-apis/scripts/aws-deploy.sh (or set API_REPO to that checkout)." >&2
    exit 1
  fi
  answer=n
  if [ -t 0 ]; then
    read -r -p "Create stack '$STACK_NAME' now (API, RDS, EC2, nginx, TLS - ~15 min)? [y/N]: " answer
  fi
  if [ "$answer" != "y" ] && [ "$answer" != "Y" ]; then
    echo "Aborted - check the stack name/region/account, or create the stack first." >&2
    exit 1
  fi
  log "Creating the stack via $API_REPO/scripts/aws-deploy.sh"
  STACK_NAME="$STACK_NAME" STACK_NAME_SET=1 AWS_REGION_SET=1 "$API_REPO/scripts/aws-deploy.sh" </dev/tty
  find_instance || { echo "Stack creation didn't leave a running $STACK_NAME-api instance." >&2; exit 1; }
fi

EIP="$(aws ec2 describe-addresses --filters Name=instance-id,Values="$INSTANCE_ID" --query 'Addresses[0].PublicIp' --output text 2>/dev/null || true)"
if [ -z "$EIP" ] || [ "$EIP" = "None" ]; then
  EIP="$(aws ec2 describe-instances --instance-ids "$INSTANCE_ID" --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)"
fi
EC2_HOST="$(echo "$EIP" | tr '.' '-').nip.io"
log "Found $INSTANCE_ID ($EIP) - publishing to https://$EC2_HOST/admin/"

# ---------------------------------------------------------------------------
# Publish (deploy-ec2.sh builds, uploads, wires nginx, and checks /admin/)
# ---------------------------------------------------------------------------
SAVED_KEY="$API_REPO/.deploy/$STACK_NAME/$STACK_NAME-deploy-key.pem"
if [ -z "${SSH_KEY:-}" ] && [ -f "$SAVED_KEY" ]; then
  SSH_KEY="$SAVED_KEY"
fi
# The instance may have been launched with a different key pair - only use the key
# if the instance accepts it, else fall back to EC2 Instance Connect.
if [ -n "${SSH_KEY:-}" ] && ! ssh -o StrictHostKeyChecking=no -o BatchMode=yes -o ConnectTimeout=10 \
    -i "$SSH_KEY" "ubuntu@$EIP" true 2>/dev/null; then
  log "The instance doesn't accept $SSH_KEY - using EC2 Instance Connect"
  SSH_KEY=""
fi
if [ -n "${SSH_KEY:-}" ]; then
  EC2_HOST="$EC2_HOST" SSH_KEY="$SSH_KEY" "$REPO_ROOT/scripts/deploy-ec2.sh"
else
  EC2_HOST="$EC2_HOST" EC2_INSTANCE_ID="$INSTANCE_ID" "$REPO_ROOT/scripts/deploy-ec2.sh"
fi
