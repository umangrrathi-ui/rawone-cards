# RAWONE Engineering & Security Playbook

> Har naye project (web app, tool, bot, SaaS) ke liye ek hi rulebook.
> Is file ko har repo ke root mein `ENGINEERING.md` naam se rakho. Claude ya koi bhi developer kaam shuru karne se pehle ise padhe.
> Kisi bhi project mein inme se koi rule todna ho to README mein **kyun** likho.

**Is file mein kabhi bhi asli password, API key, token, server IP ya DB credentials mat likhna.** Sirf placeholders.

---

## 0. Quick start: naya project shuru karte waqt

1. Plan pehle: kya ban raha hai, kaunse parts hain, kahan host hoga, kaunsa data store hoga. Go-ahead ke baad hi code.
2. Hosting decide karo (Section 1 ki table).
3. Repo banao `umangrrathi-ui/<project>` (private). Branch protection on.
4. Bootstrap (Section 2): `.gitignore`, `.env.example`, `README.md`, `ENGINEERING.md` (ye file), lint, CI.
5. Security baseline (Section 4) ka code shuru se daalo, baad mein nahi.
6. Deploy se pehle **Section 13 ki checklist** poori karo.

---

## 1. Infra map: kya kahan chalega

| Jagah | Kya hai | Kis kaam ke liye | Kis kaam ke liye NAHI |
|---|---|---|---|
| **Hostinger Cloud Startup** (shared cloud) | PHP/WordPress sites, **Node.js Web Apps (max 10)**, managed MySQL | Client websites, Next.js internal tools (jaise QR Links), MySQL-backed apps | Long-running workers, websockets, Redis, Docker, cron-heavy jobs |
| **Hostinger VPS (KVM 1)** | Full Linux server (Ubuntu 24.04), root access | n8n, Discord/Telegram bots, Docker apps, Redis, background jobs | Client WordPress sites (account hack ka risk mix mat karo) |
| **Vercel** | Serverless Next.js | Fast frontends, lead magnets, demo apps | Heavy DB connections without pooling, long jobs (time limits) |
| **Supabase** | Postgres + Auth + Storage | Apps that need auth/realtime/Postgres | (2 free project slots already used. Naya project = existing project mein merge ya paid) |
| **GitHub** `umangrrathi-ui` | Code | Har project ka source + CI | Secrets, `.env`, database dumps |

**Rule of thumb**
- Internal tool + MySQL + koi extra kharcha nahi → **Hostinger Cloud Node.js app**
- Kuch bhi jo hamesha chalta rahe (bot, n8n, queue, websocket) → **VPS**
- Public marketing page / lead magnet jo spike le sakta hai → **Vercel**
- Ek client ka data dusre client ke data se kabhi mix na ho: har table mein `client_id` / tenant column aur har query mein filter.

---

## 2. Project bootstrap (standard template)

### 2.1 Default stack
- **Next.js (App Router) + Node 24**, plain JS ya TypeScript
- DB: MySQL (`mysql2/promise`) on Hostinger, ya Postgres (Supabase)
- Auth: apna HMAC-signed cookie session (QR Links pattern), ya Supabase Auth
- Styling: plain CSS / CSS modules (extra build tools tabhi jab zaroorat ho)

### 2.2 Folder structure
```
app/                 # pages + API routes (app/api/**/route.js)
components/          # shared UI
lib/
  db.js              # pool + auto-migrations
  auth.js            # session, roles, need() guard
  api.js             # body() with size limit, toId(), validators
  limiter.js         # rate limiting (bounded)
proxy.js             # CSRF / origin check (Next 16 "proxy", pehle "middleware")
next.config.mjs      # security headers
.env.example         # sirf keys, koi asli value nahi
ENGINEERING.md       # ye file
README.md            # deploy steps + env list + troubleshooting
.github/workflows/ci.yml
```

