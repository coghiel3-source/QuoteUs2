# QuoteUs search visibility update

## What this update does

This update helps search engines understand the site's public pages. It gives
each page its own title, description, canonical address and social preview
information in the initial HTML, rather than requiring JavaScript to set them.
It also provides consistent sitemap and crawler instructions, excludes private
and transaction pages from indexing, and returns proper 404 responses for unknown
pages.

This is not a guarantee of first-page or first-place rankings, and it does not
automatically create Google or Bing webmaster accounts. Search engines decide
whether and when to index a page. The site's main page content still uses React;
this update does not convert the entire application to server-side rendering.

## Installation on the existing third-party host

1. Back up the current application. Keep the existing database, uploads, secrets,
   persistent document directory and hosting configuration unchanged.
2. This package contains `changes.patch` and `updated-source/`. From the application
   root, have your developer run `git apply --check /path/to/changes.patch`.
   If it succeeds, apply it with `git apply /path/to/changes.patch`.
   If the check fails because the hosted code differs, merge the changes using
   the source files provided. Do not blindly overwrite host-specific changes.
   Include new files from `updated-source/` as well as modifications.
3. Run `npm run check` and `npm run build` using the existing dependencies.
   Restart the Node process using the hosting company's normal process manager.
4. Clear cached HTML in the CDN/reverse proxy, if one is used.
5. Ensure the proxy passes application HTTP statuses and X-Robots-Tag headers
   through unchanged. Route public page requests through the Node application,
   not a generic static `index.html` fallback that bypasses the SEO renderer.
6. Check these URLs on the actual live domain:
   - `https://quoteus.ca/robots.txt` returns crawler instructions, not HTML.
   - `https://quoteus.ca/sitemap.xml` returns XML with the public page URLs.
   - View source on `/auto` and `/rent-guarantee`: titles, descriptions and
     canonicals should be specific to those pages, not all the homepage.
   - A made-up page returns HTTP 404.
   - Private and token pages have `noindex` directives.
   - Existing quote forms and document links still work.

No database changes or restore are needed. This SEO package does not contain
customer documents or replace the separate document-repair package.

## Google: verify the domain and submit the sitemap

1. Open https://search.google.com/search-console/ using a business-owned Google
   account. Add a **Domain** property for `quoteus.ca`.
2. Google supplies a DNS TXT record. Ask your hosting/DNS administrator to add the
   exact record Google provides, then finish verification. Do not share your
   account password with a developer.
3. In **Sitemaps**, submit `https://quoteus.ca/sitemap.xml`.
4. Use **URL inspection** for the homepage and important service pages, test the
   live URL, and request indexing where available.
5. Monitor **Page indexing** and **Performance** for crawl errors, search terms,
   impressions and clicks. Submission is a discovery hint, not a ranking promise.

Official starting point:
https://search.google.com/search-console/about

## Bing and Yahoo

1. Open https://www.bing.com/webmasters/ using a business-owned account.
2. Add and verify `https://quoteus.ca/`, or import the verified Google Search
   Console property when Bing offers that option.
3. Submit `https://quoteus.ca/sitemap.xml` under Sitemaps.
4. Use Bing's URL inspection and indexing reports to check important pages.
5. Yahoo's webmaster guidance directs site owners to Bing Webmaster Tools for
   its search discovery tools. Do not pay a third-party "Yahoo submission" service
   promising guaranteed placement.

Official references:
- https://www.bing.com/webmasters/help/add-and-verify-site-12184f8b
- https://www.bing.com/webmasters/help/sitemaps-3b5cf6ed
- https://help.yahoo.com/kb/SLN2213.html

## Ongoing promotion

- Publish original, accurate answers to the insurance questions your customers ask.
  Keep eligibility, coverage descriptions and contact information up to date.
- Link relevant public service pages from those articles. Do not publish customer
  records, document links or private application information.
- If eligible, complete a Google Business Profile with real business details and
  service areas. Do not invent a public office address or reviews.
- Ask legitimate business partners to link to useful public pages. Avoid purchased
  links, keyword stuffing and mass-generated duplicate pages.
- Review search performance regularly after the changes are installed. Crawling,
  indexing and ranking changes take time and are not guaranteed.

Robots and noindex directives guide compliant search engines; they are not a
replacement for access controls on confidential documents.