#!/usr/bin/env bash
# /opt/cards/deploy.sh — the ONLY thing the CI deploy key can run (forced command, via sudo).
# Usage (from CI): ssh cardsdeploy@host sha-<12 hex>
set -euo pipefail
cd /opt/cards

TAG="${SSH_ORIGINAL_COMMAND:-${1:-}}"
[[ "$TAG" =~ ^sha-[0-9a-f]{12}$ ]] || { echo "bad tag"; exit 2; }

IMAGE="ghcr.io/umangrrathi-ui/rawone-cards"
PREV="$(grep -E '^IMAGE=' .env | cut -d= -f2- || true)"

echo "[deploy] pulling $IMAGE:$TAG"
docker pull -q "$IMAGE:$TAG"
sed -i "s#^IMAGE=.*#IMAGE=$IMAGE:$TAG#" .env

docker compose up -d --remove-orphans app

# Wait for the health check; roll back if the new version doesn't come up.
for _ in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:3100/api/health >/dev/null 2>&1; then
    echo "[deploy] healthy on $TAG"
    echo "$(date -u +%FT%TZ) $TAG" >> /opt/cards/deploy.log
    docker image prune -f >/dev/null
    exit 0
  fi
  sleep 2
done

echo "[deploy] new version unhealthy, rolling back to $PREV"
if [ -n "$PREV" ]; then
  sed -i "s#^IMAGE=.*#IMAGE=$PREV#" .env
  docker compose up -d app
fi
exit 1