### 2.3 `package.json` scripts (minimum)
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "audit": "npm audit --omit=dev"
  },
  "engines": { "node": ">=20.9" }
}
```

### 2.4 `.gitignore` (minimum)
```
node_modules
.next
dist
.env
.env.*
!.env.example
*.pem
*.key
*.sql
*.zip
.DS_Store
```

### 2.5 ESLint (Next + security)
**Linters ko hosted app ke `package.json` mein mat daalo.** Hostinger (aur doosre hosts) saari dependencies scan karte hain. ESLint ki purani sub-dependencies (jaise `minimatch` 3.x) pe CVE aate rehte hain, aur unka fix linters ke saath compatible nahi hota. QR Links mein Nov 2026 mein exactly yahi hua tha. Lint ko sirf local/CI tool rakho:
```json
"lint": "npm i --no-save eslint@9 eslint-config-next eslint-plugin-security && eslint ."
```
(`--no-save` = package.json / lockfile mein entry nahi jaati, deploy zip clean rehta hai)
```js
// eslint.config.mjs
import next from "eslint-config-next";
import security from "eslint-plugin-security";

const config = [
  ...next,
  security.configs.recommended,
  { ignores: [".next/**", "node_modules/**"] },
  { rules: { "security/detect-object-injection": "off" } }, // noisy; whitelist lookups instead
];
export default config;
```
Rule: **`npm run lint` aur `npm audit --omit=dev` dono 0 pe hon tabhi deploy.**

---

## 3. Environment variables & secrets

### 3.1 Rules
1. Asli values **sirf** hosting panel mein: Hostinger → Website → Environment variables, Vercel → Settings → Environment Variables, VPS → `/etc/<app>.env` (chmod 600).
2. Repo mein sirf `.env.example`, jisme keys aur dummy values hon.
3. Har environment (local / staging / production) ke alag secrets hon.
4. **Secrets chat, WhatsApp, Google Sheet, screenshot ya doc mein paste mat karo.** Galti se ho jaye to turant rotate karo.
5. Browser mein jaane wali env (`NEXT_PUBLIC_*`) mein kabhi secret nahi. Supabase `service_role` key kabhi frontend mein nahi.
6. Rotate karo: team member jaane pe, leak ka shak hone pe, aur saal mein ek baar.

### 3.2 Strong secret generate karna
```bash
node -e "console.log(require('crypto').randomBytes(36).toString('base64url'))"
# ya
openssl rand -base64 36
```

### 3.3 `.env.example` template
```bash
# ---------- App ----------
NODE_ENV=production
BASE_URL=https://app.example.com          # QR / emails / redirects isi se banenge (Host header pe bharosa nahi)
TZ_OFFSET_MIN=330                          # IST

# ---------- Auth ----------
ADMIN_PASSWORD=change-me-12+chars
SESSION_SECRET=generate-with-openssl-rand  # 32+ random chars, rotate = sab logout

# ---------- Database (Hostinger MySQL) ----------
DB_HOST=localhost
DB_PORT=3306
DB_NAME=uXXXXXXXXX_appname
DB_USER=uXXXXXXXXX_appname
DB_PASSWORD=change-me
# ya ek line: DATABASE_URL=mysql://USER:PASS@localhost:3306/DBNAME

# ---------- Supabase (agar use ho) ----------
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=             # public, RLS ke saath hi safe
SUPABASE_SERVICE_ROLE_KEY=                 # SERVER ONLY

