# QuoteUs Google Ads tag installation

Superseded by GTM-INSTALL.md. Do not reinstall this direct tag alongside GTM.

The shared HTML head loads AW-18512103274 once. The successful public enquiry
submission path sends conversion AW-18512103274/Sh5ZCPDtlZwdEOqOoftE.
Do not paste the conversion snippet on every page: that would count visits as leads.

## Install on the existing third-party host

1. Back up the current source and build. Keep the live database, uploads,
   credentials, and host configuration unchanged.
2. Review and apply changes.patch to the source. If previous updates differ,
   merge the changes from updated-source rather than overwriting newer files.
3. Run npm run check and npm run build, then restart the existing Node service.
   Uploading client/index.html alone is not enough: the browser bundle also
   contains the successful-enquiry conversion event.
4. Avoid adding the same tag a second time through a CMS or Google Tag Manager.
5. Use Google Tag Assistant on the LIVE domain to check tag loading and submit
   one clearly marked test enquiry. This can count as a real Ads conversion.
   Confirm failed requests, form visits, and staff-created leads do not convert.
6. Confirm the site's privacy disclosures and consent handling meet your
   visitor jurisdictions and advertising requirements. This update does not
   install a consent-management platform.

The conversion includes only the saved lead's opaque ID as transaction_id for
deduplication, not its name, phone, email, postal code or form contents. There is
also an in-memory duplicate guard. Ad blockers or consent restrictions may prevent
Google from receiving an event; the form still works in that case.

Coverage: successful auto, home, tenant, travel, life, business, pet, mortgage,
rent-guarantee and general contact enquiries using the existing public forms.
No conversion fires just for visiting a page, opening a form, or creating a lead
from the admin screen.

Workspace tests and build passed. Receipt inside your Google Ads account has
not been independently verified. Changes are not live on the external host until
the host deploys them.
