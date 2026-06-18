# QuoteUs.ca — Self-Hosted Deployment Guide

A full Node + React + Postgres app. Runs on any host that supports Node 20+.
This archive contains the complete website source code — nothing else needed.

---

## 1. Requirements
| Component  | Version |
|------------|---------|
| Node.js    | >= 20.x |
| PostgreSQL | >= 14   |
| npm        | >= 10   |

---

## 2. Extract & Install
```
tar -xzf quoteus-ca-website.tar.gz
cd <extracted-folder>
npm install
```

---

## 3. Database — Create & Initialize

### 3a. Create an empty Postgres database
On your DB host (Neon, Supabase, AWS RDS, DigitalOcean, or local Postgres):
```sql
CREATE DATABASE quoteus;
CREATE USER quoteus_app WITH ENCRYPTED PASSWORD 'change-me';
GRANT ALL PRIVILEGES ON DATABASE quoteus TO quoteus_app;
```
Grab the connection string:
`postgres://quoteus_app:change-me@HOST:5432/quoteus`

### 3b. Put it in `.env`
Create a file called `.env` in the project root (see full template in §4).

### 3c. Push the schema
This creates every table the app needs (users, quotes, rg_locations, rg_leads,
rg_organizations, rg_org_members, service_agreements, system_settings, etc.):
```
npm run db:push
```
If it prompts about rename vs create, choose **create**.

### 3d. Create your first admin
After your first login (any method), promote yourself:
```sql
UPDATE users SET role='admin' WHERE email='you@yourdomain.com';
```
Log out and back in — you'll now see `/admin` and `/rep` routes.

---

## 4. Environment (`.env`)
```env
# ── Required ───────────────────────────────────────────────
DATABASE_URL=postgres://USER:PASS@HOST:5432/DB
SESSION_SECRET=<long-random-string>
PORT=5000
NODE_ENV=production
# Your site's public address — REQUIRED on any non-Replit host.
# Used to build OAuth callback URLs, Stripe redirect/webhook URLs, and
# password-reset links. No trailing slash.
APP_BASE_URL=https://yourdomain.com
# Optional: bind address. Defaults to 0.0.0.0 (correct for almost all hosts).
# HOST=0.0.0.0

# ── Object Storage (GCS by default; swap server/objectStorage*.ts for S3/R2) ──
DEFAULT_OBJECT_STORAGE_BUCKET_ID=your-bucket
PUBLIC_OBJECT_SEARCH_PATHS=your-bucket/public
PRIVATE_OBJECT_DIR=your-bucket/.private
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json

# ── Google OAuth (admin/rep/customer login) ───────────────
GOOGLE_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=...
GOOGLE_OAUTH_REDIRECT_URL=https://yourdomain.com/api/auth/google/callback

# ── Stripe (lead credits + RG payments) ───────────────────
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
# Configure your Stripe webhook to point at:
#   https://yourdomain.com/api/stripe/webhook

# ── SMTP (signed PDFs, invites, binders, notifications) ───
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASSWORD=...
SMTP_FROM="QuoteUs.ca <noreply@yourdomain.com>"
```

---

## 5. Build & Run
```
npm run build       # bundles client + server into dist/
npm start           # serves API + frontend on $PORT
```
Recommended (keeps it running):
```
npm i -g pm2
pm2 start npm --name quoteus -- start
pm2 save
pm2 startup
```

> **The app entry point is `dist/index.cjs`** (created by `npm run build`).
> `npm start` runs `NODE_ENV=production node dist/index.cjs`.

---

## 5b. "It works on my VPS but not on my other host" — Read This

This is a **Node.js + PostgreSQL** app. It runs the same way everywhere, but
**managed / cPanel-style hosts start apps differently than a VPS**, and that
is almost always the cause when a VPS works and another host doesn't. Check
these in order:

1. **Did the build actually run?**
   Many managed hosts run `npm install` but **not** `npm run build`, so `dist/`
   never gets created and the app can't start (or shows a blank page / "Could
   not find the build directory"). Open the host's terminal and run
   `npm run build` manually. The folder `dist/index.cjs` and `dist/public/`
   must exist afterward.

2. **Were dev dependencies installed?**
   The build needs `vite`, `esbuild`, and `tsx` (listed under devDependencies).
   If your host runs `npm install --production` / `--omit=dev`, the build tools
   are missing. Run a full `npm install` (no production flag) **before**
   building, then you can prune afterward if you like.

