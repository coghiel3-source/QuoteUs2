import type Stripe from "stripe";
import { storage } from "./storage";
import type { RgLocation } from "@shared/schema";

export function generateTrackingCode(planType: string): string {
  const prefix = planType === "annual" ? "RGA" : "RGM";
  const year = new Date().getFullYear();
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return `${prefix}-${year}-${code}`;
}

// Stripe's Basil API (2025-08-27) removed the top-level Invoice.payment_intent field.
// Read the payment intent from the expanded invoice.payments list instead, falling
// back to the legacy field for older API versions.
export function extractInvoicePaymentIntentId(inv: any): string | null {
  if (typeof inv?.payment_intent === "string") return inv.payment_intent;
  for (const p of inv?.payments?.data ?? []) {
    const pi = p?.payment?.payment_intent;
    if (typeof pi === "string") return pi;
    if (pi?.id) return pi.id;
  }
  return null;
}

// For a subscription checkout session, resolve the first invoice's id and payment
// intent so the payment row can be deduped against later invoice syncs.
export async function getSubscriptionCheckoutPaymentDetails(
  stripe: Stripe,
  session: any,
): Promise<{ stripeInvoiceId?: string; stripePaymentIntentId?: string }> {
  const out: { stripeInvoiceId?: string; stripePaymentIntentId?: string } = {};
  if (!session?.invoice) return out;
  const invId = typeof session.invoice === "string" ? session.invoice : session.invoice.id;
  out.stripeInvoiceId = invId;
  try {
    const inv = await stripe.invoices.retrieve(invId, { expand: ["payments"] });
    const intentId = extractInvoicePaymentIntentId(inv);
    if (intentId) out.stripePaymentIntentId = intentId;
  } catch {
    // Best-effort: the invoice id alone is still a valid dedupe key
  }
  return out;
}

// Pull all paid Stripe invoices for a location's subscription and record any that
// are missing from rg_payments. Returns the number of payments created.
export async function syncSubscriptionInvoicesForLocation(
  stripe: Stripe,
  location: RgLocation,
  createdBy: string,
): Promise<number> {
  if (!location.stripeSubscriptionId) return 0;
  const invoices = await stripe.invoices.list({
    subscription: location.stripeSubscriptionId,
    status: "paid",
    limit: 100,
    expand: ["data.payments"],
  });
  if (invoices.data.length === 0) return 0;

  const locPayments = await storage.getPaymentsForLocation(location.id);
  let synced = 0;

  for (const inv of invoices.data) {
    const intentId = extractInvoicePaymentIntentId(inv);
    const periodStart = inv.period_start ? new Date(inv.period_start * 1000) : new Date();
    const periodLabel = periodStart.toLocaleString("en-CA", { month: "long", year: "numeric" });

    // Dedupe: invoice id (strongest), then payment intent, then a paid payment for the
    // same subscription and period (covers rows created before invoice ids were stored)
    const alreadyRecorded = locPayments.some(lp =>
      (lp.stripeInvoiceId && lp.stripeInvoiceId === inv.id) ||
      (intentId && lp.stripePaymentIntentId === intentId) ||
      (lp.status === "paid" && lp.stripeSubscriptionId === location.stripeSubscriptionId && lp.periodLabel === periodLabel)
    );
    if (alreadyRecorded) continue;

    let trackingCode = generateTrackingCode("monthly");
    for (let i = 0; i < 5; i++) {
      const ex = await storage.getRgPaymentByTrackingCode(trackingCode);
      if (!ex) break;
      trackingCode = generateTrackingCode("monthly");
    }

    await storage.createRgPayment({
      locationId: location.id,
      trackingCode,
      planType: "monthly",
      amountCents: inv.amount_paid,
      landlordEmail: location.landlordEmail || "",
      landlordName: location.landlordName || "",
      description: `Monthly RG Premium – ${periodLabel} (auto)`,
      periodLabel,
      createdBy,
      status: "paid",
      stripeSubscriptionId: location.stripeSubscriptionId,
      stripePaymentIntentId: intentId,
      stripeInvoiceId: inv.id,
      paidAt: new Date(inv.status_transitions?.paid_at ? inv.status_transitions.paid_at * 1000 : Date.now()),
    } as any);
    synced++;
  }

  return synced;
}
