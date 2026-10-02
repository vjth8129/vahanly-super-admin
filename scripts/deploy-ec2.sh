#!/usr/bin/env bash
# Builds the admin portal and publishes it to the EC2 instance that runs the API, where
# nginx serves it at https://<host>/admin/ (see deploy/nginx-admin.conf).
#
# Usage:
#   EC2_INSTANCE_ID=i-08c2b6c26f77abbd8 ./scripts/deploy-ec2.sh   # EC2 Instance Connect (AWS CLI creds)
#   SSH_KEY=~/carwash-deploy-key.pem ./scripts/deploy-ec2.sh       # or a .pem key
#
# Env vars (defaults are for this deployment):
#   EC2_HOST   - instance hostname (default: 3-110-172-236.nip.io)
#   EC2_USER   - SSH user (default: ubuntu)
#   NGINX_SITE - nginx site file holding the API's server blocks
#                (default: the enabled site that proxies to 127.0.0.1:5000)
#
# Safe to re-run: the snippet include is added once, nginx config is tested before
# reloading (and restored if the test fails), and files are swapped in atomically.

set -euo pipefail

EC2_HOST="${EC2_HOST:-3-110-172-236.nip.io}"
EC2_USER="${EC2_USER:-ubuntu}"
EC2_INSTANCE_ID="${EC2_INSTANCE_ID:-}"
SSH_KEY="${SSH_KEY:-}"
NGINX_SITE="${NGINX_SITE:-}"

if [ -z "$SSH_KEY" ] && [ -z "$EC2_INSTANCE_ID" ]; then
  echo "Set EC2_INSTANCE_ID (EC2 Instance Connect) or SSH_KEY (path to the .pem key)" >&2
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORK_DIR="$(mktemp -d -t carwash-admin-deploy-XXXXXX)"
CONTROL_PATH="$WORK_DIR/cm.sock"
ARCHIVE="$WORK_DIR/admin.tar.gz"

cleanup() {
  ssh -o ControlPath="$CONTROL_PATH" -O exit "$EC2_USER@$EC2_HOST" 2>/dev/null || true
  rm -rf "$WORK_DIR"
}
trap cleanup EXIT

echo "==> Building"
cd "$REPO_ROOT"
npm ci --no-audit --no-fund
npm run build
tar -czf "$ARCHIVE" -C dist .

if [ -z "$SSH_KEY" ]; then
  echo "==> Pushing a temporary key via EC2 Instance Connect ($EC2_INSTANCE_ID)"
  SSH_KEY="$WORK_DIR/eic_key"
  ssh-keygen -q -t ed25519 -N '' -f "$SSH_KEY" -C "admin-deploy-$(date +%s)"
  aws ec2-instance-connect send-ssh-public-key \
    --instance-id "$EC2_INSTANCE_ID" \
    --instance-os-user "$EC2_USER" \
    --ssh-public-key "file://$SSH_KEY.pub" >/dev/null
fi

SSH_OPTS="-o StrictHostKeyChecking=no -o ControlMaster=auto -o ControlPath=$CONTROL_PATH -o ControlPersist=10m -i $SSH_KEY"
ssh $SSH_OPTS -fN "$EC2_USER@$EC2_HOST"

echo "==> Uploading"
scp $SSH_OPTS "$ARCHIVE" "$REPO_ROOT/deploy/nginx-admin.conf" "$EC2_USER@$EC2_HOST:/tmp/"

echo "==> Publishing and configuring nginx"
ssh $SSH_OPTS "$EC2_USER@$EC2_HOST" NGINX_SITE="$NGINX_SITE" bash -s << 'REMOTE'
set -euo pipefail

# Files: unpack beside the live copy, then swap.
sudo mkdir -p /var/www/carwash-admin
sudo rm -rf /var/www/carwash-admin/admin-new
sudo mkdir /var/www/carwash-admin/admin-new
sudo tar -xzf /tmp/admin.tar.gz -C /var/www/carwash-admin/admin-new
sudo chmod -R a+rX /var/www/carwash-admin/admin-new
sudo rm -rf /var/www/carwash-admin/admin-old
[ -d /var/www/carwash-admin/admin ] && sudo mv /var/www/carwash-admin/admin /var/www/carwash-admin/admin-old
sudo mv /var/www/carwash-admin/admin-new /var/www/carwash-admin/admin
rm -f /tmp/admin.tar.gz

# nginx: install the snippet and include it in the API's server blocks (once).
sudo install -m 644 /tmp/nginx-admin.conf /etc/nginx/snippets/carwash-admin.conf
rm -f /tmp/nginx-admin.conf
SITE="${NGINX_SITE:-$(sudo grep -l 'proxy_pass http://127.0.0.1:5000' /etc/nginx/sites-enabled/* | head -1)}"
SITE="$(readlink -f "$SITE")"
if [ -z "$SITE" ] || [ ! -f "$SITE" ]; then
  echo "Couldn't find the API's nginx site; set NGINX_SITE" >&2
  exit 1
fi
if ! sudo grep -q 'snippets/carwash-admin.conf' "$SITE"; then
  sudo cp "$SITE" "$SITE.bak-admin"
  # Add the include right before each server block's API proxy location.
  sudo sed -i 's#^\(\s*\)location / {#\1include snippets/carwash-admin.conf;\n\n\1location / {#' "$SITE"
  echo "Added the admin snippet to $SITE (backup: $SITE.bak-admin)"
fi
if ! sudo nginx -t; then
  [ -f "$SITE.bak-admin" ] && sudo cp "$SITE.bak-admin" "$SITE"
  echo "nginx config test failed; restored $SITE" >&2
  exit 1
fi
sudo systemctl reload nginx
sudo rm -rf /var/www/carwash-admin/admin-old
REMOTE

echo "==> Checking"
# nginx reloads gracefully, so give it a few seconds to pick up the new config.
for _ in 1 2 3 4 5 6; do
  code=$(curl -s -o /dev/null -w '%{http_code}' "https://$EC2_HOST/admin/")
  [ "$code" = 200 ] && break
  sleep 2
done
echo "GET https://$EC2_HOST/admin/ -> $code"
[ "$code" = 200 ]
echo "==> Done. https://$EC2_HOST/admin/"
