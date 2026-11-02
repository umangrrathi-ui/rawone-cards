# RAWONE Cards

Digital visiting cards (NFC + QR) for doctors, jewellers, real estate and sales teams.
Users sign up, build their own one-screen card, customise it and share it at `card.rawonelabs.co.in/<username>`.

Rules for this repo: **read `ENGINEERING.md` first** (RAWONE Engineering & Security Playbook v1.1).
Full product plan: the "RAWONE Cards — SaaS plan" doc in Claude.

## Status

Phase 1 (MVP) code complete. Next: VPS + Cloudflare setup, then go live.

- [x] Corporate one-screen card design system (6 designs), custom colours, logo, once-only photo effects
- [x] Showroom (`/showroom`) and colour playground (`/showroom/try`)
- [x] Security base: CSP + headers, CSRF proxy, bounded rate limiter, input validation, vCard builder
- [x] CI (lint, audit, build, gitleaks), Dependabot, Dockerfile
- [x] Signup / login with email OTP, sessions with token version
- [x] Card builder + dashboard (stats, leads, CSV)
- [x] Public card page, Save contact, NFC/QR links, tracking
- [x] Super admin panel (users, cards, block, manual Pro on/off)
- [ ] 29 more designs (35 total)
- [x] VPS setup script, docker-compose, Nginx, backups, deploy pipeline, e2e in CI (64 checks)
- [ ] Run it on the VPS, Cloudflare DNS + origin cert, Resend/Turnstile/R2 keys

## Run locally

```bash
docker run -d --name cards-db -p 127.0.0.1:3306:3306 -e MYSQL_DATABASE=cards -e MYSQL_USER=cards \
  -e MYSQL_PASSWORD=localpass -e MYSQL_ROOT_PASSWORD=rootlocal mysql:8.4
docker run -d --name cards-redis -p 127.0.0.1:6379:6379 redis:7-alpine redis-server --requirepass localredis
# .env.local: BASE_URL, SESSION_SECRET, DATA_KEY, DATABASE_URL, REDIS_URL, ADMIN_EMAILS
npm ci
npm run dev > /tmp/dev.log     # OTP mails are printed to this log in dev
node scripts/dev/e2e.mjs /tmp/dev.log
```

## Checks before every deploy

```bash
npm run lint      # eslint is installed with --no-save, never in package.json
npm audit         # must be 0, dev deps included
npm run build
```

## Infra

| What | Where |
| --- | --- |
| App, MySQL, Redis | Hostinger KVM 1 VPS (Docker, isolated from n8n) |
| DNS, SSL, WAF | Cloudflare |
| Photos, backups | Cloudflare R2 |
| Email (OTP) | Resend |
| Payments | Manual in Phase 1, Razorpay in Phase 2 |

## Production layout (`/opt/cards` on the VPS)

| File | Purpose |
| --- | --- |
| `docker-compose.yml` | app (127.0.0.1:3100, read-only, no caps) + MySQL 8.4 + Redis, memory-capped (~1.2 GB) |
| `.env` (600) | secrets; created by `scripts/bootstrap-vps.sh` with random values |
| `deploy.sh` | the only command the CI deploy key can run; health-checks and rolls back |
| `backup.sh` + `maintenance.sql` | nightly encrypted dump → R2, 14 days local, data-retention cleanup |
| `deploy/nginx/*.conf` | Cloudflare-only (mTLS origin pulls), real IP, rate limits |

Deploy flow: merge to `main` → image pushed to GHCR → approve the `production` environment → VPS pulls and restarts the app.
