# QuoteUs.ca — Self-Hosted Deployment Guide

This archive (`quoteus-ca-source.tar.gz`) contains the full source code of
QuoteUs.ca, ready to deploy on any Node-capable host (VPS, AWS, GCP, Azure,
Render, Railway, Fly.io, DigitalOcean, etc.).

## 1. Requirements

| Component | Version |
|-----------|---------|
| Node.js   | >= 20.x |
| PostgreSQL | >= 14 (any managed Postgres: Neon, Supabase, RDS, etc.) |
| npm       | >= 10   |
| Disk      | ~500 MB after `npm install` |
| Memory    | 512 MB minimum (1 GB+ recommended) |

## 2. Extract

```bash
tar -xzf quoteus-ca-source.tar.gz
cd <extracted-folder>
npm install
```

## 3. Required Environment Variables

Create a `.env` file in the project root (do NOT commit it).

### Core (required)
```env
DATABASE_URL=postgres://USER:PASS@HOST:5432/DB
SESSION_SECRET=<a-long-random-string>
PORT=5000
NODE_ENV=production
```

### Object Storage (required — used for signed PDFs, doc uploads, binders)
The app currently uses Google Cloud Storage via the Replit object-storage
shim. For self-host you have two options:

**Option A — Google Cloud Storage** (drop-in compatible):
```env
DEFAULT_OBJECT_STORAGE_BUCKET_ID=your-gcs-bucket
PUBLIC_OBJECT_SEARCH_PATHS=your-gcs-bucket/public
PRIVATE_OBJECT_DIR=your-gcs-bucket/.private
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

**Option B — S3 / other** — replace `server/objectStorage.ts` and
`server/objectStorageHelper.ts` with your provider's SDK (AWS S3, Cloudflare R2,
Backblaze B2 all work). The interfaces are small and isolated.

### Google OAuth (required — admin/rep login)
```env
GOOGLE_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=...
GOOGLE_OAUTH_REDIRECT_URL=https://yourdomain.com/api/auth/google/callback
```
Configure the same redirect URL in your Google Cloud Console OAuth credentials.

### Stripe (required for lead credits + RG payments)
```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
```
Configure your Stripe webhook to point to:
`https://yourdomain.com/api/stripe/webhook`

### SMTP (required for all transactional email — signed PDFs, broker invites, binders)
```env
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASSWORD=...
SMTP_FROM="QuoteUs.ca <noreply@yourdomain.com>"
```

### Optional
```env
TUGO_API_KEY=...           # Travel insurance redirect
APP_BASE_URL=https://yourdomain.com
```

## 4. Initialize the Database

```bash
npm run db:push
```
This applies the Drizzle schema to your Postgres instance.

If `db:push` hangs (large schema), you can dump the schema with
`drizzle-kit generate` and apply manually with `psql`.

## 5. Build & Run

### Development
```bash
npm run dev
```
Serves on `http://localhost:5000`.

### Production
```bash
npm run build      # bundles client (Vite) + server (esbuild) into dist/
npm start          # runs dist/index.js
```
Production server serves both API and static client on the same port.

### Process manager (recommended)
Use `pm2`, `systemd`, or your platform's process manager:
```bash
pm2 start npm --name quoteus -- start
pm2 save
pm2 startup
```

## 6. Reverse Proxy / TLS (production)

Put Nginx, Caddy, or Cloudflare in front. Example Nginx block:
```nginx
server {
  server_name quoteus.ca www.quoteus.ca;
  client_max_body_size 50M;        # for doc / PDF uploads
  location / {
    proxy_pass http://127.0.0.1:5000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```
Use `certbot` for free Let's Encrypt TLS.

## 7. First-Run Setup

1. Visit `https://yourdomain.com/login` and sign in with Google.
2. The first user gets no role by default. Promote yourself in the DB:
   ```sql
   UPDATE users SET role = 'admin' WHERE email = 'you@yourdomain.com';
   ```
3. Log out / back in. You'll see the `/admin` CRM and `/rep` dashboard.
4. Go to **Admin → Settings** to configure: lead pricing, ad placements,
   broker tiers, social links, signature template, etc.

## 8. SEO Assets

The following are pre-built and served at the site root — no extra config:
- `/robots.txt`
- `/sitemap.xml`
- `/site.webmanifest`
- Full JSON-LD (InsuranceAgency, FAQ, BreadcrumbList) embedded in `index.html`

After going live, submit `https://yourdomain.com/sitemap.xml` to:
- Google Search Console
- Bing Webmaster Tools

## 9. Backups

- **DB**: schedule `pg_dump` daily (or use your managed-Postgres snapshots).
- **Object Storage**: configure GCS/S3 bucket versioning + lifecycle.

## 10. Updating

This is a normal Node + Vite + Postgres app. Pull or replace source, run
`npm install`, then `npm run db:push && npm run build && pm2 restart quoteus`.

## Project Structure

```
client/        React 18 + TypeScript + Vite frontend
  public/      Static assets (robots.txt, sitemap.xml, manifest, favicon)
  src/
    pages/     Route-level components (Wouter routing)
    components/Reusable + shadcn/ui components
    hooks/     Custom hooks (use-seo, use-toast, use-upload, ...)
    lib/       AuthContext, QuoteContext, API client, utils
server/        Node.js + Express + TypeScript (ESM)
  index.ts            Entry point
  routes.ts           All API routes
  storage.ts          IStorage + Drizzle implementation
  objectStorage*.ts   GCS adapter
  ...
shared/
  schema.ts           Drizzle table defs + Zod schemas (single source of truth)
scripts/        One-off scripts (e.g. signature-stamp test)
```

## Support

The original source includes `replit.md` with a full feature inventory.
For Replit-specific deployment, see https://replit.com/deployments.
