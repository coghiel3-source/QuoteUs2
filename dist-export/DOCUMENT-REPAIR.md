# QuoteUs third-party hosting document repair

This is a repair kit, not a new site installation or database restore.
It has NOT been installed on quoteus.ca. Your hosting administrator must apply it.
Keep this archive private: recovered documents contain customer information.

## What is included

- `changes.patch`: targeted source changes based on the current Replit code.
- `updated-source/`: replacement copies of changed source files for reference.
- `recovered/uploads/`: recovered document files using their original filenames.
- `recovery-manifest.json`: referenced paths and recovery status. This inventory is
  from the Replit production database, not a complete inventory of your hosting
  company's database. Check the host database for newer or different records.

No database backup, credentials, .env file, or automatic migration is included.
Do NOT import the old QuoteUs_1 database backup over the live database.

## Installation by the hosting administrator

1. Back up the current application, live database, environment configuration and
   ALL uploads before making changes. Preserve these backups outside the web root.
2. Extract this kit outside the public web root. Compare the current source with
   `changes.patch`. If it matches, run `git apply --check /path/to/changes.patch`
   from the application root, then `git apply /path/to/changes.patch`.
   If the check fails, manually merge the changes using `updated-source/`; do not
   blindly replace server/routes.ts or RepDashboard.tsx, which may contain newer
   host-specific changes. Do not overwrite the host's .env or database settings.
3. Configure these environment variables in the Node application's hosting settings:

   ```
   DOCUMENT_STORAGE_MODE=local
   DOCUMENT_STORAGE_DIR=/absolute/persistent/path/quoteus-document-storage
   ```

   Replace the example path with a real directory outside the public web root and
   outside release folders. Make it writable by the Node application's service
   account only. Set these in the application's process environment; simply
   placing them in .env is insufficient if your host does not load that file.
   All app instances must share this persistent directory. Back it up regularly.
4. For recovered manifest paths starting `/objects/uploads/`, copy the corresponding
   file from `recovered/uploads/` into
   `DOCUMENT_STORAGE_DIR/uploads/` (create this directory first).
   For manifest paths starting `/uploads/`, copy from `recovered/uploads/` into
   `APPLICATION_ROOT/client/public/uploads/`, preserving any subdirectories.
   **Copy only missing files. Never overwrite newer host files.**
   Ensure the service account can read them. Do not upload the archive or
   recovery manifest into a public directory.
5. Retain and back up `client/public/uploads/` between releases too: legacy upload
   flows still use it. This repair supports persistent local storage for object
   documents; it does not migrate every legacy uploader in the application.
6. From the application root, with the existing dependencies installed, run:

   ```
   npm run check
   npm run build
   ```

   Restart the host's Node application using its normal process manager. The
   startup file remains `dist/index.cjs`. No database schema changes are required.
7. Verify on the actual hosted domain:
   - A recovered `/objects/uploads/...` link opens a PDF.
   - A new signing document can be uploaded and viewed.
   - It still opens after restarting the app.
   - Missing `/uploads/...` returns HTTP 404, not the app's HTML page.
   - An expired request offers **Reissue link** in the Rep Dashboard. Reissue it,
     copy the new link, and send it to the recipient. A new request lasts seven
     days; the original link remains expired. Reissuing does not email the link
     automatically.
8. Remove the repair archive and extracted kit from the server after installation.
   Keep secure backups, including the recovered files.

## Files not recovered

Entries marked `not_recovered` need the hosting company's filesystem backups or
the original documents. No code change can recreate missing document contents.
Do not delete their database records or substitute unrelated files.

## Security scope

This repair preserves the application's current document access model. Random
document links should be treated as sensitive. It does not introduce new
authentication/authorization across existing document endpoints.

## Rollback

If verification fails, restore the application-code backup and previous process
configuration. Do not discard newly uploaded files or restore an old database
over the live one. Keep the persistent document directory for investigation.