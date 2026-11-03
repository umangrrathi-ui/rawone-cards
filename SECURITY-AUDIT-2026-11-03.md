# RAWONE Cards: security audit, 3 Nov 2026

Scope: live site https://card.rawone.co.in (black-box probing) and the repo (code review). Not covered: the VPS operating system, SSH, firewall (no server access from here), and a professional penetration test.

## Result in one line
No critical or high issues found in the app. One low-medium bug found and fixed (PR #15). The biggest remaining risks are on the server and operations side, not in the code.

## What was tested and passed
- Headers: CSP, HSTS, nosniff, frame-ancestors, referrer and permissions policy all present. HTTP redirects to HTTPS.
- Secret files (.env, .git, package.json, path traversal in /media) return 404.
- Every owner API checks login first, and every query is filtered by the logged-in user's id (no IDOR). Admin APIs need staff role plus 2FA turned on.
- Cross-site writes are refused (403), form-encoded writes refused (415), no CORS headers.
- Login: same answer for unknown email and wrong password (no account enumeration). Per-account lock works: after 50 wrong tries the server answered 429 (tested on a fake email).
- Sign-up gives the same answer whether or not the email exists.
- Email codes: 6 digits, 10 minute expiry, 5 tries, hashed, constant-time compare.
- Cookie: HttpOnly, Secure (in production), SameSite=Lax, 30 days, revocable (token version).
- npm audit: 0 vulnerabilities (production dependencies). No secrets found in git history. SQL is parameterised; the only dynamic column lists come from fixed allow-lists.
- Public lead form: consent required, honeypot, per-IP and per-card limits, input cleaned.

## Findings
1. vCard line injection (low-medium). FIXED in PR #15, deploy needed. A bare carriage return in a card field could start a new line in the Save contact file, so a card owner could put extra fields into a visitor's contact. Now escaped. Confirmed with a test before and after.
2. Lead form spam (medium, open). The per-card cap is 100 leads a day, and per-IP limits can be sidestepped by rotating IPs. A bot could fill a doctor's lead list or use up the daily cap. Fix: switch on Cloudflare Turnstile (needs your site key).
3. Per-IP login limit could not be verified from here because my test traffic changes IP on every request. The code (10 per account+IP, 20 per IP, 50 per account, 300 global per 15 minutes) and Traefik rate limits are in place. Note the 50 per account limit also lets someone lock a known user out for 15 minutes by spamming wrong passwords. Normal trade-off, low risk.
4. CSP still allows inline scripts ('unsafe-inline'). If a script-injection bug appears later, the CSP will not stop it. Fix: nonce-based CSP.
5. TOTP codes can be reused inside their 90 second window (no replay block). Low.
6. HSTS has no includeSubDomains or preload. Low.
7. Dependabot PR #3 (gitleaks) is failing and unmerged. Housekeeping.

## Server and operations (not verifiable from here, please confirm)
- DATA_KEY was shown in a terminal screenshot in chat. Treat it as seen. Keep a private backup in your password manager. If you want certainty, we can add a key-rotation tool.
- Admin 2FA is not yet turned on for your own account (the admin pages stay locked until it is).
- SSH: check root login is off, keys only, ufw on, fail2ban installed.
- The openclaw port on the same VPS is open to the internet. It is not part of this app but shares the machine.
- Backups are local only. Add off-site copies (Cloudflare R2) and do one real restore test.
- Written plan for a data breach (DPDP Act): not yet written.

## Suggested order
1. Deploy PR #15 after CI is green.
2. Turn on admin 2FA on your account.
3. Create the Turnstile site key (Managed mode, hostname card.rawone.co.in) and send only the Site key.
4. Server hardening together, step by step.
5. Off-site backups plus a restore drill.
6. Nonce-based CSP.
