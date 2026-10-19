# QuoteUs mobile login and verification-delivery repair

## What this changes

- Login reads the current email/password input values at submission, including silent mobile/password-manager autofill.
- Empty or invalid input and a role mismatch produce visible messages.
- Verification email sending has a 25-second total deadline, shorter than the client's 45-second login timeout. A stalled SMTP connection is closed.
- A failed or unconfigured email service returns a visible delivery error. It does not claim an email was sent or return a verification code in the login response.
- Normal successful delivery still advances to the six-digit verification screen.

This is a source update, not confirmation that Hostinger email delivery works. It does not change SMTP credentials, database schema, account roles, passwords, DNS, or existing document storage.

## Apply to the GitHub repository used by Dokploy

Prefer syncing the current Replit changes to GitHub main through the normal project workflow.
For an administrator applying the included patch in a checked-out repository:

```sh
git apply --check changes.patch
git apply changes.patch
npm run check
npx tsx --test server/emailDelivery.test.ts
npm run build
```

If the check reports a conflict, merge the changes into the current source.
Do not overwrite newer authentication/security work or use an old full-site archive.
The source copies are references, not a replacement database or deployment backup.

Commit the update to the connected QuoteUs2 repository's main branch.
In Dokploy, open the QuoteUs application, choose General, then Deploy.
Wait for Done. Reload alone does not build new source.
Replit publishing does not update this Hostinger VPS.

## Live verification

After deployment, the host administrator should verify with an authorized account:

1. Select the actual account role and enter credentials, including a mobile autofill check.
2. With working SMTP, confirm Check Your Email appears, the email arrives, and the correct code signs in.
3. If a delivery error appears, inspect Dokploy application Logs at the attempt time. Check the existing SMTP host, port, login, sender and VPS outbound connectivity securely; never paste credentials into chat.
4. Confirm invalid passwords, incorrect roles, and invalid/expired verification codes do not grant access.

Local checks cover TypeScript, production build, deadline unit tests and mocked mobile browser flows. No real login, email or conversion was triggered against quoteus.ca.
