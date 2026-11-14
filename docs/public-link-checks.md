# Public link check and hosting handoff

Run a read-only check:

```sh
npx tsx script/audit-public-links.ts https://quoteus.ca /tmp/quoteus-links.json
```

This checks the public route registry, sitemap entries, same-origin links and
assets from initial HTML, and ad images from the public advertising API.
Preconnect/DNS hints are not navigable links and are excluded. It does not submit
forms, record ad impressions, or inspect customer records. It does not cover
every JavaScript-only state, private token route, or external destination.

## Changes prepared in this checkout

- Terms links to the working canonical `https://quoteus.ca`, not the broken www host.
- Existing Profile, Forgot Password and Reset Password components have registered
  routes with noindex metadata. Reset emails already point to `/reset-password`.
- Known public paths with trailing slashes or different capitalization redirect
  permanently to their canonical path, retaining query parameters. Unknown paths
  stay genuine 404s; private token casing is not changed.
- The original supplied MaplTours image is bundled at
  `/advertisements/mapltours-jamaica.png`, with recovery for its existing
  `/uploads/ad-1793151975374-218409617.png` URL. This changes no placement settings.

## Still requires hosting access or original files

The live host's other missing advertisement images are:

- Maxwell Automotive: `/uploads/ad-1793151409488-124350673.png`
- Coghiel & Associates: `/uploads/ad-1793159244463-919996353.png`

Their originals were not found in this checkout. Re-upload the originals through
Admin → Advertisements or recover them from a host backup. Do not replace them with
unrelated artwork or redirect missing media to the homepage.

`https://www.quoteus.ca` fails certificate verification. Configure this hostname
and its valid certificate in Hostinger/Dokploy, then redirect it to
`https://quoteus.ca`, preserving paths and query strings. An application redirect
cannot repair a TLS handshake that fails before the application receives a request.

`/blog` and `/advertise` return 404 live and their implementations are absent from
this checkout. They are not linked from the currently crawled public HTML or
listed in its sitemap. Restore their actual implementation from the appropriate
Git branch if these features should be live; don't mask them with a generic 200.

## Deployment

Sync the reviewed code and bundled assets to the GitHub branch configured in
Dokploy. Compare GitHub's latest commit with the deployment commit, run a new
build (`npm run build`) and start (`npm start`). A restart of an old build is not
a code update. Verify the URLs on quoteus.ca after deployment.

No production database or existing payments were modified by this check.
