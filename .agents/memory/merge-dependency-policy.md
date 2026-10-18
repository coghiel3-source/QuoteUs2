---
name: Merge dependency policy
description: Safe dependency reconciliation when clean installations reveal security-blocked transitive packages.
---

Keep post-merge setup limited to dependency installation, checks and builds;
do not add automatic database schema pushes.

**Why:** Workspace merges are not authorization to change the independently
hosted site's data model or overwrite live records. Schema changes need separate
review and a host-specific deployment plan.

**How to apply:** Fail setup explicitly if a required migration is missing rather
than forcing a schema synchronization.

Security-blocked transitive dependencies can be pinned by a parent package even
when updating the blocked leaf seems successful.

**Why:** Clean installation exposed old XML parser versions held by multiple
AWS SDK branches, including a branch brought in through email type definitions.
Updating the leaf alone left another blocked pinned copy in the graph.

**How to apply:** Trace every parent of the blocked version in the lockfile;
refresh compatible owning branches and verify a clean installation. Do not
bypass the package firewall, rely on a cached vulnerable copy, or assume a
direct framework major upgrade is necessary.

Keep committed dependency download URLs portable to Hostinger.

**Why:** Dependency updates inside Replit can write internal registry addresses
into the lockfile. Installs then succeed in Replit but cannot fetch those
addresses on Hostinger. A generic npm "Exit handler never called" error can
accompany download failures; do not assume an npm version upgrade is the fix.

**How to apply:** After dependency updates, inspect resolved download hosts.
Use canonical public URLs for the same approved versions and preserve integrity
hashes. Leave Replit's configured package-security registry intact for local
installation and never use URL normalization to bypass a blocked package.
