<?php

define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_PORT', getenv('DB_PORT') ?: '3306');
define('DB_NAME', getenv('DB_NAME') ?: 'quoteus');
define('DB_USER', getenv('DB_USER') ?: 'root');
define('DB_PASS', getenv('DB_PASS') ?: '');
define('DB_CHARSET', 'utf8mb4');

define('APP_NAME', 'QuoteUs');
define('APP_URL', getenv('APP_URL') ?: 'http://localhost');
define('APP_ENV', getenv('APP_ENV') ?: 'production');

define('SESSION_SECRET', getenv('SESSION_SECRET') ?: 'quoteus-session-secret');
define('SESSION_LIFETIME', 86400 * 7);

define('UPLOAD_DIR', __DIR__ . '/uploads');
define('UPLOAD_URL', APP_URL . '/uploads');
define('MAX_UPLOAD_SIZE', 10 * 1024 * 1024);

define('CORS_ORIGIN', getenv('CORS_ORIGIN') ?: '*');

define('USER_ROLES', ['admin', 'manager', 'broker', 'customer']);
define('USER_STATUSES', ['active', 'pending', 'paused', 'cancelled', 'denied']);
define('QUOTE_TYPES', ['Auto', 'Home', 'Tenant', 'Business', 'Life', 'Travel', 'Pet', 'Mortgage', 'General']);
define('QUOTE_STATUSES', ['New', 'Contacted', 'Quoted', 'Bound', 'Follow-Up', 'Closed', 'Lost', 'Win', 'Lose', 'Expired']);
define('PRIORITIES', ['High', 'Medium', 'Low']);
define('ACTIVITY_TYPES', ['status_change', 'assignment', 'note', 'email_sent', 'system']);
define('TRANSACTION_TYPES', ['credit_purchase', 'lead_deduction', 'manual_credit', 'adjustment', 'refund']);
define('BROKER_TIERS', ['bronze', 'silver', 'gold', 'platinum']);
define('AD_MEDIA_TYPES', ['image', 'video']);
define('AD_STATUSES', ['active', 'paused', 'scheduled', 'expired']);

define('DEFAULT_LEAD_COST', '5.00');
define('DEFAULT_BALANCE', '0.00');

define('PASSWORD_ALGO', PASSWORD_BCRYPT);
define('PASSWORD_COST', 12);

date_default_timezone_set('America/Toronto');

if (APP_ENV === 'development') {
    error_reporting(E_ALL);
    ini_set('display_errors', '1');
} else {
    error_reporting(0);
    ini_set('display_errors', '0');
}

session_start();
