# QuoteUs search and hosting recovery

## Live checks performed October 8, 2026 (America/Chicago)

- https://www.quoteus.ca/ failed certificate validation in both curl and Python.
  curl reported that the certificate does not match www.quoteus.ca.
- https://quoteus.ca/rent-clock returned 404.
- The apex homepage, /auto and /rent-guarantee returned 200 with page-specific
  titles/canonical URLs, but no H1 in the initial HTML.
- robots.txt and sitemap.xml were valid. A nonexistent test page returned 404.

These findings do not prove the cause or size of a traffic decline. No historical
analytics, Search Console reports or host access logs were available.
JavaScript-rendered pages can be indexed by Google, but relying on rendering
adds a dependency and not all crawlers execute JavaScript.

## Priority 1 — hosting administrator

1. Check DNS for both quoteus.ca and www.quoteus.ca.
2. Install a trusted certificate covering BOTH names and the complete chain.
   A www redirect cannot fix a certificate error: TLS negotiation occurs first.
3. Set one permanent redirect from www to https://quoteus.ca, preserving path and
   query string. Keep HTTP-to-HTTPS redirects and avoid redirect loops.
4. Verify from an independent browser/network without bypassing certificate checks.
5. Review old popular URLs in pre-move access logs/Search Console. Add individual
   permanent redirects only when there is a genuinely equivalent replacement.
   Do not redirect every missing page to the homepage.

## Install the code changes

Back up code and live data first. Do not restore any old database export.
The source patch adds the guide, search metadata and internal links. It assumes
the existing Rent Clock and prior updates are installed. If the patch does not
apply cleanly, merge using updated-source/ and install the prior Rent Clock kit.

The `runtime/` directory is a built snapshot of the CURRENT project, including
the Rent Clock and earlier workspace changes. It is NOT just the new guide.
Use it only after comparing with host-specific customizations:
- Merge runtime/dist into the app's dist directory after backing it up.
- Preserve host uploads and any other existing public files; do not delete them.
- Ensure the host has the dependencies matching runtime/package.json and lockfile.
  Run npm ci on the host if necessary. Keep its existing .env and settings.
- Keep Node 20+ and persistent document storage configured as before.
- Restart the normal production command (npm start).

Alternatively, merge source changes into the current source and run npm run check
and npm run build. No database migration is needed.

The runtime bundle includes only compiled app code/assets and selected public
brand assets. It excludes customer uploads, PDFs, exports, databases and secrets.
Preserve those files on the host. Never replace or erase the live uploads folder.

## New content and validation

- /rent-guarantee-guide explains eligibility, existing arrears, insurance
  differences and the application checklist without invented coverage promises.
- Its visible copy is rendered into initial HTML from the same React component
  shown in the browser; it does not require JavaScript to read.
- The rest of the application is not converted to full server-side rendering.
- New internal links and automatic sitemap inclusion improve discovery.
- Existing application and lead-capture destinations remain unchanged.

Verify the guide and /rent-clock both return HTTP 200 on the real host. Check the
guide with JavaScript disabled, the sitemap contains it, and application links
work. Ensure the server—not a static index fallback—handles page requests.

## Measure recovery rather than guess

1. In Google Search Console, inspect www/apex indexing and errors; compare equal
   date ranges before and after the server move by page, query, device and source.
2. Submit https://quoteus.ca/sitemap.xml to Google Search Console and Bing
   Webmaster Tools. Request reindexing of corrected key pages.
3. Check the host's analytics tracker is actually installed and receiving events.
   Moving away from Replit does not automatically transfer its analytics.
4. Separate sessions, CTA clicks, application starts and successfully saved leads.
   A tracker outage can look like lost traffic; a broken form can look like
   reduced demand. Test using a controlled, clearly marked test lead.
5. Review changes over subsequent weeks. No ranking or traffic uplift is guaranteed.

No live certificate, DNS, webmaster account or external-host configuration was
changed from this workspace.
