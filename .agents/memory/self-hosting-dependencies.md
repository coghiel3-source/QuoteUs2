---
name: Self-hosting off Replit (Hostinger / WHC etc.)
description: What works vs breaks when QuoteUs runs on third-party hosting without Replit, and the env/config needed.
---

# Self-hosting QuoteUs off Replit

No Replit subscription is needed to run the app on a third-party server. The core
(site, quote forms, CRM, email/SMTP configured from DB, email + Google auth,
Postgres via DATABASE_URL) runs anywhere. The app does NOT crash without Replit
services — failures are isolated to specific request handlers.

## Runs anywhere
- File uploads use multer disk storage under client/public/uploads, served by
  express.static("/uploads"). Binders, hero images, rep/broker docs, ad images all
  work on any host.
- Auth (email + Google OAuth) works; Google callback URL is derived from APP_BASE_URL.

## Needs own credentials set on the host
- Stripe: the Replit Connector path (sidecar token via REPLIT_CONNECTORS_HOSTNAME)
  only works while running on Replit. Off-Replit set STRIPE_SECRET_KEY +
  STRIPE_PUBLISHABLE_KEY env vars, OR save keys in DB via Admin -> Settings ->
  Connections. Credential priority: env vars > DB system_settings > Replit connector.
- Set APP_BASE_URL=https://yourdomain so Stripe webhook, Google callback, and
  checkout redirect URLs use the correct host.
- DB schema must be migrated when pulling updates. E.g. rg_payments gained
  stripe_invoice_id (July 2026): run
  `ALTER TABLE rg_payments ADD COLUMN IF NOT EXISTS stripe_invoice_id varchar`
  (or npm run db:push) on the self-host DB, otherwise Stripe reconciliation
  inserts throw and the sync silently reports 0 (errors are caught per-location).

## Breaks off-Replit until changed
- Replit Object Storage uses a sidecar at http://127.0.0.1:1106 plus
  PRIVATE_OBJECT_DIR / PUBLIC_OBJECT_SEARCH_PATHS — none of which exist off-Replit.
  The e-signature / service-agreement document storage (persistBufferToStorage /
  persistLocalFileToStorage producing /objects/* URLs) depends on it and will throw
  on a third-party host. Fix: route those writes to local disk like the other
  /uploads/* features (or an S3-compatible store). readFileFromAnyPath already reads
  legacy /uploads/* from disk, so only the write paths need switching.

**Why:** the user repeatedly self-hosts this app on their own server (Hostinger /
Web Hosting Canada). Knowing the exact Replit-only seams avoids re-investigating
each time and prevents promising "fully works off Replit" without the object-storage caveat.
