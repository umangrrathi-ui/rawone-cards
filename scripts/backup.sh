#!/usr/bin/env bash
# /opt/cards/backup.sh — nightly (cron 02:30 IST). Encrypted MySQL dump -> local (14 days) + Cloudflare R2.
# Then runs the data-retention cleanup (maintenance.sql).
set -euo pipefail
cd /opt/cards
# Read only the keys we need (the .env is not valid bash, so never source it).
envget() { grep -E "^$1=" .env | tail -1 | cut -d= -f2- | sed -E 's/[[:space:]]+#.*$//; s/^"(.*)"$/\1/'; }
for k in MYSQL_ROOT_PASSWORD BACKUP_PASSPHRASE R2_ACCOUNT_ID R2_ACCESS_KEY_ID R2_BUCKET BACKUP_BUCKET \
         BACKUP_R2_ACCESS_KEY_ID BACKUP_R2_SECRET_ACCESS_KEY; do
  printf -v "$k" '%s' "$(envget "$k")"; export "${k?}"
done

: "${BACKUP_PASSPHRASE:?set BACKUP_PASSPHRASE in .env}"
STAMP="$(date -u +%Y%m%d-%H%M)"
DIR=/opt/cards/backups
mkdir -p "$DIR" && chmod 700 "$DIR"
FILE="$DIR/cards-$STAMP.sql.gz.enc"

docker compose exec -T -e MYSQL_PWD="$MYSQL_ROOT_PASSWORD" db \
  mysqldump -uroot --single-transaction --quick --routines --no-tablespaces cards \
  | gzip -9 \
  | openssl enc -aes-256-cbc -pbkdf2 -iter 200000 -salt -pass env:BACKUP_PASSPHRASE -out "$FILE"
chmod 600 "$FILE"

# Media on local disk (only when R2 isn't used for photos)
if [ -z "${R2_BUCKET:-}" ] || [ -z "${R2_ACCESS_KEY_ID:-}" ]; then
  docker run --rm -v cards_media:/m:ro -v "$DIR":/b alpine tar czf "/b/media-$STAMP.tar.gz" -C /m .
fi

# Off-site copy (write-only key recommended; set a 30-day lifecycle rule on the bucket)
if [ -n "${BACKUP_R2_ACCESS_KEY_ID:-}" ]; then
  docker run --rm -v "$DIR":/b:ro \
    -e RCLONE_CONFIG_R2_TYPE=s3 -e RCLONE_CONFIG_R2_PROVIDER=Cloudflare \
    -e RCLONE_CONFIG_R2_ACCESS_KEY_ID="$BACKUP_R2_ACCESS_KEY_ID" \
    -e RCLONE_CONFIG_R2_SECRET_ACCESS_KEY="$BACKUP_R2_SECRET_ACCESS_KEY" \
    -e RCLONE_CONFIG_R2_ENDPOINT="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com" \
    -e RCLONE_CONFIG_R2_NO_CHECK_BUCKET=true \
    rclone/rclone:1 copy /b "r2:${BACKUP_BUCKET}/" --include "*-$STAMP.*" --quiet
fi

find "$DIR" -type f -mtime +14 -delete

# Retention cleanup
docker compose exec -T -e MYSQL_PWD="$MYSQL_ROOT_PASSWORD" db mysql -uroot cards < /opt/cards/maintenance.sql

echo "$(date -u +%FT%TZ) backup ok $FILE"
# Restore: openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -pass env:BACKUP_PASSPHRASE -in FILE | gunzip | docker compose exec -T db mysql -uroot -p cards
