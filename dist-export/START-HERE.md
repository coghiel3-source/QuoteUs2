# START HERE — Put QuoteUs.ca on your own server (5 steps)

This folder is your **complete website**. It includes:

- All the website code
- **database-backup.sql** — a full copy of your **live** database (snapshot
  taken July 19, 2026): every lead, user account, password, credit balance,
  and setting
- **client/public/uploads/** — your uploaded files, including the lease
  guarantee documents recovered from cloud storage. (A few older files —
  some ad images and signed-document copies — were already lost from the
  live server before this export and couldn't be recovered; those links
  don't work on the live site today either, so nothing is lost by moving.)

Nothing here connects to Replit. It runs on any server with **Node.js 20+**
and **PostgreSQL 14+** (ask your host if unsure).

---

## Step 1 — Upload and install

Copy this whole folder onto your server, then in a terminal inside it:

```
npm install
```

## Step 2 — Make an empty database

In your hosting control panel (or ask your host): create a new, empty
PostgreSQL database. Write down the **connection string** — it looks like:

```
postgres://USERNAME:PASSWORD@HOST:5432/DATABASENAME
```

## Step 3 — Load your data (one command)

```
psql "postgres://USERNAME:PASSWORD@HOST:5432/DATABASENAME" < database-backup.sql
```

That's it. This one command creates every table **and** brings back all your
leads, users, and settings. There is nothing else to set up in the database.
You will log in with the **same email and password you already use**.

> **Only load this into a NEW, empty database.** If this server already runs
> QuoteUs with leads you want to keep, skip this command — loading the backup
> alongside existing data will cause conflicts. See `DEPLOY.md` section 3 for
> that case.

## Step 4 — Fill in your settings

```
cp .env.example .env
```

Open `.env` in any text editor and fill in at least these three:

| Setting        | What to put                                              |
|----------------|----------------------------------------------------------|
| `DATABASE_URL` | The connection string from Step 2                        |
| `SESSION_SECRET` | Any long random text (40+ characters, keep it secret)  |
| `APP_BASE_URL` | Your website address, e.g. `https://quoteus.ca`          |

Stripe keys: either fill them in `.env`, or skip it — keys saved in
**Admin → Settings → Connections** came over with your database.
Email (SMTP) settings also came over with your database.

## Step 5 — Build and start

```
npm run build
npm start
```

To keep it running after you close the terminal:

```
npm i -g pm2
pm2 start npm --name quoteus -- start
pm2 save
```

Now open your website and log in as usual. Done.

---

**Something not working?** Open `DEPLOY.md` — section 5b covers the most
common hosting problems (blank page, won't start, database errors) and
section 12 is a quick troubleshooting table.
