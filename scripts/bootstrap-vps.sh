#!/usr/bin/env bash
# RAWONE Cards — one-time VPS setup (Ubuntu 22.04/24.04, run as root).
#   curl -fsSL https://raw.githubusercontent.com/umangrrathi-ui/rawone-cards/main/scripts/bootstrap-vps.sh -o bootstrap.sh
#   less bootstrap.sh        # read it first
#   bash bootstrap.sh
#
# This server already runs n8n, other apps and a Traefik that owns ports 80/443. So this script:
#   * does NOT touch Traefik, n8n, other containers, SSH, the firewall or Nginx
#   * only creates /opt/cards (compose, .env with random secrets, backup + deploy scripts),
#     a locked-down "cardsdeploy" user for CI, and one nightly backup cron entry
#   * is idempotent: re-running keeps your existing .env and deploy key
set -euo pipefail

APP_DIR=/opt/cards
REPO_RAW=https://raw.githubusercontent.com/umangrrathi-ui/rawone-cards/main
DEPLOY_USER=cardsdeploy
log() { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m[!] %s\033[0m\n' "$*"; }
die() { printf '\033[1;31m[x] %s\033[0m\n' "$*"; exit 1; }

[ "$(id -u)" = 0 ] || die "Run as root"
command -v docker >/dev/null || die "Docker not found"
docker compose version >/dev/null || die "docker compose plugin missing"

# ---------------------------------------------------------------- 0. what is already here
log "Checking the server"
WEB_NETWORK="$(docker inspect root-traefik-1 --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}' 2>/dev/null | awk '{print $1}')"
[ -n "$WEB_NETWORK" ] || die "Traefik container 'root-traefik-1' not found. Nothing was changed."
echo "  Traefik network: $WEB_NETWORK"
FREE_MB="$(free -m | awk '/^Mem:/{print $7}')"
echo "  RAM available: ${FREE_MB} MB (cards needs ~830 MB at most)"
[ "$FREE_MB" -ge 700 ] || warn "RAM is tight. It will run (swap is on) but plan the KVM 2 upgrade."
if ss -ltn 2>/dev/null | grep -q '127.0.0.1:3110 '; then die "Port 3110 is already used. Nothing was changed."; fi

mkdir -p /root/pre-cards
docker ps -a > "/root/pre-cards/containers-$(date +%Y%m%d-%H%M%S).txt"
crontab -l > "/root/pre-cards/root-crontab-$(date +%Y%m%d-%H%M%S).txt" 2>/dev/null || true

# ---------------------------------------------------------------- 1. app folder
log "App folder $APP_DIR"
install -d -m 750 "$APP_DIR"
for f in docker-compose.yml .env.example scripts/backup.sh scripts/maintenance.sql deploy/deploy.sh; do
  curl -fsS "$REPO_RAW/$f" -o "$APP_DIR/$(basename "$f")"
done
chmod 750 "$APP_DIR/backup.sh" "$APP_DIR/deploy.sh"
if [ ! -f "$APP_DIR/.env" ]; then
  cp "$APP_DIR/.env.example" "$APP_DIR/.env"
  for k in SESSION_SECRET DATA_KEY MYSQL_ROOT_PASSWORD MYSQL_PASSWORD REDIS_PASSWORD BACKUP_PASSPHRASE; do
    sed -i "s#^$k=.*#$k=$(openssl rand -hex 32)#" "$APP_DIR/.env"
  done
  sed -i "s#^WEB_NETWORK=.*#WEB_NETWORK=$WEB_NETWORK                    #" "$APP_DIR/.env"
  echo "  .env created with fresh random secrets"
fi
chmod 600 "$APP_DIR/.env"

# ---------------------------------------------------------------- 2. deploy user (CI can only run deploy.sh)
log "Deploy user $DEPLOY_USER"
id "$DEPLOY_USER" >/dev/null 2>&1 || useradd -m -s /bin/bash "$DEPLOY_USER"
passwd -l "$DEPLOY_USER" >/dev/null
echo "$DEPLOY_USER ALL=(root) NOPASSWD: $APP_DIR/deploy.sh *" > /etc/sudoers.d/cards-deploy
chmod 440 /etc/sudoers.d/cards-deploy && visudo -cq
install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh"
KEYFILE="/home/$DEPLOY_USER/.ssh/authorized_keys"
NEWKEY=no
if [ ! -s "$KEYFILE" ]; then
  rm -f /root/cards_deploy_key /root/cards_deploy_key.pub
  ssh-keygen -q -t ed25519 -N '' -C "github-actions-cards" -f /root/cards_deploy_key
  printf 'command="sudo %s/deploy.sh \\"$SSH_ORIGINAL_COMMAND\\"",no-port-forwarding,no-agent-forwarding,no-X11-forwarding,no-pty %s\n' \
    "$APP_DIR" "$(cat /root/cards_deploy_key.pub)" > "$KEYFILE"
  chown "$DEPLOY_USER:$DEPLOY_USER" "$KEYFILE" && chmod 600 "$KEYFILE"
  NEWKEY=yes
fi

# ---------------------------------------------------------------- 3. nightly backup (21:00 UTC = 02:30 IST)
echo "0 21 * * * root $APP_DIR/backup.sh >> /var/log/cards-backup.log 2>&1" > /etc/cron.d/cards-backup

log "Done. Traefik, n8n and the other apps were not touched."
cat <<EOF

Next:
  1. nano $APP_DIR/.env     -> fill ADMIN_EMAILS, RESEND_API_KEY, TURNSTILE_*, R2_*, BACKUP_*
  2. cd $APP_DIR && docker compose pull && docker compose up -d
  3. Add the DNS record  card -> A -> $(curl -fsS4 https://ifconfig.me 2>/dev/null || echo '<server IP>')  (DNS only)
  Config snapshot saved in /root/pre-cards/
EOF
if [ "$NEWKEY" = yes ]; then
  warn "New CI deploy key: cat /root/cards_deploy_key  (copy into GitHub secret VPS_SSH_KEY), then: shred -u /root/cards_deploy_key"
fi
