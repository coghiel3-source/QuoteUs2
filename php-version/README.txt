============================================
  QuoteUs.ca - PHP/MySQL Version
  Installation & Setup Guide
============================================

REQUIREMENTS:
- PHP 7.4 or higher (8.0+ recommended)
- MySQL 5.7 or higher
- Apache with mod_rewrite enabled
- PHP extensions: pdo, pdo_mysql, json, mbstring, fileinfo

============================================
INSTALLATION STEPS:
============================================

1. UPLOAD FILES
   - Upload all files to your web hosting root (public_html or www)
   - Make sure .htaccess is included (it may be hidden)
   - Ensure the 'uploads' directory is writable (chmod 755 or 775)

2. CREATE DATABASE
   - Create a new MySQL database via your hosting panel (cPanel, etc.)
   - Note your database name, username, and password

3. RUN INSTALLER
   - Open your browser and go to: https://yourdomain.com/install.php
   - Fill in your database credentials
   - Set your admin email and password
   - Click "Install"
   - The installer will create all tables and seed data

4. CONFIGURE
   - Open config.php and update these settings:
     * DB_HOST - your database host (usually 'localhost')
     * DB_NAME - your database name
     * DB_USER - your database username
     * DB_PASS - your database password
     * APP_URL - your domain (e.g., 'https://quoteus.ca')

5. SECURITY (IMPORTANT!)
   - Delete install.php after successful installation
   - Ensure uploads/ directory is not listable (add 'Options -Indexes' to .htaccess)

============================================
FILE STRUCTURE:
============================================

/                         - Web root
├── index.php             - Main entry (serves React frontend)
├── index.html            - Built React SPA
├── .htaccess             - Apache URL rewriting rules
├── config.php            - Database & app configuration
├── database.php          - PDO database connection layer
├── storage.php           - Data access layer (all DB queries)
├── email.php             - Email sending & templates
├── install.php           - Database installer (DELETE after setup)
├── api/                  - API endpoints
│   ├── index.php         - API router (dispatches to handlers)
│   ├── auth.php          - Login, register, password reset
│   ├── users.php         - User management
│   ├── quotes.php        - Quote/Lead management, binders
│   ├── admin.php         - Admin settings, SMTP, permissions
│   ├── credits.php       - Credit system, Stripe payments
│   ├── ads.php           - Advertisement management
│   └── partners.php      - Referral partners, redirects
├── assets/               - Built frontend assets (JS, CSS, images)
├── uploads/              - User uploaded files
│   ├── ads/              - Advertisement media
│   └── binders/          - Binder/insurance documents
└── data/                 - Static data files (vehicle info, etc.)

============================================
DEFAULT LOGIN:
============================================

Admin:  admin@quoteus.ca / password123
Broker: john@quoteus.ca / password123

(Change these immediately after first login!)

============================================
STRIPE INTEGRATION:
============================================

To enable credit purchases via Stripe:
1. Get your Stripe API keys from https://dashboard.stripe.com
2. In config.php, set:
   - STRIPE_SECRET_KEY
   - STRIPE_PUBLISHABLE_KEY
3. Or set them as environment variables

============================================
SMTP EMAIL SETUP:
============================================

Email can be configured through the admin panel:
1. Log in as admin
2. Go to Settings > SMTP
3. Enter your SMTP server details
4. Send a test email to verify

Without SMTP configured, the system will log emails 
to the server but not actually send them.

============================================
TROUBLESHOOTING:
============================================

Q: Getting 404 errors on API calls?
A: Make sure mod_rewrite is enabled and .htaccess is being read.
   In Apache config, ensure AllowOverride All is set.

Q: Getting 500 errors?
A: Check PHP error logs. Common issues:
   - PDO MySQL extension not installed
   - Database credentials incorrect
   - File permissions on uploads/ directory

Q: Frontend not loading?
A: Ensure index.html exists in the web root and 
   .htaccess is properly routing non-API requests to it.

Q: Uploads not working?
A: Check that uploads/ directory is writable by the web server.
   Also check PHP's upload_max_filesize and post_max_size settings.

============================================
SUPPORT:
============================================

For questions or issues, contact the development team.
