---
name: Stripe Basil API quirks (apiVersion 2025-08-27)
description: Field changes in the pinned Stripe Basil API version that silently break invoice/payment code.
---

# Stripe Basil API (2025-08-27.basil) quirks

The Stripe client pins `apiVersion: '2025-08-27.basil'` (stripe SDK v20).

## Invoice.payment_intent was removed
- Basil removed the top-level `Invoice.payment_intent` field. Reading it via
  `(inv as any).payment_intent` compiles but is always `undefined` at runtime —
  this made subscription-invoice sync dead code for months (always synced 0).
- Correct path: list/retrieve invoices with `expand: ['data.payments']` /
  `expand: ['payments']`, then read
  `inv.payments.data[].payment.payment_intent` (string OR expanded object).
- Checkout `Session.payment_intent`, `Session.payment_status`, and
  `Session.invoice` still exist on Basil.
- A tolerant extractor lives in the RG Stripe sync module — reuse it instead of
  reading invoice payment intents directly.

**Why:** `as any` casts hide removed-field bugs from tsc, and dev has no Stripe
keys so these paths can't be exercised locally — the bug only shows in
production as "Stripe payments never appear."

**How to apply:** whenever touching Stripe invoice/payment code, verify field
existence against `node_modules/stripe/types/*.d.ts` for the pinned version;
never trust `(x as any).field` reads. Prefer invoice id as the dedupe key for
recorded payments (stored in `rg_payments.stripe_invoice_id`).
