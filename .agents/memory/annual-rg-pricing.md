---
name: Annual Rent Guarantee pricing
description: Annual percentage inputs are additive; monthly pricing is unchanged.
---

For Rent Guarantee → Pricing → Annual, preserve the existing Total % input and add its dollar amount to the RG dollar amount for Total Deduction. At $25,800 annual rent, Total 4.5% = $1,161 and RG 4.5% = $1,161; the required annual deduction is $2,322.

**Why:** The user corrected an implementation that initialized Total % to the commission-only amount (zero by default). They specifically require the two existing $1,161 amounts added, not a zero amount plus RG.

**How to apply:** Keep the annual breakdown and payment default consistent with this sum. Preserve the existing storage mapping (Total % = RG rate + stored commission) so saving/reopening does not progressively increase rates. Monthly pricing remains unchanged.