# ---------- Optional ----------
REDIS_URL=redis://:password@127.0.0.1:6379
OPENAI_API_KEY=
```

### 3.4 Env check at startup
Har app mein ek `/api/health` ho:
- **Public:** sirf `{ ok, database }`
- **Logged-in owner:** extra config checks, jaise kaunse env set hain (values kabhi nahi)

---

## 4. Security baseline (har app mein compulsory)

Ye checklist QR Links ke audit (Nov 2026) se bani hai. Har point ek asli bug tha ya asli risk.

### 4.1 Authentication
- Passwords: **scrypt / bcrypt / argon2** (Node: `crypto.scryptSync(pw, salt, 32)`). Kabhi plain ya MD5/SHA1 nahi.
- Owner/admin compare `crypto.timingSafeEqual` se karo.
- Session cookie: `httpOnly`, `secure` (production), `sameSite: "lax"`, `path: "/"`, max 30 days.
- Token: `exp.uid.ver.signature` (HMAC-SHA256 with `SESSION_SECRET`). DB mein `token_ver`: password reset ya block hone pe `+1`, jisse purane sessions turant band ho jaate hain.
- Har request pe user DB se dobara padho (role / active / access), cookie ke data pe bharosa mat karo.
- Login brute-force brakes (sab bounded memory mein):
  - account + IP: 10 fails / 15 min
  - IP: 20 fails / 15 min
  - account (kisi bhi IP se): 50 fails / 15 min
  - global: 300 fails / 15 min
- Email exist nahi karta tab bhi same time lagao (`fakeVerify`), warna user enumeration ho sakti hai.
- Error message generic rakho: "Wrong email or password".

### 4.2 Authorization / RBAC
Roles ka pattern (QR Links jaisa):

| Permission | Owner | Team | Client editor |
|---|---|---|---|
| Users / roles manage | ✅ | ❌ | ❌ |
| Client create | ✅ | ✅ | ❌ |
| Client delete | ✅ | ❌ | ❌ |
| Slug / live on-off | ✅ | ✅ | ❌ |
| QR create / rename / delete | ✅ | ✅ | ❌ |
| Edit own page, design, offers | ✅ | ✅ | ✅ (sirf assigned) |
| Stats, leads, redeem | ✅ | ✅ | ✅ (sirf assigned) |
| Delete lead (data removal) | ✅ | ✅ | ❌ |

Code pattern, jo **har** API route mein ho:
```js
// lib/auth.js
export const can = {
  manageUsers: (s) => s?.role === "owner",
  manageQrs:   (s) => s?.role === "owner" || s?.role === "team",
  client: (s, clientId) => !!s && (s.clientIds === null || s.clientIds.includes(Number(clientId))),
};

export async function need({ client, perm } = {}) {
  const s = await getSession();
  if (!s) return { res: Response.json({ error: "unauthorized" }, { status: 401 }) };
  if (perm && !can[perm](s)) return { res: Response.json({ error: "forbidden" }, { status: 403 }) };
  if (client !== undefined) {
    if (!/^\d{1,10}$/.test(String(client))) return { res: Response.json({ error: "Not found" }, { status: 404 }) };
    if (!can.client(s, client)) return { res: Response.json({ error: "forbidden" }, { status: 403 }) };
  }
  return { s };
}

// route.js
const { s, res } = await need({ client: await clientOfLink(id) }); // child object -> parent tenant
if (res) return res;
```
**IDOR rule:** jab bhi `/x/:id` aaye, pehle us id ka owner (`client_id`) DB se nikaalo, phir permission check karo. Sirf URL ke `clientId` pe bharosa kabhi nahi.

### 4.3 Input validation
- Request body size limit (`body(req, maxBytes)`, default 1 MB). Upload routes pe alag limit.
- IDs: `^\d{1,10}$`, warna 404.
- Har field ka whitelist: enum (`in` list), hex color `^#[0-9a-f]{6}$`, lengths `.slice(0, N)`.
- URLs: sirf `http(s):`, `tel:`, `mailto:`, `upi:`, `sms:`. **`javascript:` kabhi nahi.**
- Phone (India): `^[6-9]\d{9}$`, `+91` / `0` hata ke normalize karo.
- JSON blobs (jaise QR design): sirf known keys copy karo, baaki drop.
- Images: sirf `data:image/(png|jpeg|webp);base64,...` ya re-encode karke. **SVG uploads nahi** (unme script ho sakti hai). Size cap lagao.

### 4.4 SQL injection
- Hamesha `?` placeholders: `q("SELECT … WHERE id = ?", [id])`.
- Dynamic `SET` / `ORDER BY` / column names sirf **whitelisted keys** se bano, user input se kabhi nahi.
- `LIKE` search: `%${s}%` sirf as a parameter.

