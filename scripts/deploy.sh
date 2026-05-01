#!/usr/bin/env bash
# Build and deploy hal-dashboard to /home/aidash/hal-dashboard, then restart the service.
# Run as the dev user (dibza). Uses sudo for the rsync into /home/aidash and the systemctl restart.
#
# Usage: bash scripts/deploy.sh

set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DEPLOY_DIR="/home/aidash/hal-dashboard"

cd "$REPO_DIR"

echo "==> building"
npm run build

echo "==> rsyncing standalone bundle to $DEPLOY_DIR"
# .next/standalone contains server.js + minimal node_modules + package.json.
# .next/static and public are not copied automatically; do them separately.
sudo rsync -a --delete .next/standalone/ "$DEPLOY_DIR/"
sudo rsync -a --delete .next/static/ "$DEPLOY_DIR/.next/static/"
sudo rsync -a --delete public/ "$DEPLOY_DIR/public/"
sudo rsync -a config/ "$DEPLOY_DIR/config/"

# data/ is preserved (gitignored on the source side; created by install.sh on deploy side).
sudo chown -R aidash:aidash "$DEPLOY_DIR"

echo "==> restarting service"
sudo systemctl restart hal-dashboard
sleep 2
sudo systemctl status hal-dashboard --no-pager | head -10
