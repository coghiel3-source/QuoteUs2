# QuoteUs.ca — Self-Hosting Deployment Guide

## What's Included

```
quoteus-deploy/
├── dist/
│   ├── index.cjs          ← Compiled server (Node.js)
│   └── public/            ← Built React frontend (HTML/CSS/JS)
├── package.json           ← Dependencies list
├── .env.example           ← Template for environment variables
└── DEPLOY_INSTRUCTIONS.md ← This file
```

---

## Requirements

| Requirement | Version |
|---|---|
| Node.js | 18 or newer |
| npm | 8 or newer |
| PostgreSQL | 14 or newer |

---

## Step-by-Step Setup

### 1. Upload Files

Upload the entire `quoteus-deploy/` folder to your server.  
Using SFTP/SCP example:
```bash
scp -r quoteus-deploy/ user@your-server.com:/var/www/quoteus
```

### 2. Install Dependencies

SSH into your server and run:
```bash
cd /var/www/quoteus
npm install --omit=dev
```

### 3. Create PostgreSQL Database

```sql
CREATE USER quoteus_user WITH PASSWORD 'yourpassword';
CREATE DATABASE quoteus_db OWNER quoteus_user;
GRANT ALL PRIVILEGES ON DATABASE quoteus_db TO quoteus_user;
```

### 4. Configure Environment Variables

Copy the example file and fill in your values:
```bash
cp .env.example .env
nano .env
```

Key values you **must** change:
- `DATABASE_URL` — your PostgreSQL connection string
- `SESSION_SECRET` — a long random string (run `openssl rand -hex 32` to generate one)
- `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY` — from your Stripe dashboard
- `PORT` — the port your host uses (usually 3000 or 8080)

### 5. Run Database Migrations

The app creates its tables automatically on first start. Just start the server:
```bash
NODE_ENV=production node dist/index.cjs
```

Check the console — you should see:
```
[Stripe] Schema ready
serving on port 3000
```

### 6. Set Up a Process Manager (Recommended)

Install PM2 to keep the app running after you log out:
```bash
npm install -g pm2
pm2 start dist/index.cjs --name quoteus --env production
pm2 save
pm2 startup   # follow the printed command to auto-start on reboot
```

### 7. Set Up a Reverse Proxy with Nginx

Install Nginx and create a config:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable and reload:
```bash
sudo ln -s /etc/nginx/sites-available/quoteus /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 8. Enable HTTPS with Let's Encrypt (Free SSL)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

## Google OAuth Setup (Optional)

If you want Google Sign-In for customers:

1. Go to https://console.cloud.google.com/
2. Create a new project → APIs & Services → Credentials
3. Create an OAuth 2.0 Client ID (Web application)
4. Add Authorized Redirect URI: `https://yourdomain.com/api/auth/google/callback`
5. Copy Client ID and Secret into your `.env` file

---

## Stripe Setup

1. Log in to https://dashboard.stripe.com
2. Go to Developers → API Keys
3. Copy the **Secret key** (`sk_live_...`) and **Publishable key** (`pk_live_...`)
4. Set up a webhook at Developers → Webhooks:
   - Endpoint URL: `https://yourdomain.com/api/stripe/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.*`, `payment_intent.*`

---

## First Login

Default admin credentials are set during database seeding.  
Log in at `https://yourdomain.com/login` with:
- Email: the email you configure in your database
- The app creates an admin user on first run if the database is empty

---

## Email / SMTP Configuration

SMTP settings are stored in the database — no env vars needed.  
After logging in as admin:
1. Go to **Admin → Settings → Email**
2. Enter your SMTP host, port, username, and password
3. Click Save and test

---

## Hosting Recommendations

| Provider | Notes |
|---|---|
| **DigitalOcean Droplet** | $6/mo, full control, easiest setup |
| **Hetzner Cloud** | $4/mo, very fast European servers |
| **Vultr** | $6/mo, many global locations |
| **Railway.app** | No server management, connects GitHub |
| **Render.com** | Free tier available, auto-deploys |

For Railway/Render: set all `.env` values as environment variables in their dashboard instead of using a `.env` file.

---

## Troubleshooting

| Issue | Solution |
|---|---|
| `Cannot connect to database` | Check `DATABASE_URL` format and that PostgreSQL is running |
| `Port already in use` | Change `PORT` in `.env` or stop the conflicting process |
| `Stripe webhook not working` | Verify the webhook URL and check Stripe dashboard for delivery errors |
| `Google login fails` | Confirm the redirect URI matches exactly in Google Console |
| App crashes on start | Run `node dist/index.cjs` directly and read the error output |

---

*QuoteUs.ca — Ontario Insurance Lead Generation Platform*