### 4.5 XSS
- React escape karta hai, isliye `dangerouslySetInnerHTML` sirf apne generated scripts ke liye use karo, aur unme data `JSON.stringify(v).replace(/</g, "\\u003c")` se daalo.
- User ke likhe link `href` mein jaane se pehle URL scheme whitelist check ho.
- CSV export: `= + - @` se shuru hone wale cells ke aage `'` lagao (formula injection).

### 4.6 CSRF & CORS
- Cookies `SameSite=Lax`, **plus** `proxy.js` mein origin check:
```js
// proxy.js  (Next 16; Next <=15 mein file ka naam middleware.js aur function middleware)
import { NextResponse } from "next/server";
export function proxy(req) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return NextResponse.next();
  const origin = req.headers.get("origin");
  if (origin) {
    const allowed = new Set([req.headers.get("host"), req.headers.get("x-forwarded-host"), new URL(process.env.BASE_URL).host]);
    if (!allowed.has(new URL(origin).host)) return NextResponse.json({ error: "Cross-site request blocked" }, { status: 403 });
  }
  if (["POST", "PUT", "PATCH"].includes(req.method) && req.nextUrl.pathname.startsWith("/api/")) {
    if (!(req.headers.get("content-type") || "").startsWith("application/json"))
      return NextResponse.json({ error: "Content-Type must be application/json" }, { status: 415 });
  }
  return NextResponse.next();
}
export const config = { matcher: ["/api/:path*"] };
```
- **CORS policy: default kuch allow nahi.** Kisi public API ko dusri domain se call karna ho, to sirf allowlist:
```js
const ALLOWED = new Set(["https://rawone.in", "https://www.rawone.in"]);
function cors(req, res) {
  const o = req.headers.get("origin");
  if (o && ALLOWED.has(o)) {
    res.headers.set("Access-Control-Allow-Origin", o); // kabhi "*" + credentials nahi
    res.headers.set("Vary", "Origin");
    res.headers.set("Access-Control-Allow-Methods", "GET,POST");
    res.headers.set("Access-Control-Allow-Headers", "Content-Type");
  }
  return res;
}
```

### 4.7 Security headers (`next.config.mjs`)
```js
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://connect.facebook.net https://www.googletagmanager.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://www.facebook.com https://*.google-analytics.com https://*.googletagmanager.com",
  "connect-src 'self' https://www.facebook.com https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com",
  "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'self'",
].join("; ");

export default {
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: [
        { key: "Content-Security-Policy", value: CSP },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
        { key: "Strict-Transport-Security", value: "max-age=31536000" },
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
      ]},
      { source: "/admin/:path*", headers: [{ key: "X-Frame-Options", value: "DENY" }, { key: "Cache-Control", value: "no-store" }] },
      { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] },
    ];
  },
};
```
Naya third-party script (jaise Hotjar ya Razorpay) lagao to CSP mein uska domain add karna mat bhoolna.

### 4.8 Rate limiting & abuse
- Client IP = **right-most `X-Forwarded-For`** (proxy wala). Left-most value client khud bhej sakta hai, wo fake ho sakti hai.
- IP pe pura bharosa mat karo. Har limit ke saath ek **per-resource** limit bhi lagao, jaise per account, per offer, ya per visitor.
- In-memory limiter ka **size cap** hona chahiye (warna memory leak). Ek se zyada server ho to Redis (Section 8).
- Public forms (leads, claims) pe: bot UA block, per-IP cap, per-resource cap, aur duplicate pe unique key.
- Tracking events: per visitor 30 per minute max.

### 4.9 Privacy / DPDP Act 2023 (India)
- Consent checkbox **khud tick karna padega**, pehle se ticked nahi. Saath mein saaf likho ki data kis kaam aur kiske liye hai.
- Sirf zaroori data lo. Raw IP store mat karo, sirf hashed daily visitor ID.
- Data delete karne ka option ho (lead / user delete).
- Leads ka CSV kisko download karna allowed hai, ye role se control ho.
- Logs mein phone, email, password ya token mat likho.

### 4.10 Errors & logging
- User ko generic error, server log mein detail.
- Tracking / analytics ka code kabhi main flow (redirect, page) ko fail na kare: `try/catch` + `console.error`.
- Stack trace ya SQL error kabhi response mein nahi.

