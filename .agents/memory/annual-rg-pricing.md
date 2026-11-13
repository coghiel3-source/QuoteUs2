---
name: Rent Guarantee additive pricing
description: Annual and monthly deductions add the existing Total amount to the RG amount.
---

For Rent Guarantee → Pricing → Annual, preserve the existing Total % input and add its dollar amount to the RG dollar amount for Total Deduction. At $25,800 annual rent, Total 4.5% = $1,161 and RG 4.5% = $1,161; the required annual deduction is $2,322.

**Why:** The user corrected an implementation that initialized Total % to the commission-only amount (zero by default). They specifically require the two existing $1,161 amounts added, not a zero amount plus RG.

The user subsequently requested the same calculation for monthly pricing. At $2,150 monthly rent, Total 4.5% = $96.75 and RG 4.5% = $96.75; monthly deduction is $193.50.

**How to apply:** Keep both breakdowns and payment defaults consistent with these sums. Preserve the existing storage mapping (Total % = RG rate + stored commission) so saving/reopening does not progressively increase rates.

Admins must be able to manually set percentages starting at 0%, including existing locations.

**Why:** The user explicitly requested removing the minimum percentage restriction. Zero is intentional, not a missing value.

**How to apply:** Do not replace saved zero rates with global defaults. Total and RG inputs may independently be zero; the legacy saved difference may therefore be negative even though actual percentage inputs and deduction amounts are nonnegative.

Customer-facing Rent Guarantee invoices must show dollar amounts without a pricing rate column or pricing percentages. Include the supplied new/existing tenant eligibility explanation above the disclaimer.

**Why:** The user requested amount-only invoices and explicit eligibility disclosure; this is a presentation rule, not a change to underlying rates or deduction calculations.

**How to apply:** Keep PDF, email, and online invoice review consistent. The eligibility requirement that rent not exceed 45% of gross household income remains visible; it is not a pricing rate.
