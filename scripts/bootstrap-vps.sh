#!/usr/bin/env bash
# RAWONE Cards — one-time VPS setup (Ubuntu 22.04/24.04, run as root).
#   curl -fsSL https://raw.githubusercontent.com/umangrrathi-ui/rawone-cards/main/scripts/bootstrap-vps.sh -o bootstrap.sh
#   less bootstrap.sh   # read it first
#   sudo bash bootstrap.sh
#
# Safe for a box that already runs n8n + the Discord bot:
#   * never stops, restarts or edits existing containers, compose projects or their volumes
#   * snapshots /etc (nginx, ssh, ufw, fail2ban, cron) before changing anything
#   * aborts (changes nothing) if ports 80/443 belong to something other than host Nginx
#   * only turns off SSH passwords when a working key is already installed
# Re-running is safe (idempotent).
set -euo pipefail

APP_DIR=/opt/cards
DOMAIN=card.rawonelabs.co.in
REPO_RAW=https://raw.githubusercontent.com/umangrrathi-ui/rawone-cards/main
DEPLOY_USER=cardsdeploy
log() { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m[!] %s\033[0m\n' "$*"; }
die() { printf '\033[1;31m[x] %s\033[0m\n' "$*"; exit 1; }

[ "$(id -u)" = 0 ] || die "Run as root (sudo bash bootstrap.sh)"
. /etc/os-release; [ "$ID" = ubuntu ] || die "Ubuntu only (found $ID)"

# ---------------------------------------------------------------- 0. look before touching
log "Checking what already runs here"
docker ps --format '  {{.Names}}  ->  {{.Ports}}' 2>/dev/null || warn "Docker not installed yet"
OWNER443="$(ss -ltnpH 'sport = :443' 2>/dev/null | grep -o 'users:(("[^"]*' | head -1 | cut -d'"' -f2 || true)"
OWNER80="$(ss -ltnpH 'sport = :80' 2>/dev/null | grep -o 'users:(("[^"]*' | head -1 | cut -d'"' -f2 || true)"
for o in "$OWNER80" "$OWNER443"; do
  if [ -n "$o" ] && [ "$o" != nginx ]; then
    die "Port 80/443 is held by '$o' (probably the n8n Traefik/Caddy container).
     Nothing was changed. Send this output to Umang/Claude — cards will be routed through that proxy instead."
  fi
done

# ---------------------------------------------------------------- 1. backup of config
STAMP="$(date +%Y%m%d-%H%M%S)"
log "Backing up /etc config to /root/pre-cards-$STAMP.tar.gz"
tar czf "/root/pre-cards-$STAMP.tar.gz" --ignore-failed-read \
  /etc/nginx /etc/ssh /etc/ufw /etc/fail2ban /etc/crontab /etc/cron.d /etc/sudoers.d 2>/dev/null || true
crontab -l > "/root/pre-cards-$STAMP.root-crontab" 2>/dev/null || true
docker ps -a > "/root/pre-cards-$STAMP.containers" 2>/dev/null || true

# ---------------------------------------------------------------- 2. packages
log "Installing packages (nginx, fail2ban, ufw, unattended-upgrades)"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq nginx fail2ban ufw unattended-upgrades curl ca-certificates openssl >/dev/null
dpkg-reconfigure -f noninteractive unattended-upgrades >/dev/null
if ! command -v docker >/dev/null; then
  log "Installing Docker"
  curl -fsSL https://get.docker.com | sh
fi
docker compose version >/dev/null || die "docker compose plugin missing"

# ---------------------------------------------------------------- 3. swap (KVM 1 has 4 GB RAM)
if ! swapon --show | grep -q .; then
  log "Adding 2 GB swap"
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  sysctl -qw vm.swappiness=10 && echo 'vm.swappiness=10' > /etc/sysctl.d/99-cards-swap.conf
fi

# ---------------------------------------------------------------- 4. kernel/network hardening
cat > /etc/sysctl.d/99-cards-net.conf <<'EOF'
net.ipv4.tcp_syncookies=1
net.ipv4.conf.all.rp_filter=1
net.ipv4.conf.all.accept_redirects=0
net.ipv4.conf.all.send_redirects=0
net.ipv4.conf.all.accept_source_route=0
net.ipv6.conf.all.accept_redirects=0
EOF
sysctl -q --system

# ---------------------------------------------------------------- 5. firewall
# Docker-published ports (n8n etc.) bypass ufw, so enabling it cannot cut them off.
# Cloudflare-only access for cards is enforced by mTLS (Authenticated Origin Pulls) in the Nginx vhost,
# so other sites on this box keep working.
log "Firewall: allow SSH, HTTP, HTTPS"
SSH_PORT="$(sshd -T 2>/dev/null | awk '/^port /{print $2; exit}')"; SSH_PORT="${SSH_PORT:-22}"
ufw allow "$SSH_PORT/tcp" comment ssh >/dev/null
ufw limit "$SSH_PORT/tcp" >/dev/null
ufw allow 80/tcp comment http >/dev/null
ufw allow 443/tcp comment https >/dev/null
ufw default deny incoming >/dev/null
ufw default allow outgoing >/dev/null
ufw --force enable >/dev/null
ufw status | sed 's/^/  /'

# ---------------------------------------------------------------- 6. SSH
log "SSH hardening"
HAS_KEY=no
for f in /root/.ssh/authorized_keys /home/*/.ssh/authorized_keys; do
  [ -s "$f" ] && grep -qE '^(ssh-ed25519|ssh-rsa|ecdsa-)' "$f" && HAS_KEY=yes
done
if [ "$HAS_KEY" = yes ]; then
  cat > /etc/ssh/sshd_config.d/10-cards-hardening.conf <<'EOF'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin prohibit-password
MaxAuthTries 3
LoginGraceTime 30
X11Forwarding no
AllowAgentForwarding no
EOF
  if sshd -t; then
    systemctl reload ssh 2>/dev/null || systemctl reload sshd
    echo "  passwords off, keys only"
  else
    rm -f /etc/ssh/sshd_config.d/10-cards-hardening.conf
    warn "sshd config test failed — hardening file removed, SSH unchanged"
  fi
else
  warn "No SSH key installed — leaving password login ON so you don't get locked out. Add a key, then re-run."
fi

# ---------------------------------------------------------------- 7. fail2ban
log "fail2ban jails"
cat > /etc/fail2ban/jail.d/cards.local <<EOF
[DEFAULT]
bantime = 1h
findtime = 10m
maxretry = 5
backend = systemd

[sshd]
enabled = true
port = $SSH_PORT

[nginx-limit-req]
enabled = true
backend = auto
logpath = /var/log/nginx/cards.error.log
maxretry = 20
EOF
touch /var/log/nginx/cards.error.log
systemctl enable --now fail2ban >/dev/null && systemctl restart fail2ban

# ---------------------------------------------------------------- 8. Cloudflare real IP
log "Cloudflare real-IP config"
{
  echo "# generated $(date -u +%F) from cloudflare.com/ips"
  for ip in $(curl -fsS https://www.cloudflare.com/ips-v4) $(curl -fsS https://www.cloudflare.com/ips-v6); do echo "set_real_ip_from $ip;"; done
  echo "real_ip_header CF-Connecting-IP;"
} > /etc/nginx/conf.d/cloudflare-realip.conf
mkdir -p /etc/ssl/cloudflare && chmod 700 /etc/ssl/cloudflare
[ -f /etc/ssl/cloudflare/origin-pull-ca.pem ] || \
  curl -fsS https://developers.cloudflare.com/ssl/static/authenticated_origin_pull_ca.pem -o /etc/ssl/cloudflare/origin-pull-ca.pem

# ---------------------------------------------------------------- 9. app folder
log "App folder $APP_DIR"
install -d -m 750 "$APP_DIR"
for f in docker-compose.yml .env.example scripts/backup.sh scripts/maintenance.sql deploy/deploy.sh \
         deploy/nginx/$DOMAIN.conf; do
  curl -fsS "$REPO_RAW/$f" -o "$APP_DIR/$(basename "$f")"
done
chmod 750 "$APP_DIR/backup.sh" "$APP_DIR/deploy.sh"
chown root:root "$APP_DIR/deploy.sh"
if [ ! -f "$APP_DIR/.env" ]; then
  cp "$APP_DIR/.env.example" "$APP_DIR/.env"
  for k in SESSION_SECRET DATA_KEY MYSQL_ROOT_PASSWORD MYSQL_PASSWORD REDIS_PASSWORD BACKUP_PASSPHRASE; do
    v="$(openssl rand -hex 32)"
    sed -i "s#^$k=.*#$k=$v#" "$APP_DIR/.env"
  done
  echo "  .env created with fresh random secrets (fill RESEND/TURNSTILE/R2 keys by hand)"
fi
chmod 600 "$APP_DIR/.env"

# ---------------------------------------------------------------- 10. deploy user (CI can only run deploy.sh)
log "Deploy user $DEPLOY_USER"
id "$DEPLOY_USER" >/dev/null 2>&1 || useradd -m -s /bin/bash "$DEPLOY_USER"
passwd -l "$DEPLOY_USER" >/dev/null
echo "$DEPLOY_USER ALL=(root) NOPASSWD: $APP_DIR/deploy.sh *" > /etc/sudoers.d/cards-deploy
chmod 440 /etc/sudoers.d/cards-deploy && visudo -cq
install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh"
KEYFILE="/home/$DEPLOY_USER/.ssh/authorized_keys"
if [ ! -s "$KEYFILE" ]; then
  ssh-keygen -q -t ed25519 -N '' -C "github-actions-cards" -f /root/cards_deploy_key
  printf 'command="sudo %s/deploy.sh \\"$SSH_ORIGINAL_COMMAND\\"",no-port-forwarding,no-agent-forwarding,no-X11-forwarding,no-pty %s\n' \
    "$APP_DIR" "$(cat /root/cards_deploy_key.pub)" > "$KEYFILE"
  chown "$DEPLOY_USER:$DEPLOY_USER" "$KEYFILE" && chmod 600 "$KEYFILE"
  NEWKEY=yes
fi

# ---------------------------------------------------------------- 11. nginx site (enabled only once the cert exists)
cp "$APP_DIR/$DOMAIN.conf" "/etc/nginx/sites-available/$DOMAIN"
if [ -f "/etc/ssl/cloudflare/$DOMAIN.pem" ]; then
  ln -sf "/etc/nginx/sites-available/$DOMAIN" "/etc/nginx/sites-enabled/$DOMAIN"
  nginx -t && systemctl reload nginx
else
  warn "Origin certificate missing: put it in /etc/ssl/cloudflare/$DOMAIN.pem and .key, then re-run."
fi

# ---------------------------------------------------------------- 12. nightly backup
echo "0 21 * * * root $APP_DIR/backup.sh >> /var/log/cards-backup.log 2>&1" > /etc/cron.d/cards-backup   # 21:00 UTC = 02:30 IST

# ---------------------------------------------------------------- done
log "Done. Nothing else on this server was touched."
cat <<EOF

Next steps:
  1. nano $APP_DIR/.env       -> fill BASE_URL, ADMIN_EMAILS, RESEND_API_KEY, TURNSTILE_*, R2_* , BACKUP_R2_*
  2. echo <GHCR read token> | docker login ghcr.io -u umangrrathi-ui --password-stdin
  3. cd $APP_DIR && docker compose up -d
  4. GitHub -> Settings -> Secrets (environment "production"):
       VPS_HOST, VPS_PORT=$SSH_PORT, VPS_KNOWN_HOSTS (ssh-keyscan -p $SSH_PORT <host>),
       VPS_SSH_KEY = contents of /root/cards_deploy_key  (then: shred -u /root/cards_deploy_key)
  Config backup: /root/pre-cards-$STAMP.tar.gz
EOF
[ "${NEWKEY:-}" = yes ] && warn "A new deploy key was generated at /root/cards_deploy_key — copy it to GitHub, then delete it."
exit 0
