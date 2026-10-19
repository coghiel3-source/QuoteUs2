# Mobile email/password login update

Merge changes.patch into the Hostinger-deployed QuoteUs2 main branch.
If the patch conflicts, compare updated-source/ rather than overwriting newer
host changes. The files are:
- client/src/pages/Login.tsx
- client/src/lib/AuthContext.tsx

Changes:
- When the server requires verification, the existing verification form is
  brought into view after it renders. The mobile credential keyboard is blurred
  first, and the first code field is focused without restoring the old scroll.
- Code fields fit narrow screens and support the mobile one-time-code hint.
- Login errors appear inline and are brought into view, rather than being
  reported only as a generic toast. Verification errors also appear inline.
- Login requests time out after 45 seconds and re-enable the submit button.
- No OTP requirements are bypassed. Server verification and role policies are
  unchanged.

This does not prove what happened on a specific customer's device or fix
Hostinger email delivery. Browser tests use mocked API responses; they do not
send real codes. If the host fails to send an email or returns a login error,
the on-screen message must be investigated separately.

Run npm run check and npm run build. In Dokploy select General > Deploy (not
Reload), then confirm the latest deployment succeeds. Keep the database,
credentials, DNS and existing environment configuration unchanged.
No database migration is required.

This is a source patch, not a complete website upload.
