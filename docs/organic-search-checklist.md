# Organic search launch checklist

## Before: live Hostinger HTML

The initial responses below were fetched directly from `https://quoteus.ca`, without JavaScript. Each priority URL returned 200, had a self-referencing canonical, had no `noindex` directive, and was present in the XML sitemap. Each had a visible content heading and real links in the raw HTML; this is a crawl-readiness check, not a Google indexing verdict.

| Path | Title (before) | H1 (before) | Initial HTML links |
| --- | --- | --- | ---: |
| `/` | Insurance Quotes in Ontario & Rent Guarantee \| QuoteUs.ca | Insurance made simple for Canadians. | 45 |
| `/auto` | Auto Insurance Quotes in Ontario \| QuoteUs.ca | Auto Insurance Quote | 32 |
| `/rent-guarantee` | Rent Guarantee for Canadian Landlords \| QuoteUs.ca | Protect Your Rental Income. Sleep Easy. | 35 |
| `/rent-clock` | The Rent Clock \| QuoteUs.ca Rent Guarantee | Rent stops. Your bills don’t. | 11 |
| `/rent-guarantee-guide` | Landlord Guide to Rent Guarantee & Unpaid Rent \| QuoteUs.ca | Rent Guarantee for Canadian Landlords | 37 |

`/robots.txt` returned text allowing public crawls and pointing to the main sitemap. `/sitemap.xml` returned valid XML with 17 URLs. `/guides` and an invented missing path returned 404 before this update.

## After: local production build

The production static handler tests confirmed 200 responses with prerendered HTML for all 18 public routes and a real 404 for unknown paths. The route registry drives canonical URLs and the sitemap. Priority pages kept their previous titles and main headings except `/rent-clock`, which now uses “Unpaid Rent Calculator for Landlords”. Initial HTML link counts in the built pages: homepage 46, auto 34, Rent Guarantee 38, Rent Clock 11, existing landlord guide 38, new Guides & Tools index 38. The build tests verified both quote form fragment targets and the links back from those service pages.

## After: what to verify on the deployed revision

- Repeat the checks above on the exact Dokploy revision. Compare the canonical, index directives, title, H1 and sitemap entry for each URL; verify a random unknown route still returns 404. Check quote and guide links in **View Source**, not only the browser inspector. The preview is not proof of a live deploy.
- `/guides` should join the sitemap and show both sections, with working links to the existing guide, calculator and quote forms. The four draft paths must remain absent from the sitemap, HTML links and public routes until approved.
- `/rent-clock` should show **Unpaid Rent Calculator for Landlords**, the $2,500 × 1 × 4 example, and the illustrative disclosure. Test the inputs with those values and expect `$10,000.00`; then change months to 5 and expect `$12,500.00`. Check province selection and the embed. Neither view should show a one-day payout claim.
- Using a Dokploy staging deployment and a clearly labelled test lead, follow the auto and landlord links and verify both forms open. Submit one valid quote of each type, check that it is saved and routed normally, and confirm an invalid submission does not produce a success event. Do not submit unapproved test leads to the live CRM.

## Search Console

1. Open [Google Search Console](https://search.google.com/search-console/) and select the verified `quoteus.ca` Domain property or `https://quoteus.ca/` URL-prefix property.
2. Select **Sitemaps**, submit `https://quoteus.ca/sitemap.xml` (or `sitemap.xml` if the property prefix is shown), and confirm **Success**.
3. Paste each full priority URL into the top **URL Inspection** bar. Record whether **URL is on Google**, the reported reason if it is not, last crawl date, and Google-selected canonical. See [Google’s URL Inspection instructions](https://support.google.com/webmasters/answer/9012289).
4. For a missing or changed page, use **Test Live URL** to check current access. It does not confirm indexing. After resolving issues, use **Request Indexing** for updated priority URLs. Requesting does not guarantee inclusion. Repeat for each guide only after approval and deployment.

## Measurement

- Keep the existing GTM container and Google Ads `generate_lead` conversion. For GA4, create custom-event triggers for `quote_started` and `quote_submitted` and send matching GA4 events. Mark only `quote_submitted` as the quote completion key event, not `generate_lead` (which can include general contact enquiries). The only parameter for these events is `insurance_type`, a fixed label derived from the public route; do not attach form values, contact data or unfiltered page URLs.
- Use Tag Assistant and GA4 DebugView on staging to check one start on the first edit, no completion on failed validation, and one completion after a successful quote save. Verify GTM changes are published and collection works before reporting a baseline.
- Before the guide release, export a dated 28-day baseline from Search Console **Performance → Search results** (Web search impressions and clicks, sitewide and for the five priority URLs). In GA4, use the same dates and filter to **Session default channel group = Organic Search**; record `quote_submitted` counts sitewide and by landing page. The existing Ads event is not a substitute for this baseline. If compatible historical data is unavailable, mark it unavailable and start the measured baseline after tagging is verified—not zero.
- At 30, 60 and 90 days after guide release, compare equivalent 28-day windows. Report impressions, clicks, completed quotes and the organic quote completion rate (sessions with `quote_submitted` divided by organic sessions). Track the four guide landing pages as a separate group; note consent or tagging changes, seasonality, and low volumes.