3. **Is `NODE_ENV` set to `production`?**
   If it isn't, the server tries to start the Vite **dev** server, which isn't
   bundled for production → instant crash. `npm start` sets this automatically,
   but if your host launches the file directly (see #4) you must set
   `NODE_ENV=production` in the host's environment-variables panel.

4. **Is the startup file correct?**
   cPanel "Setup Node.js App" (Phusion Passenger) does **not** run `npm start`.
   It launches one file directly. Set the **Application startup file** to
   `dist/index.cjs` (after building). Set **Application mode = Production**.

5. **Did you set `APP_BASE_URL`?**
   On any non-Replit host this must be your real domain
   (e.g. `https://yourdomain.com`). Without it, Google login redirects, Stripe
   checkout/return URLs, the Stripe webhook, and password-reset links all fall
   back to `http://localhost:5000` and will fail. (The app no longer crashes on
   the port-binding step on managed hosts — that Replit-only option is now
   disabled automatically off-Replit.)

6. **Is the database reachable from this host?**
   A VPS usually talks to a Postgres on the same box. A managed host may need:
   - the DB host to allow remote connections / your host's IP, and
   - `?sslmode=require` appended to `DATABASE_URL` for hosted Postgres
     (Neon, Supabase, RDS). Example:
     `postgres://user:pass@host:5432/db?sslmode=require`

7. **Run `npm run db:push` once** against the new database so all tables exist.
   Symptom if skipped: pages load but every action errors with
   "relation ... does not exist".

8. **File uploads (binders, hero image, signatures)** are written to
   `client/public/uploads/`. On hosts with a read-only or ephemeral filesystem
   those writes fail. Use a host that allows writing to disk, or configure the
   built-in object storage (GCS) env vars in §4.

If the app still won't boot, get the **actual error** — that's the fastest
path. On Passenger/cPanel look at `stderr.log` in your app folder; with pm2 run
`pm2 logs quoteus`; running directly, just run `npm start` in the terminal and
read the first error printed.

---

## 6. Reverse Proxy + TLS (Nginx example)
```nginx
server {
  server_name yourdomain.com www.yourdomain.com;
  client_max_body_size 50M;

  location / {
    proxy_pass http://127.0.0.1:5000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```
Then:
```
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

## 7. All User Roles & Login Routes

| Role     | Where they log in        | What they see                                   |
|----------|--------------------------|-------------------------------------------------|
| Customer | `/login`                 | Their own quotes/policies in `/customer-portal` |
| Broker   | `/login`                 | Lead inbox, credits, binders                    |
| Rep      | `/login` → `/rep`        | **Rent Guarantee** dashboard (locations, leads, tenants, documents, agreements, commission) |
| Partner  | `/login`                 | Lead referrals + redirect analytics             |
| Manager  | `/login` → `/admin`      | All admin features except super-admin gates     |
| Admin    | `/login` → `/admin`      | Everything: users, leads, RG, billing, settings, hero image, custom CSS, social media, updates |

**Rent Guarantee login** is built in:
- Reps log in at `/login` and land on `/rep` (the Rep Dashboard).
- Admins/managers can create rep accounts from **Admin CRM → Users → Add User → role: rep**.
- RG organizations group reps under a Principal who can see all their team's
  locations and leads (Admin CRM → Settings → RG Organizations).
- Public-facing RG quote form lives at `/rent-guarantee`.

Login methods supported:
- Email + password (built in)
- Google OAuth (if `GOOGLE_CLIENT_*` env vars are set)
- One-time code via email (admin-toggleable per role in Settings)

---

## 8. SEO — Already Built In

No extra configuration needed. The build ships with:

- `/robots.txt`               — crawl rules
- `/sitemap.xml`              — all public pages
- `/site.webmanifest`         — PWA / favicon manifest
- Per-page `<title>`, meta description, keywords, canonical, hreflang
  via `client/src/hooks/use-seo.ts`
- Open Graph + Twitter Card tags + JSON-LD organization schema in
  `client/index.html`

After launch:
1. Visit `https://yourdomain.com/sitemap.xml` to confirm it loads.
2. Submit the same URL to **Google Search Console**
   (https://search.google.com/search-console) and **Bing Webmaster Tools**.
3. (Optional) Add Google Analytics or Plausible by pasting the tag into
   **Admin CRM → Settings → Custom CSS / Head Tags**.

To change the home page hero image at any time:
**Admin CRM → Settings → Main Site Image (Home Page Hero) → Upload**.

---

## 9. Updating in Place
```
npm install
npm run db:push      # apply any new schema changes
npm run build
pm2 restart quoteus
```

---

## 10. Backups (recommended)
- **Database:** nightly `pg_dump quoteus > backups/quoteus-$(date +%F).sql`
- **Uploads:** sync `client/public/uploads/` (hero images, binders, signatures)
  to S3 / GCS / Backblaze using `rclone` or `aws s3 sync`.

---

## 11. Project Structure
```
client/        React 18 + TS + Vite (pages/, components/, hooks/, lib/)
server/        Node + Express + TS (routes.ts, storage.ts, objectStorage*.ts)
shared/        schema.ts — Drizzle + Zod (single source of truth)
scripts/       One-off scripts
replit.md      Feature inventory / architecture overview
DEPLOY.md      (this file)
```

---

## 12. Quick Troubleshooting
| Symptom                          | Fix                                                    |
|----------------------------------|--------------------------------------------------------|
| "relation X does not exist"      | Run `npm run db:push` again                            |
| 502 from Nginx                   | `pm2 logs quoteus` — likely missing env var            |
| OAuth redirect mismatch          | Update `GOOGLE_OAUTH_REDIRECT_URL` + Google Console    |
| Stripe webhook 400s              | `STRIPE_WEBHOOK_SECRET` must match the Stripe dashboard|
| Email not sending                | Verify SMTP creds; check logs for `[SMTP not configured]` |
| Hero image upload 403            | Logged-in user must be admin or manager                |

Questions? Look at `replit.md` for a high-level architecture overview.
