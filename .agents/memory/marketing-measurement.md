---
name: Marketing measurement ownership
description: Use GTM rather than restoring direct Google tracking snippets.
---

The user chose Google Tag Manager to replace direct Google tracking.

**Why:** Marketing tags should now be managed through the user's container,
not duplicated with independently installed Google Ads snippets in the app.

**How to apply:** Keep application success events separate from provider tag
configuration. Do not re-add the former direct Google Ads loader when debugging
missing conversions. Check the Hostinger deployment and published GTM tags first;
the website source alone cannot establish that the user's container is configured.
