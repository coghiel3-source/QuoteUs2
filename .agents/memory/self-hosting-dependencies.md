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
- DB schema must be migrated when pulling updates (npm run db:push, or the
  specific ALTER). July 2026 additions:
  `ALTER TABLE rg_payments ADD COLUMN IF NOT EXISTS stripe_invoice_id varchar;`
  `ALTER TABLE customer_payments ADD COLUMN IF NOT EXISTS policy_number text;`
  Without stripe_invoice_id, Stripe reconciliation inserts throw and sync
  silently reports 0 (errors caught per-location). Without policy_number,
  POST /api/customer/payment throws — customer portal payments break outright.
  The Billing Central payment-allocation feature needs a new table (drizzle
  `db:push` is blocked in this repl by an unrelated interactive prompt, so create
  it directly): `CREATE TABLE IF NOT EXISTS payment_allocations (id varchar
  PRIMARY KEY DEFAULT gen_random_uuid(), payment_id varchar NOT NULL,
  payment_source varchar(20) NOT NULL DEFAULT 'customer', target_type varchar(20)
  NOT NULL, target_id varchar NOT NULL, target_label text NOT NULL, amount
  numeric(10,2) NOT NULL, note text, created_by varchar, created_at timestamp
  DEFAULT now() NOT NULL);` — match the exact columns to shared/schema.ts
  `paymentAllocations` if it drifts.
  Allocations are now source-polymorphic: `payment_id` points to either
  `customer_payments` OR `rg_payments`, disambiguated by `payment_source`
  ('customer'|'rg'). There is deliberately NO FK on `payment_id` (a customer-only
  FK can't cover both sources). If an older DB still has the FK, drop it:
  `ALTER TABLE payment_allocations DROP CONSTRAINT IF EXISTS
  payment_allocations_payment_id_fkey;` and add the column if missing:
  `ALTER TABLE payment_allocations ADD COLUMN IF NOT EXISTS payment_source
  varchar(20) NOT NULL DEFAULT 'customer';`
  **Why no FK is safe:** no payment-delete methods exist in storage, so the old
  ON DELETE CASCADE never fired anyway; integrity is enforced in
  createPaymentAllocation (row-locks the source payment, validates against its
  amount).

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