### 4.11 Dependencies
- `npm audit` = 0 before deploy (dev deps bhi, kyunki host unhe bhi scan karta hai). Hostinger → Security → **Vulnerabilities** page bhi har deploy ke baad dekho.
- Production app mein sirf runtime dependencies. Build/lint tools ya to `dependencies` mein (jo build ke liye zaroori hain) ya bilkul nahi.
- GitHub Dependabot on (Section 9.3).
- Naya package tabhi lo jab maintained ho (last release < 1 saal) aur license MIT/Apache/BSD ho.
- Lockfile (`package-lock.json`) commit karo, CI mein `npm ci` chalao.

---

## 5. Database

### 5.1 Schema conventions (MySQL / MariaDB)
```sql
CREATE TABLE IF NOT EXISTS things (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_id INT NOT NULL,                       -- tenant
  name VARCHAR(120) NOT NULL,
  status ENUM('active','off') NOT NULL DEFAULT 'active',
  meta MEDIUMTEXT NULL,                         -- JSON (validated in code)
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,  -- UTC (session time_zone = +00:00)
  INDEX idx_client_time (client_id, created_at),
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```
- Saare time **UTC** mein store karo, aur display karte waqt IST mein convert (`TZ_OFFSET_MIN`).
- Har tenant-scoped table mein `client_id` + index `(client_id, created_at)`.
- Unique rules DB level pe lagao (jaise `UNIQUE (offer_id, phone)`), sirf code pe bharosa mat karo.
- Event / log tables bahut badhti hain. Retention policy socho (jaise 13 mahine).

### 5.2 Migrations
- App start pe `CREATE TABLE IF NOT EXISTS` + **missing columns check** (`information_schema.COLUMNS`) → `ALTER TABLE ADD COLUMN`.
- `ER_DUP_FIELDNAME` catch karo (do process ek saath start ho sakte hain).
- Columns kabhi rename ya drop automatically mat karo. Uske liye manual migration aur pehle backup.

### 5.3 Connection pooling
```js
// lib/db.js (MySQL)
const pool = mysql.createPool({
  host: process.env.DB_HOST, user: process.env.DB_USER, password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME, connectionLimit: 8, waitForConnections: true,
  timezone: "Z", charset: "utf8mb4",
});
pool.pool.on("connection", (c) => c.query("SET time_zone = '+00:00'"));
globalThis.__pool ??= pool;   // dev hot-reload mein naye pools mat banao
```
- Shared / cloud hosting pe `connectionLimit` 5–10 rakho (MySQL max connections limited hote hain).
- **Vercel / serverless + Postgres:** Supabase ka **pooler** (transaction mode) URL use karo, direct DB URL nahi.

### 5.4 DB access
- Har app ka **alag DB user**, sirf apne DB pe rights.
- Hostinger pe "Remote MySQL" tabhi on karo jab zaroori ho, aur sirf specific IP allow karo.
- Supabase: har table pe **RLS on**, `service_role` sirf server pe.
- Backups: Hostinger daily backups on rakho. Bada change karne se pehle phpMyAdmin se manual export karo, aur wo export kabhi repo mein nahi.

---

## 6. Servers: VPS setup (Ubuntu 24.04)

### 6.1 Hardening (pehle din)
```bash
# 1. naya sudo user, root login band
adduser deploy && usermod -aG sudo deploy
# 2. SSH key (apne Mac pe):  ssh-keygen -t ed25519 -C "umang-mac"
#    phir:  ssh-copy-id deploy@<VPS_IP>
# 3. /etc/ssh/sshd_config
#    PermitRootLogin no
#    PasswordAuthentication no
#    PubkeyAuthentication yes
sudo systemctl restart ssh
# 4. Firewall: sirf 22, 80, 443
sudo ufw default deny incoming && sudo ufw default allow outgoing
sudo ufw allow OpenSSH && sudo ufw allow 80,443/tcp
sudo ufw enable
# 5. Brute-force protection + auto security updates
sudo apt install -y fail2ban unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```
**Kabhi publicly mat kholo:** MySQL 3306, Postgres 5432, Redis 6379, n8n 5678, app ports 3000+. Ye sab `127.0.0.1` pe chalein, aur bahar sirf Nginx ke through.

