---
name: Public rendering boundary
description: Why public rendering uses a build-time snapshot rather than fetching host data, and the no-JavaScript animation caveat.
---

Build-time public rendering intentionally uses the real components' default public
state, not a database snapshot. Host-configured hero overrides, ads, social links,
and custom CSS remain client-loaded. Keep this limitation explicit in hosting
handoffs; do not promise that personalized or administrator-configured data is
included in the initial HTML.

**Why:** The source update is built independently of the third-party live database.
Fetching workspace settings at build time could bake the wrong host's content (or
private state) into a publicly served artifact. Existing visual behavior after
hydration must remain unchanged.

**How to apply:** Render the same initial state on server and client and restore
browser-local state in effects. Treat any future server-loaded settings as a
separate public-data contract, not an unrestricted database prefetch.

No-JavaScript checks must inspect visual visibility, not just text presence.
Motion entrance animations can emit opacity-zero inline styles around entire
marketing sections, while mobile navigation may depend on JavaScript dialogs.

**Why:** A heading in view-source can still be invisible to a person with scripting
disabled.

**How to apply:** Keep a no-JavaScript reveal/navigation strategy when changing
marketing animations or responsive headers; check a mobile viewport as well as
desktop. Do not replace actual page content with crawler-only text.

Vite development needs a real HTML stylesheet link for no-JavaScript preview.
Importing CSS only from the browser entry works in a production build but injects
styles using JavaScript in development.

**Why:** This difference can make a correct production prerender appear completely
unstyled in the development preview.

**How to apply:** Keep the base stylesheet in the HTML document when supporting
no-JavaScript development checks, rather than relying solely on a JS CSS import.