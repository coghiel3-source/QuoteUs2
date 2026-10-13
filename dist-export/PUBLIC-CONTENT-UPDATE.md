# QuoteUs public content update — third-party hosting

This is a **source update**, not a database backup or a replacement website.
Apply it to the current Node/Express QuoteUs application after the Search
Visibility Update, including the Rent Clock and landlord-guide additions.
It is not compatible with the separate PHP version.
No Replit publication, DNS change, database migration, or database restore is
required. Nothing in this package changes the live hosting server automatically.

## What changes

The existing React components for all 17 public routes are rendered during
`npm run build`. The result is saved as `dist/public-pages.json`, outside the
public web directory. Express inserts the matching content into the first HTML
response, alongside the existing route metadata. The browser hydrates that same
component tree, retaining forms and current styling.

Account, payment-result, and token-link pages remain client-rendered and
`noindex, nofollow`. Missing routes remain 404/noindex. No content is selected
based on user agent: people and crawlers get the same HTML. No marketing claims
were added or changed.

The build uses only the components' public initial state; it never fetches
customers, quotes, credentials, or database settings. Custom hero-image overrides,
social links, custom CSS, advertisements, and interactive results still load in
the browser as before. The bundled default hero image and all primary marketing
copy are available in the initial HTML. Forms and interactive tools still need
JavaScript; a visible notice explains this when JavaScript is disabled. Mobile
navigation and animation-hidden marketing copy are readable without JavaScript.
The interactive `/rent-clock?embed=1` widget remains client-rendered so it can
restore its query parameters immediately without flashing the full campaign.
The normal `/rent-clock` marketing page is prerendered; URL calculator state
is restored after hydration.

## Safe installation

1. Back up the host's **current code and built release**, plus its current
   database and persistent uploads using your existing backup procedure.
   Do not import the old export database.
2. Work in a staging/release directory, not the running release. Preserve host
   environment settings, credentials, uploads, and persistent storage mounts.
3. Inspect `changes.patch`. It is relative to the source following the prior
   Search Visibility Update and the campaign/guide additions. Run `git apply --check changes.patch` there before
   applying it. If it does not apply, manually merge the files in
   `updated-source/`; do not overwrite newer host changes blindly.
   `updated-source/` also includes the unchanged SEO registry, SEO hook, robots
   file and SEO regression tests needed to understand and verify the update.
4. Use Node 20.19+ or Node 22.12+ (Vite 7 requirement). With the host's existing
   `package-lock.json`, run:

   ```sh
   npm ci --include=dev
   npm run check
   npm run build
   npx tsx --test server/seo.test.ts script/prerender.test.ts
   ```

   No new package dependencies are required. Build dependencies must be installed
   during the build; do not use an omit-dev install until after building.
5. Promote the **whole matching build** together: `dist/index.cjs`,
   `dist/public/`, and **`dist/public-pages.json`**. Keep the host's runtime
   `node_modules`, environment, uploads and persistent storage available. Run
   `npm start` with the existing process manager/reverse proxy.
   Starting without the prerender manifest fails explicitly instead of silently
   serving empty public pages.
6. Keep all page requests routed through Express. Do not configure the proxy
   with a blanket fallback to `dist/public/index.html`; that bypasses both
   prerendered content and per-page metadata/noindex/404 rules. Static `/assets/`
   delivery is fine. Preserve existing API/upload/object routes.
7. If the proxy/CDN caches HTML, invalidate public-page HTML after release.
   Deploy atomically and keep prior hashed assets available for browsers already
   using the previous release. Never publicly cache account or token-link pages.

## Acceptance checks on the host

- View source (not only the browser Elements panel) for `/`, `/auto`,
  `/rent-guarantee`, and `/privacy`. Expect a real `<h1>`, body copy, links,
  `data-prerendered="true"`, and the correct canonical/metadata.
- Disable JavaScript. Read `/rent-guarantee`, including below-the-fold content.
  At phone width, follow product navigation links. Forms should be accompanied
  by the enable-JavaScript notice, not promised to work without it.
- Enable JavaScript. Confirm no React hydration warnings; use Auto form controls,
  Rent Guarantee controls, Contact validation, mobile navigation and login.
  Use staging/test data only if testing an actual submission.
- `/auto?campaign=test` must still canonicalize to `https://quoteus.ca/auto`.
- `/login`, `/admin`, and `/sign/a-test-token` must return noindex with an empty
  initial React root, never another page's prerendered content.
- Unknown pages must return 404/noindex; `/index.html` redirects to `/`.
- Rebuild whenever public component content or the public-route registry changes.

## Rollback

Restore the prior complete code/build release using the hosting process manager,
then restart that release. Restore its matching asset set and invalidate stale
public HTML if applicable. Do not roll back or replace the database or uploads:
this update makes no schema or data changes.

## Verification in the development workspace

- TypeScript check and production build passed.
- Automated SEO/prerender suite after merging campaign/guide additions: 11 passing tests, including every public route,
  production Express HTML delivery, HEAD requests, query-string canonical
  handling, static assets, private routes and unknown routes.
- Browser verification details are recorded in `VERIFICATION.md` in the package.
- The existing missing-Stripe-configuration warning in development is unrelated;
  no payment configuration was changed or payment tested.

The hosting administrator must perform the host acceptance checks after applying
this source update. Workspace checks do not establish that the live host changed.