### 6.2 SSH config (Mac: `~/.ssh/config`)
```
Host rawone-vps
  HostName <VPS_IP>
  User deploy
  IdentityFile ~/.ssh/id_ed25519
  IdentitiesOnly yes
  ServerAliveInterval 60
```
Ab bas `ssh rawone-vps` likhna kaafi hai. Private key (`id_ed25519`) kabhi share ya upload mat karo.

### 6.3 Nginx reverse proxy (Node app / n8n)
```nginx
# /etc/nginx/sites-available/app.example.com
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

server {
  listen 80;
  server_name app.example.com;
  return 301 https://$host$request_uri;
}

server {
  listen 443 ssl http2;
  server_name app.example.com;
  # certbot --nginx -d app.example.com  (SSL auto-renew)

  client_max_body_size 5m;
  server_tokens off;

  location /api/ {
    limit_req zone=api burst=20 nodelay;
    proxy_pass http://127.0.0.1:3000;
    include /etc/nginx/snippets/proxy.conf;
  }

  location / {
    proxy_pass http://127.0.0.1:3000;
    include /etc/nginx/snippets/proxy.conf;
  }

  # optional: admin sirf office/ghar ke IP se
  # location /admin { allow <OFFICE_IP>; deny all; proxy_pass http://127.0.0.1:3000; include /etc/nginx/snippets/proxy.conf; }
}
```
```nginx
# /etc/nginx/snippets/proxy.conf
proxy_http_version 1.1;
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;   # real IP right-most pe
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Forwarded-Host $host;
proxy_set_header Upgrade $http_upgrade;                          # websockets (n8n)
proxy_set_header Connection "upgrade";
proxy_read_timeout 120s;
```
```bash
sudo ln -s /etc/nginx/sites-available/app.example.com /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d app.example.com
```

### 6.4 Process manager (Docker ke bina)
```bash
npm i -g pm2
pm2 start npm --name app -- start      # .env apne aap load ho (Next), ya: pm2 start ecosystem.config.js
pm2 save && pm2 startup                 # reboot ke baad bhi chale
pm2 logs app --lines 100
```

---

## 7. Docker (VPS pe)

### 7.1 `Dockerfile` (Next.js, standalone, non-root)
`next.config.mjs` mein `output: "standalone"` add karo.
```dockerfile
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:24-alpine AS run
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/public ./public
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "server.js"]
```
`.dockerignore`:
```
node_modules
.next
.git
.env
.env.*
*.zip
```

### 7.2 `docker-compose.yml` (app + MySQL + Redis + n8n)
```yaml
services:
  app:
    build: .
    restart: unless-stopped
    env_file: /etc/rawone/app.env          # repo ke bahar, chmod 600
    ports: ["127.0.0.1:3000:3000"]        # sirf localhost; Nginx bahar dikhayega
    depends_on: [db, redis]

  db:
    image: mysql:8.4
    restart: unless-stopped
    environment:
      MYSQL_DATABASE: app
      MYSQL_USER: app
      MYSQL_PASSWORD_FILE: /run/secrets/db_password
      MYSQL_ROOT_PASSWORD_FILE: /run/secrets/db_root_password
    secrets: [db_password, db_root_password]
    volumes: [dbdata:/var/lib/mysql]
    # ports nahi — DB bahar kabhi expose nahi

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: ["redis-server", "--requirepass", "${REDIS_PASSWORD}", "--appendonly", "yes"]
    volumes: [redisdata:/data]

  n8n:
    image: n8nio/n8n
    restart: unless-stopped
    ports: ["127.0.0.1:5678:5678"]
    environment:
      N8N_HOST: n8n.example.com
      N8N_PROTOCOL: https
      WEBHOOK_URL: https://n8n.example.com/
      N8N_ENCRYPTION_KEY: ${N8N_ENCRYPTION_KEY}   # kho gaya to saare credentials gaye; backup rakho
    volumes: [n8ndata:/home/node/.n8n]

volumes: { dbdata: {}, redisdata: {}, n8ndata: {} }
secrets:
  db_password: { file: /etc/rawone/secrets/db_password }
  db_root_password: { file: /etc/rawone/secrets/db_root_password }
```

