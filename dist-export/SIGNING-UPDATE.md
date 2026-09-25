# QuoteUs guided agreement signing update

This package updates the existing third-party hosted application. It has not
been installed on quoteus.ca. It contains code, tests and instructions only;
no customer documents, database backup or credentials.

## Changes

- Document signing offers Start, Next field and Previous controls, free scrolling,
  progress, field focus, and document/page selection for assigned fields.
- Required signatures, initials, text and electronic-signing consent must be
  completed before Finish. Drawings survive navigation between documents.
- Single-signature service and legacy agreements offer Next: Signature.
- Completion emails go to the client, with CC to rgprocessing@quoteus.ca.
- Multi-signer requests confirm each participant's signature; final confirmation
  and completed PDF copies are sent once everyone has signed.
- Recorded answers remain separate from field definitions. Concurrent document
  signers use an optimistic database update to avoid overwriting one another.
- Completed PDFs preserve the original and include a signing-record appendix
  containing captured responses when fields/multiple signers are present. This
  is not coordinate-based placement of every signature on the original page.
- Email or PDF preparation failures do not discard saved signatures. Completion
  messages distinguish saved signatures from successful email submission.

## Host installation

1. Back up application code and live data. Preserve the database, .env, SMTP
   configuration, existing uploads and persistent document directory.
2. Extract the kit outside the public web root. From the application directory,
   run `git apply --check /path/to/changes.patch`. If it succeeds, apply with
   `git apply /path/to/changes.patch`. If the host differs, merge changes using
   `updated-source/`, including all new helper files. Do not blindly replace
   server/routes.ts or server/storage.ts if the host has independent changes.
3. No database schema migration or database restore is required. Keep the prior
   document-storage repair installed and working.
4. Run `npm run check` and `npm run build`. Restart the Node application through
   the host's process manager and clear cached HTML as appropriate.
5. Confirm SMTP settings in the existing admin settings are valid on this host.
   Do not share SMTP passwords in email or chat. The sending provider must permit
   mail to both the client recipient and rgprocessing@quoteus.ca.
6. Use a new agreement made specifically for testing and an email inbox you
   control. Verify scrolling, Next, signatures, initials, consent, completion and
   the received email with signed PDFs. For multiple signers, confirm final copies
   are not sent until everyone has signed. Check the processing inbox too.

Browser verification used synthetic documents/API responses and did not send
real emails. Focused automated tests cover validation, CC, email failure,
multiple signers, and PDF generation; live SMTP delivery still needs the host
check above.

## Important limitations

- Non-PDF original documents are not misrepresented as signed PDFs. If completed
  copies cannot be generated, completion email explains that signatures were
  saved but copies are unavailable. Use PDF agreements for completed attachments.
- Service/legacy single-agreement flows send confirmations, not newly generated
  PDF attachments.
- Existing records whose field definitions were overwritten by the old code
  cannot be reconstructed automatically.
- The signing-record PDF font supports WinAnsi. Unsupported characters cause
  copy generation to fail explicitly rather than silently corrupting names/text.
- There is no automatic retry queue for failed emails or copy generation.
  Signatures remain saved; the sender must follow up on a reported failure.

## Rollback

Restore the previous application code and restart only if needed. Do not restore
an old database over newly signed agreements or remove newly generated files.