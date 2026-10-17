# QuoteUs Google Tag Manager replacement

This update supersedes the previous direct Google Ads installation.

## Website changes
- client/index.html loads GTM-PZV6TJN6 once near the top of head, immediately after
  the character encoding declaration. The standard noscript iframe follows body.
- The direct gtag.js loader, AW configuration and gtag event calls are removed.
- Successful public enquiry saves push `{event: "generate_lead", transaction_id: id}`
  to dataLayer. No contact details or form contents are added to this event.
- Rent Clock events retain their rent_clock_* names through dataLayer.
- Failed submissions, visits and staff lead creation do not generate lead events.
- Event queuing works before the remote container finishes loading.

## Required GTM configuration (not performed by this code update)
Open container GTM-PZV6TJN6. Preserve existing consent controls.
1. Check existing tags first to avoid duplicates.
2. Configure the Google tag for AW-18512103274 and conversion linking as required
   by your Google Ads setup.
3. Configure a Google Ads Conversion Tracking tag:
   - Conversion ID: 18512103274
   - Conversion Label: Sh5ZCPDtlZwdEOqOoftE
   - Transaction ID: a Data Layer Variable named transaction_id (version 2).
   - Trigger: Custom Event with exact event name generate_lead.
4. Do NOT trigger that conversion on All Pages, submit-button clicks, or the
   separate rent_clock_application_submitted event; that risks false/duplicate leads.
5. Preview with Tag Assistant and verify before publishing the container.
   Any real test enquiry may count as a conversion; clearly mark test enquiries.
6. Configure desired Rent Clock measurement separately in the container.

## Hostinger deployment
Merge the source patch into the GitHub branch Hostinger deploys.
The patch assumes the earlier successful-enquiry tracking update is installed;
verify QuoteContext calls trackGoogleAdsLead(newQuote.id) after the API succeeds.
Use updated-source for manual review if the patch conflicts.
Run npm run check and npm run build, then restart using npm start.
For managed Node.js hosting use the quoteus.ca Dashboard > Deployments > Redeploy
with the updated GitHub branch. ZIP deployments must use newly updated complete
application source; this update kit is NOT a standalone website upload.
Do not overwrite live uploads, database, secrets or host configuration.

After deployment verify quoteus.ca's source contains GTM-PZV6TJN6, with one
head loader and one noscript iframe, and no old direct gtag.js loader. Clear
hosting/CDN cache if old HTML remains. Replit publishing alone does not update
the separate Hostinger site.

Automated tests and build passed. Live Hostinger installation and receipt inside
Google Tag Manager/Google Ads are not verified by this package.