---

## 8. Redis cache (jab zaroorat ho)

**Kab use karna hai:** ek se zyada app instances hon (shared rate limit / sessions), heavy query ka cache chahiye, ya queue banana ho.
**Kab nahi:** Hostinger Cloud Node app pe (wahan Redis nahi milta), ya chhote internal tools (in-memory limiter kaafi hai).

```js
// lib/cache.js
import Redis from "ioredis";
const redis = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 2 }) : null;

export async function cached(key, ttlSec, fn) {
  if (!redis) return fn();                       // fallback: no cache
  const hit = await redis.get(key).catch(() => null);
  if (hit) return JSON.parse(hit);
  const val = await fn();
  redis.set(key, JSON.stringify(val), "EX", ttlSec).catch(() => {});
  return val;
}

// shared rate limit
export async function rateLimit(key, max, windowSec) {
  if (!redis) return true;
  const n = await redis.incr(key);
  if (n === 1) await redis.expire(key, windowSec);
  return n <= max;
}
```
Rules: password zaroor (`requirepass`), sirf `127.0.0.1` pe bind, key mein tenant ID daalo (`c:{clientId}:stats:today`), aur har key pe TTL.

---

## 9. CI/CD

### 9.1 GitHub Action: lint + audit + build (har push / PR pe)
`.github/workflows/ci.yml`
```yaml
name: CI
on:
  push: { branches: [main] }
  pull_request:
permissions:
  contents: read
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with: { node-version: 24, cache: npm }
      - run: npm ci
      - run: npm run lint
      - run: npm audit --omit=dev --audit-level=high
      - run: npm run build
        env:
          # build ko DB nahi chahiye; dummy values
          ADMIN_PASSWORD: ci-dummy
          SESSION_SECRET: ci-dummy
      - name: Secret scan
        uses: gitleaks/gitleaks-action@v2
        env: { GITHUB_TOKEN: "${{ secrets.GITHUB_TOKEN }}" }
```

### 9.2 Deploy options

| Target | Kaise | Note |
|---|---|---|
| **Hostinger Cloud Node app** | hPanel → Web App → GitHub connect, auto-deploy on push. Ya zip upload (Deployments → Redeploy → Upload new files) | Ek hosting plan sirf **ek GitHub account** se connect hota hai. Env vars hPanel mein. Zip mein `node_modules`, `.next` aur `.env` mat daalo |
| **Vercel** | Repo import, `main` = production, PR = preview | Env per environment set karo. Preview pe production DB mat lagao |
| **VPS** | GitHub Action se SSH deploy (neeche wala workflow) | Deploy key read-only, SSH key GitHub Secrets mein |

VPS deploy workflow (`.github/workflows/deploy-vps.yml`):
```yaml
name: Deploy VPS
on:
  workflow_dispatch:          # manual button; auto chahiye to: push: { branches: [main] }
permissions: { contents: read }
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production   # GitHub Environment = approval + secrets
    steps:
      - name: SSH deploy
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          username: deploy
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /opt/app && git pull --ff-only
            docker compose up -d --build app
            docker image prune -f
```

### 9.3 Dependabot (`.github/dependabot.yml`)
```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: "/"
    schedule: { interval: weekly }
    open-pull-requests-limit: 5
  - package-ecosystem: github-actions
    directory: "/"
    schedule: { interval: monthly }
```

---

## 10. Access control (IAM) across services

