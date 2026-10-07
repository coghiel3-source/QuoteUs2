# The Rent Clock — third-party host update

Install this update on your existing QuoteUs application. It adds `/rent-clock`;
it does not replace `/rent-guarantee` or its application workflow.

1. Back up application code. Preserve your database, environment settings,
   uploads and persistent document directory.
2. Extract the kit outside the public web root. Check the included changes.patch
   with `git apply --check /path/to/changes.patch` from your application directory.
   Apply it if the check succeeds; otherwise merge using updated-source/.
   Copy new public image assets as well as source files. Do not overwrite
   unrelated host customizations.
3. Run `npm run check` and `npm run build`, then restart the Node application.
   No database migration or restore is needed.
4. Check `/rent-clock` and `/rent-clock?embed=1` on the hosted domain.
   Verify calculator sharing restores the selected inputs and province.
5. Use the embed code generated on the live domain, not a preview-domain code.
   Ensure the hosting proxy permits framing this public widget. Scope any
   frame-ancestors/X-Frame-Options adjustment only to this campaign route;
   do not weaken protection for dashboards, signing pages or private records.
6. Check the widget inside your association's page at narrow and wide widths.
   Keep all disclosures and attribution visible.

All application buttons lead to https://quoteus.ca/rent-guarantee.
The calculator neither submits an application nor activates coverage.

No live tribunal feed or confirmed one-day benefit is connected. Ontario's
240 days is an illustration; BC and Alberta remain data pending. Do not remove
these disclosures or promote the campaign counter as a contractual guarantee.

This package is not installed automatically on quoteus.ca.
