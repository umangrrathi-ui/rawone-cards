# RAWONE Cards

Digital visiting cards (NFC + QR) for doctors, jewellers, real estate and sales teams.
Users sign up, build their own one-screen card, customise it and share it at `card.rawonelabs.co.in/<username>`.

Rules for this repo: **read `ENGINEERING.md` first** (RAWONE Engineering & Security Playbook v1.1).
Full product plan: the "RAWONE Cards — SaaS plan" doc in Claude.

## Status

Phase 1 (MVP) in progress.

- [x] Corporate one-screen card design system (6 designs), custom colours, logo, once-only photo effects
- [x] Showroom (`/showroom`) and colour playground (`/showroom/try`)
- [x] Security base: CSP + headers, CSRF proxy, bounded rate limiter, input validation, vCard builder
- [x] CI (lint, audit, build, gitleaks), Dependabot, Dockerfile
- [ ] Signup / login with email OTP, sessions with token version
- [ ] Card builder + dashboard (stats, leads, CSV)
- [ ] Public card page, Save contact, NFC/QR links, tracking
- [ ] Super admin panel (users, cards, block, manual Pro on/off)
- [ ] 29 more designs (35 total)
- [ ] VPS setup script, docker-compose, Nginx, Cloudflare, backups

## Run locally

```bash
cp .env.example .env.local     # fill values; STORE=file works without MySQL
npm ci
npm run dev                    # http://localhost:3000/showroom
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
