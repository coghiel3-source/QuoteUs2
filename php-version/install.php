<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

$configFile = __DIR__ . '/config.php';
$dbHost = 'localhost';
$dbName = 'quoteus';
$dbUser = 'root';
$dbPass = '';

if (file_exists($configFile)) {
    require_once $configFile;
    $dbHost = defined('DB_HOST') ? DB_HOST : $dbHost;
    $dbName = defined('DB_NAME') ? DB_NAME : $dbName;
    $dbUser = defined('DB_USER') ? DB_USER : $dbUser;
    $dbPass = defined('DB_PASS') ? DB_PASS : $dbPass;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $dbHost = $_POST['db_host'] ?? $dbHost;
    $dbName = $_POST['db_name'] ?? $dbName;
    $dbUser = $_POST['db_user'] ?? $dbUser;
    $dbPass = $_POST['db_pass'] ?? '';
    $adminEmail = $_POST['admin_email'] ?? 'admin@quoteus.ca';
    $adminPassword = $_POST['admin_password'] ?? 'admin123';
    $adminName = $_POST['admin_name'] ?? 'System Admin';

    $errors = [];
    $success = [];

    try {
        $pdo = new PDO(
            "mysql:host=$dbHost",
            $dbUser,
            $dbPass,
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
        );

        $pdo->exec("CREATE DATABASE IF NOT EXISTS `$dbName` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        $pdo->exec("USE `$dbName`");
        $success[] = "Database '$dbName' created or already exists.";

        $tables = [
            "users" => "CREATE TABLE IF NOT EXISTS `users` (
                `id` VARCHAR(36) NOT NULL DEFAULT (UUID()),
                `name` TEXT NOT NULL,
                `email` VARCHAR(255) NOT NULL,
                `phone` TEXT,
                `password` TEXT,
                `role` ENUM('admin', 'manager', 'broker', 'customer') NOT NULL DEFAULT 'customer',
                `status` ENUM('active', 'pending', 'paused', 'cancelled', 'denied') NOT NULL DEFAULT 'active',
                `balance` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
                `lead_cost_override` DECIMAL(10, 2) DEFAULT NULL,
                `stripe_customer_id` TEXT,
                `brokerage` TEXT,
                `years_of_service` INT DEFAULT NULL,
                `product_types` JSON DEFAULT NULL,
                `permissions` JSON DEFAULT NULL,
                `reset_token` TEXT,
                `reset_token_expiry` DATETIME DEFAULT NULL,
                `pause_start_date` DATETIME DEFAULT NULL,
                `pause_end_date` DATETIME DEFAULT NULL,
                `google_id` TEXT,
                `assigned_postal_codes` JSON DEFAULT NULL,
                `assigned_cities` JSON DEFAULT NULL,
                `broker_tier` ENUM('bronze', 'silver', 'gold', 'platinum') DEFAULT NULL,
                `preferred_insurance_types` JSON DEFAULT NULL,
                `preferred_demographics` TEXT,
                `reference_id` VARCHAR(6) DEFAULT NULL,
                `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`),
                UNIQUE KEY `uk_users_email` (`email`),
                UNIQUE KEY `uk_users_reference_id` (`reference_id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

            "quotes" => "CREATE TABLE IF NOT EXISTS `quotes` (
                `id` VARCHAR(36) NOT NULL DEFAULT (UUID()),
                `quote_number` VARCHAR(255) NOT NULL,
                `type` ENUM('Auto', 'Home', 'Tenant', 'Business', 'Life', 'Travel', 'Pet', 'Mortgage', 'General') NOT NULL,
                `client_name` TEXT NOT NULL,
                `email` TEXT,
                `phone` TEXT,
                `postal_code` TEXT,
                `status` ENUM('New', 'Contacted', 'Quoted', 'Bound', 'Follow-Up', 'Closed', 'Lost', 'Win', 'Lose', 'Expired') NOT NULL DEFAULT 'New',
                `priority` ENUM('High', 'Medium', 'Low') NOT NULL DEFAULT 'Medium',
                `source` TEXT NOT NULL DEFAULT 'Web Form',
                `assigned_to` VARCHAR(36) DEFAULT NULL,
                `assigned_at` DATETIME DEFAULT NULL,
                `internal_notes` TEXT DEFAULT '',
                `reference_id` VARCHAR(12) DEFAULT NULL,
                `binder_required` TINYINT(1) DEFAULT 0,
                `binder_url` TEXT,
                `binder_uploaded_at` DATETIME DEFAULT NULL,
                `binder_documents` JSON DEFAULT ('[]'),
                `details` JSON NOT NULL DEFAULT ('{}'),
                `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`),
                UNIQUE KEY `uk_quotes_quote_number` (`quote_number`),
                KEY `fk_quotes_assigned_to` (`assigned_to`),
                CONSTRAINT `fk_quotes_assigned_to` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

            "transactions" => "CREATE TABLE IF NOT EXISTS `transactions` (
                `id` VARCHAR(36) NOT NULL DEFAULT (UUID()),
                `user_id` VARCHAR(36) NOT NULL,
                `type` ENUM('credit_purchase', 'lead_deduction', 'manual_credit', 'adjustment', 'refund') NOT NULL,
                `amount` DECIMAL(10, 2) NOT NULL,
                `balance_after` DECIMAL(10, 2) NOT NULL,
                `description` TEXT NOT NULL,
                `reason` TEXT,
                `quote_id` VARCHAR(36) DEFAULT NULL,
                `stripe_payment_id` TEXT,
                `actor_id` VARCHAR(36) DEFAULT NULL,
                `actor_name` TEXT,
                `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`),
                KEY `fk_transactions_user_id` (`user_id`),
                KEY `fk_transactions_quote_id` (`quote_id`),
                KEY `fk_transactions_actor_id` (`actor_id`),
                CONSTRAINT `fk_transactions_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
                CONSTRAINT `fk_transactions_quote_id` FOREIGN KEY (`quote_id`) REFERENCES `quotes` (`id`) ON DELETE SET NULL,
                CONSTRAINT `fk_transactions_actor_id` FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

            "system_settings" => "CREATE TABLE IF NOT EXISTS `system_settings` (
                `id` VARCHAR(36) NOT NULL DEFAULT (UUID()),
                `key` VARCHAR(255) NOT NULL,
                `value` TEXT NOT NULL,
                `updated_by` VARCHAR(36) DEFAULT NULL,
                `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`),
                UNIQUE KEY `uk_system_settings_key` (`key`),
                KEY `fk_system_settings_updated_by` (`updated_by`),
                CONSTRAINT `fk_system_settings_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

            "activities" => "CREATE TABLE IF NOT EXISTS `activities` (
                `id` VARCHAR(36) NOT NULL DEFAULT (UUID()),
                `quote_id` VARCHAR(36) NOT NULL,
                `type` ENUM('status_change', 'assignment', 'note', 'email_sent', 'system') NOT NULL,
                `content` TEXT NOT NULL,
                `author` TEXT NOT NULL,
                `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`),
                KEY `fk_activities_quote_id` (`quote_id`),
                CONSTRAINT `fk_activities_quote_id` FOREIGN KEY (`quote_id`) REFERENCES `quotes` (`id`) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

            "advertisements" => "CREATE TABLE IF NOT EXISTS `advertisements` (
                `id` VARCHAR(36) NOT NULL DEFAULT (UUID()),
                `name` TEXT NOT NULL,
                `media_type` ENUM('image', 'video') NOT NULL DEFAULT 'image',
                `media_url` TEXT NOT NULL,
                `link_url` TEXT,
                `open_in_popup` TINYINT(1) NOT NULL DEFAULT 0,
                `target_pages` JSON NOT NULL DEFAULT ('[]'),
                `status` ENUM('active', 'paused', 'scheduled', 'expired') NOT NULL DEFAULT 'active',
                `start_date` DATETIME DEFAULT NULL,
                `end_date` DATETIME DEFAULT NULL,
                `priority` INT NOT NULL DEFAULT 1,
                `impressions` INT NOT NULL DEFAULT 0,
                `clicks` INT NOT NULL DEFAULT 0,
                `preview_token` VARCHAR(36) DEFAULT (UUID()),
                `approval_status` TEXT DEFAULT 'pending',
                `ad_text` TEXT,
                `text_color` TEXT DEFAULT '#ffffff',
                `background_color` TEXT DEFAULT '#1e3a5f',
                `text_position` TEXT DEFAULT 'bottom',
                `top_text` TEXT,
                `center_text` TEXT,
                `bottom_text` TEXT,
                `top_text_color` TEXT DEFAULT '#ffffff',
                `center_text_color` TEXT DEFAULT '#ffffff',
                `bottom_text_color` TEXT DEFAULT '#ffffff',
                `top_bg_color` TEXT DEFAULT '#1e3a5f',
                `center_bg_color` TEXT DEFAULT '#1e3a5f',
                `bottom_bg_color` TEXT DEFAULT '#1e3a5f',
                `created_by` VARCHAR(36) DEFAULT NULL,
                `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`),
                KEY `fk_advertisements_created_by` (`created_by`),
                CONSTRAINT `fk_advertisements_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

            "broker_notes" => "CREATE TABLE IF NOT EXISTS `broker_notes` (
                `id` VARCHAR(36) NOT NULL DEFAULT (UUID()),
                `broker_id` VARCHAR(36) NOT NULL,
                `author_id` VARCHAR(36) NOT NULL,
                `author_name` TEXT NOT NULL,
                `content` TEXT NOT NULL,
                `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`),
                KEY `fk_broker_notes_broker_id` (`broker_id`),
                KEY `fk_broker_notes_author_id` (`author_id`),
                CONSTRAINT `fk_broker_notes_broker_id` FOREIGN KEY (`broker_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
                CONSTRAINT `fk_broker_notes_author_id` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

            "partner_redirects" => "CREATE TABLE IF NOT EXISTS `partner_redirects` (
                `id` VARCHAR(36) NOT NULL DEFAULT (UUID()),
                `quote_type` ENUM('Auto', 'Home', 'Tenant', 'Business', 'Life', 'Travel', 'Pet', 'Mortgage', 'General') NOT NULL,
                `redirect_url` TEXT NOT NULL,
                `is_active` TINYINT(1) NOT NULL DEFAULT 1,
                `description` TEXT,
                `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`),
                UNIQUE KEY `uk_partner_redirects_quote_type` (`quote_type`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

            "referral_partners" => "CREATE TABLE IF NOT EXISTS `referral_partners` (
                `id` VARCHAR(36) NOT NULL DEFAULT (UUID()),
                `contact_name` TEXT NOT NULL,
                `email` VARCHAR(255) NOT NULL,
                `phone` TEXT,
                `address` TEXT,
                `province` VARCHAR(2) NOT NULL,
                `business_description` TEXT,
                `relationships` TEXT,
                `reference_id` VARCHAR(12) NOT NULL,
                `status` ENUM('active', 'pending', 'paused', 'cancelled', 'denied') NOT NULL DEFAULT 'active',
                `created_by` VARCHAR(36) DEFAULT NULL,
                `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`),
                UNIQUE KEY `uk_referral_partners_reference_id` (`reference_id`),
                KEY `fk_referral_partners_created_by` (`created_by`),
                CONSTRAINT `fk_referral_partners_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
        ];

        foreach ($tables as $tableName => $sql) {
            try {
                $pdo->exec($sql);
                $success[] = "Table '$tableName' created successfully.";
            } catch (PDOException $e) {
                $errors[] = "Error creating table '$tableName': " . $e->getMessage();
            }
        }

        $adminId = sprintf('%s-%s-%s-%s-%s',
            bin2hex(random_bytes(4)),
            bin2hex(random_bytes(2)),
            bin2hex(random_bytes(2)),
            bin2hex(random_bytes(2)),
            bin2hex(random_bytes(6))
        );
        $hashedPassword = password_hash($adminPassword, PASSWORD_BCRYPT);

        $checkAdmin = $pdo->prepare("SELECT COUNT(*) FROM `users` WHERE `role` = 'admin'");
        $checkAdmin->execute();
        $adminExists = (int)$checkAdmin->fetchColumn() > 0;

        if (!$adminExists) {
            $stmt = $pdo->prepare("INSERT INTO `users` (`id`, `name`, `email`, `password`, `role`, `status`, `balance`) VALUES (?, ?, ?, ?, 'admin', 'active', 0.00)");
            $stmt->execute([$adminId, $adminName, $adminEmail, $hashedPassword]);
            $success[] = "Default admin user created (email: $adminEmail).";
        } else {
            $success[] = "Admin user already exists, skipping seed.";
        }

        $defaultSettings = [
            ['default_lead_cost', '5.00'],
            ['auto_lead_cost', '5.00'],
            ['home_lead_cost', '5.00'],
            ['tenant_lead_cost', '3.00'],
            ['business_lead_cost', '7.00'],
            ['life_lead_cost', '5.00'],
            ['travel_lead_cost', '3.00'],
            ['pet_lead_cost', '3.00'],
            ['mortgage_lead_cost', '5.00'],
            ['general_lead_cost', '3.00'],
        ];

        foreach ($defaultSettings as $setting) {
            $check = $pdo->prepare("SELECT COUNT(*) FROM `system_settings` WHERE `key` = ?");
            $check->execute([$setting[0]]);
            if ((int)$check->fetchColumn() === 0) {
                $settingId = sprintf('%s-%s-%s-%s-%s',
                    bin2hex(random_bytes(4)),
                    bin2hex(random_bytes(2)),
                    bin2hex(random_bytes(2)),
                    bin2hex(random_bytes(2)),
                    bin2hex(random_bytes(6))
                );
                $stmt = $pdo->prepare("INSERT INTO `system_settings` (`id`, `key`, `value`) VALUES (?, ?, ?)");
                $stmt->execute([$settingId, $setting[0], $setting[1]]);
            }
        }
        $success[] = "Default system settings seeded.";

        $installSuccess = empty($errors);

    } catch (PDOException $e) {
        $errors[] = "Database connection failed: " . $e->getMessage();
        $installSuccess = false;
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>QuoteUs - Database Installation</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f7fa; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .container { background: #fff; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.1); max-width: 600px; width: 100%; padding: 40px; }
        h1 { color: #1e3a5f; margin-bottom: 8px; font-size: 28px; }
        .subtitle { color: #666; margin-bottom: 30px; }
        .form-group { margin-bottom: 20px; }
        label { display: block; font-weight: 600; color: #333; margin-bottom: 6px; font-size: 14px; }
        input { width: 100%; padding: 10px 14px; border: 1px solid #ddd; border-radius: 8px; font-size: 15px; transition: border-color 0.2s; }
        input:focus { outline: none; border-color: #1e3a5f; }
        .section-title { font-size: 16px; font-weight: 700; color: #1e3a5f; margin: 28px 0 14px; padding-top: 14px; border-top: 1px solid #eee; }
        button { width: 100%; padding: 14px; background: #1e3a5f; color: #fff; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
        button:hover { background: #2a4f7f; }
        .alert { padding: 12px 16px; border-radius: 8px; margin-bottom: 10px; font-size: 14px; }
        .alert-success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .alert-error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .results { margin-top: 20px; }
    </style>
</head>
<body>
<div class="container">
    <h1>QuoteUs Installer</h1>
    <p class="subtitle">Set up your MySQL database and create the admin account.</p>

    <?php if ($_SERVER['REQUEST_METHOD'] === 'POST'): ?>
        <div class="results">
            <?php foreach ($success as $msg): ?>
                <div class="alert alert-success"><?= htmlspecialchars($msg) ?></div>
            <?php endforeach; ?>
            <?php foreach ($errors as $msg): ?>
                <div class="alert alert-error"><?= htmlspecialchars($msg) ?></div>
            <?php endforeach; ?>
            <?php if ($installSuccess): ?>
                <div class="alert alert-success" style="margin-top: 16px; font-weight: 600;">
                    Installation complete! You can now log in at your site. Please delete this file (install.php) for security.
                </div>
            <?php endif; ?>
        </div>
    <?php endif; ?>

    <form method="POST">
        <div class="section-title">Database Settings</div>
        <div class="form-group">
            <label for="db_host">Database Host</label>
            <input type="text" id="db_host" name="db_host" value="<?= htmlspecialchars($dbHost) ?>">
        </div>
        <div class="form-group">
            <label for="db_name">Database Name</label>
            <input type="text" id="db_name" name="db_name" value="<?= htmlspecialchars($dbName) ?>">
        </div>
        <div class="form-group">
            <label for="db_user">Database User</label>
            <input type="text" id="db_user" name="db_user" value="<?= htmlspecialchars($dbUser) ?>">
        </div>
        <div class="form-group">
            <label for="db_pass">Database Password</label>
            <input type="password" id="db_pass" name="db_pass" value="">
        </div>

        <div class="section-title">Admin Account</div>
        <div class="form-group">
            <label for="admin_name">Admin Name</label>
            <input type="text" id="admin_name" name="admin_name" value="System Admin">
        </div>
        <div class="form-group">
            <label for="admin_email">Admin Email</label>
            <input type="email" id="admin_email" name="admin_email" value="admin@quoteus.ca">
        </div>
        <div class="form-group">
            <label for="admin_password">Admin Password</label>
            <input type="password" id="admin_password" name="admin_password" value="">
        </div>

        <button type="submit">Install Database</button>
    </form>
</div>
</body>
</html>