| Service | Must-do |
|---|---|
| **GitHub** | 2FA on. Repos private. `main` pe branch protection (PR + CI pass). Personal Access Token sirf **fine-grained**, ek repo, expiry ke saath. VPS ke liye **read-only deploy key** |
| **Hostinger** | 2FA on. Strong unique password. Team ko apna login mat do (hPanel "Access" se alag user banao). Account hack ho chuka hai, isliye har mahine unknown users, cron jobs, FTP accounts aur `public_html` mein unknown files check karo |
| **Supabase** | Har table pe RLS. `service_role` sirf server pe. Org mein team members ko minimum role |
| **Vercel** | Team roles: viewer/developer. Production env sirf owner edit kare |
| **Meta / Google Ads / GA4** | Client assets Business Manager ke through share hon, personal login se nahi. System user tokens ki expiry rakho |
| **Apps (apne)** | RBAC (Section 4.2). Kisi ke jaate hi uska access **Block** karo, delete se pehle |
| **Password manager** | Saare credentials ek password manager mein (1Password / Bitwarden). WhatsApp ya Sheets mein nahi |

---

## 11. Infrastructure as code (Terraform), honest take

Abhi ke scale pe (Hostinger + 1 VPS + Vercel + Supabase) Terraform se faayde se zyada kaam badhega. Uski jagah:
- Har project ke `README.md` mein ek **"Infra" section**: domain, hosting, DB naam, env keys ki list, deploy steps, backup location.
- VPS setup ke commands ek `scripts/bootstrap-vps.sh` mein rakho, taaki naya server 15 minute mein ban jaye.

Terraform tab lagao jab Cloudflare DNS, Vercel projects aur Supabase projects bahut zyada ho jayein. Teeno ke official/community providers hain. Tab state file **remote** (encrypted) mein rakhna, repo mein kabhi nahi.

---

## 12. Incident response (agar kuch gadbad ho)

1. **Rok do:** app ko maintenance pe daalo, ya Hostinger mein site disable karo.
2. **Rotate karo:** `SESSION_SECRET` (sab logout), `ADMIN_PASSWORD`, DB password, API keys (OpenAI, Meta), GitHub tokens, SSH keys.
3. **Check karo:** unknown admin users, nayi PHP files / backdoors (`eval`, `base64_decode`), cron jobs, `.htaccess` redirects, DB mein unknown rows.
4. **Logs dekho:** hPanel runtime logs, Nginx access logs, login failures.
5. **Restore karo:** clean backup se, phir patch karke redeploy.
6. **Likho:** kya hua, kaise pakda, kya fix kiya. Aur is file mein naya rule add karo.

---

## 13. Pre-deploy checklist (har release)

- [ ] `npm run lint` → 0 errors
- [ ] `npm audit` → 0 (dev deps samet), deploy ke baad Hostinger Vulnerabilities page clean
- [ ] `npm run build` local pe pass
- [ ] Koi secret code / repo / zip mein nahi (`.env`, keys, dumps)
- [ ] Naye API routes mein `need()` + IDOR check + body size limit + input whitelist
- [ ] Naye public forms pe rate limit + bot check + consent (unticked)
- [ ] Naye third-party scripts CSP mein add kiye
- [ ] DB change: migration safe hai (sirf ADD, koi DROP nahi) aur backup liya
- [ ] Env vars hosting panel mein set hain, `BASE_URL` sahi hai
- [ ] Deploy ke baad: `/api/health` → `ok`, login, ek main flow (jaise QR scan → stats) test kiya
- [ ] Security headers check (`curl -sI https://<domain>/admin/login`)
- [ ] Phone pe asli test (QR / page)

---

## 14. Claude / AI ke saath kaam karte waqt

- Naya feature ya app: **pehle plan, phir go-ahead, phir code.**
- Is file ka link do: "ENGINEERING.md follow karo".
- Product, library, version ya pricing jaisi cheezein web-search karke confirm karo, memory se nahi.
- Passwords / tokens chat mein mat bhejo. Panel mein khud daalo, Claude ko sirf key ka naam batao.
- Har build ke end mein Claude se maango: test results, lint/audit output aur deploy steps.
- AI SMM SaaS platform ke repo mein is file ki **RAWONE-naam ke bina** wali copy rakho (branding alag rehni chahiye).

---
*v1.1 · Nov 2026 (linters out of hosted package) · QR Links security audit ke baad likhi gayi. Har incident ya naya lesson aaye to yahan update karo.*
