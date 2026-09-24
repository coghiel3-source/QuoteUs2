# Public content verification — 2026-09-24

## Merge verification — 2026-10-13

The incoming Rent Clock and landlord-guide pages are preserved. The current
registry has 17 public routes. TypeScript, the production build, and all 11
SEO/prerender tests passed against the merged source. The tests cover both added
pages and the client-only Rent Clock embed exception. The browser results below
are from the earlier 15-route pass, not a new browser audit of these two pages.

## Passed

- `npm run check`
- `npm run build` (client build, actual React prerender of all 15 public pages,
  server bundle; no database or network access needed by the prerender step).
- `npx tsx --test server/seo.test.ts script/prerender.test.ts`: 10 tests passed.
  Covers real public HTML, navigation, literal insertion, private-route
  exclusions, metadata, robots/sitemap, production Express static delivery,
  HEAD, missing routes/assets, index redirect and query-string handling.
- Browser audit of all 15 public routes: visible page-specific H1 and
  `data-prerendered="true"`, with **zero observed React hydration mismatch
  warnings**.
- JavaScript-disabled desktop homepage: styled content and visible H1;
  document width equals viewport content width (no horizontal overflow).
- Hydrated Auto form accepted and retained synthetic field values. Its final
  submission remained disabled; no real lead was submitted.
- Hydrated Rent Guarantee form/select controls rendered, synthetic fields
  accepted input, and FAQ click revealed the answer.
- 390px JavaScript-enabled mobile menu opened and displayed real navigation.
- Client navigation to Contact and the lazy-loaded broker login page worked.
- A synthetic nonprivileged local-storage session survived public hydration
  and navigation. No authenticated account operation was attempted.
- Separate application screenshot showed the expected Rent Guarantee design.

## Scope and limitations

- A browser automation worker repeatedly hung on JavaScript-disabled full-page
  link navigation. The complete no-JavaScript Home → Rent Guarantee → Auto
  click sequence and no-JavaScript mobile layout were **not browser-verified**.
  Every route's initial content and actual links are verified by the production
  HTTP tests. The source includes no-JavaScript animation reveal and responsive
  navigation CSS. The hosting acceptance checklist calls for manual confirmation
  of those views before promoting the release.
- Browser automation reported an anonymous `SmoothPointer` / `TrustedHTML`
  assignment error. No corresponding source exists in the app, no React
  mismatch was observed, and an independent screenshot did not reproduce it.
  This is classified as tooling-origin/unknown, not proven to be an app error.
- Contact submission was not mocked or sent. No real lead, email, payment,
  account login, or database mutation was intentionally tested.
- Existing third-party video/browser warnings (`web-share`, WebGPU) and the
  existing development missing-Stripe-key warning remain unrelated.
- The build reports large-chunk advisory warnings; they do not fail the build.
- These checks concern the workspace source/build, not the third-party live
  host. No publish, DNS change, or remote installation was performed.