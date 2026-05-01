#!/usr/bin/env bash
# Bootstrap the hal-dashboard runtime environment on this server.
# Idempotent — safe to re-run.
#
# Usage: sudo bash scripts/install.sh

set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "must run as root (sudo bash scripts/install.sh)" >&2
  exit 1
fi

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DEPLOY_DIR="/home/aidash/hal-dashboard"
PORT=3737
LAN_CIDR="192.168.50.0/24"

echo "==> creating aidash user (if missing)"
if ! id aidash &>/dev/null; then
  useradd -r -m -s /bin/bash aidash
fi

echo "==> adding aidash to docker + video + systemd-journal groups"
usermod -aG docker aidash         # docker control without sudo
usermod -aG video aidash          # nvidia-smi without sudo
usermod -aG systemd-journal aidash # journalctl read without sudo

echo "==> creating deployment directory $DEPLOY_DIR"
install -d -o aidash -g aidash -m 0755 "$DEPLOY_DIR"
install -d -o aidash -g aidash -m 0755 "$DEPLOY_DIR/data"

echo "==> installing /etc/sudoers.d/aidash"
install -m 0440 "$REPO_DIR/scripts/aidash.sudoers" /etc/sudoers.d/aidash
visudo -c -f /etc/sudoers.d/aidash >/dev/null

echo "==> installing systemd unit"
install -m 0644 "$REPO_DIR/scripts/hal-dashboard.service" /etc/systemd/system/hal-dashboard.service
systemctl daemon-reload
systemctl enable hal-dashboard.service

echo "==> opening UFW port $PORT for $LAN_CIDR"
if command -v ufw &>/dev/null; then
  ufw allow from "$LAN_CIDR" to any port "$PORT" proto tcp comment 'hal-dashboard' || true
fi

echo
echo "Done. Next steps:"
echo "  1. Build and deploy:  bash scripts/deploy.sh"
echo "  2. Start the service: sudo systemctl start hal-dashboard"
echo "  3. Verify:            curl http://192.168.50.44:$PORT"
echo
echo "Sanity check sudo without password:"
echo "  sudo -u aidash sudo -n systemctl is-active ollama"
