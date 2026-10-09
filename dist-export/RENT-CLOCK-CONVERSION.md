# Rent Clock conversion update

## Install on the third-party host

Back up the app. Apply changes.patch after `git apply --check`, or merge
updated-source/ if your host differs. Preserve environment settings, database,
uploads and document storage. Run `npm run check` and `npm run build`, then restart
the Node application. No database changes are required.

## Tracking setup — required before expecting reports

This update adds event instrumentation, not an analytics account or a report
database. Events are forwarded to an existing Umami tracker and/or an existing
Google Analytics 4 gtag installed on the host. If neither is configured, tracking
is a safe no-op and no metrics are collected.

On third-party hosting, the administrator must configure a business-owned
analytics provider and its consent/privacy settings. Replit Publishing analytics
does not automatically install a tracker on a separately hosted website.
On Replit only, enable analytics in Publishing settings and publish/republish.

Verify events using the chosen provider's realtime/debug view on the live host
before starting a paid campaign. Test denied-consent/ad-blocked behavior too.
No custom event includes contact details, rental amounts, addresses or full URLs.
Provider automatic pageviews have their own privacy settings; ensure sensitive
signing/token routes and query strings are excluded or redacted there.

## Funnel events and how to read them

| Event name | Meaning |
| --- | --- |
| rent_clock_page_view | Campaign page mounted, excluding embed-only views |
| rent_clock_cta_click | Eligibility CTA click, with placement |
| rent_clock_calculator_used | First calculator interaction on a page visit |
| rent_clock_application_arrived | Application page opened with source=rent_clock |
| rent_clock_application_started | First application form focus from that source |
| rent_clock_application_submitted | Quote-creation API returned success |
| rent_clock_application_failed | Quote-creation API failed |
| rent_clock_share_success / rent_clock_share_fallback | Share copy outcome |
| rent_clock_embed_copy_success / rent_clock_embed_copy_fallback | Embed copy outcome |
| rent_clock_province_changed | Province selection changed |
| rent_clock_faq_open | FAQ expanded |

Use the provider's unique-session funnel, not raw click counts, for conversion:
- CTA rate = sessions clicking an eligibility CTA / campaign sessions.
- Form-start rate = campaign sessions starting the form / campaign sessions.
- Lead conversion = campaign sessions with successful quote creation / campaign sessions.
- Form completion = successful submission sessions / form-start sessions.

Events include campaign=rent_clock and variant=concise. Compare CTA placement and
calculator engagement, but do not claim a performance lift without real data.
Application submission is a lead/request, not policy purchase or active coverage.

Campaign attribution is limited to the source query parameter on the application
page. Cross-domain preview-to-production journeys require analytics configuration
and may not share a session. Test conversions on the actual hosted domain.
Repeated reloads create new view events; use provider session metrics.

The page remains illustrative: Ontario is 8 × 30 days, BC/Alberta have no connected
figures, one-day payment is unconfirmed, and Quebec is excluded. Disclosures must
remain visible in the clock widget and its embed.
