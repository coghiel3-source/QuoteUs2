---
name: App auth model (actorId pattern, no server session for email login)
description: How QuoteUs endpoints authenticate and why (req as any).user is usually undefined.
---

# QuoteUs auth model

- Email login (`/api/auth/login`) returns the user to the client but creates NO
  server session (no `req.login`, no `req.session.user` assignment anywhere).
- `passport.session()` sets `req.user` ONLY for Google-OAuth-logged-in users.
- Consequence: any endpoint guarded solely by `(req as any).user` silently 403s
  for email-login admins; the frontend's `if (res.ok)` pattern then shows empty
  data with no error.
- The codebase-wide convention: endpoints accept a client-sent `actorId`
  (query param or body), load that user, and check the role —
  `const user = actorId ? await storage.getUser(actorId) : (req as any).user`.

**Why:** the admin Billing tab appeared "empty/broken" purely because its
endpoints lacked the actorId fallback; matching the established pattern fixed
it. The pattern is spoofable (client-supplied id = broken access control) —
flagged to the user as a follow-up, deliberately not fixed piecemeal.

**How to apply:** when adding any admin/manager/rep endpoint, include the
actorId fallback AND have the frontend pass `actorId=${user?.id}`; don't rely
on `req.user` or `req.session`. If asked to harden auth, it must be a
codebase-wide session overhaul, not per-endpoint.
