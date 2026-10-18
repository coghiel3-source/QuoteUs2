# Hostinger / Dokploy dependency installation fix

The lockfile contained 23 download URLs pointing to Replit's internal network.
They have been replaced with canonical public npm URLs. Package versions,
dependency relationships and integrity hashes are unchanged.

Files to sync to the existing QuoteUs2 GitHub repository, main branch:
- package-lock.json
- nixpacks.toml
- script/check-lockfile-hosts.mjs (new; required by the build configuration)
- script/post-merge.sh

The patch is source-only and is not a complete application upload.
Do not replace the database, uploads, environment settings or live application
with this ZIP. Merge these files into the existing source repository.

After syncing all four files, open Dokploy > QuoteUs application > General >
Deploy, then open Deployments and inspect the newest build.
The new install phase first prints a lockfile portability check before npm ci.
Do not use Reload as a substitute for building the latest source.

No Node/npm upgrade, install bypass or dependency version changes are required
by this patch. Do not disable package security checks.

Validated in the workspace: clean npm ci, TypeScript, production build, 16 tests,
and preflight checks accepting public registry URLs while rejecting internal
ones. Hostinger's Node 22/npm 10.9 build environment was not reproduced here;
its successful deployment still needs confirmation.

After the build succeeds, check https://quoteus.ca/ for GTM-PZV6TJN6. The GitHub
source already contains the tag. If installation fails again, share the first
new error, with secret values and deployment webhook URLs removed.
