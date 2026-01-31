<?php
/**
 * QuoteUs.ca - Ontario Insurance Quoting Platform
 * Full SaaS PHP Application
 * Version 1.0
 * 
 * INSTALLATION:
 * 1. Upload this file to your web server
 * 2. Create a MySQL database
 * 3. Update the database credentials below
 * 4. Access the file in your browser - tables will be created automatically
 * 5. Default admin login: admin@quoteus.ca / password123
 */

// ============================================
// CONFIGURATION - UPDATE THESE VALUES
// ============================================
define('DB_HOST', 'localhost');
define('DB_NAME', 'quoteus_db');
define('DB_USER', 'your_db_user');
define('DB_PASS', 'your_db_password');
define('SITE_NAME', 'QuoteUs.ca');
define('SITE_URL', 'https://yourdomain.com');
define('ADMIN_EMAIL', 'info@quoteus.ca');

// Session configuration
session_start();

// Error reporting (disable in production)
error_reporting(E_ALL);
ini_set('display_errors', 1);

// ============================================
// DATABASE CONNECTION
// ============================================
class Database {
    private static $instance = null;
    private $pdo;
    
    private function __construct() {
        try {
            $this->pdo = new PDO(
                "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
                DB_USER,
                DB_PASS,
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false
                ]
            );
        } catch (PDOException $e) {
            die("Database connection failed: " . $e->getMessage());
        }
    }
    
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    public function getConnection() {
        return $this->pdo;
    }
}

// ============================================
// DATABASE SCHEMA SETUP
// ============================================
function setupDatabase() {
    $db = Database::getInstance()->getConnection();
    
    // Users table
    $db->exec("CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        role ENUM('admin', 'manager', 'broker', 'customer') NOT NULL DEFAULT 'customer',
        status ENUM('active', 'pending', 'paused', 'cancelled', 'denied') NOT NULL DEFAULT 'pending',
        balance DECIMAL(10,2) DEFAULT 0.00,
        permissions JSON,
        pause_start_date DATE,
        pause_end_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    
    // Quotes/Leads table
    $db->exec("CREATE TABLE IF NOT EXISTS quotes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        type ENUM('Auto', 'Home', 'Tenant', 'Business', 'Life', 'Travel', 'Pet', 'Mortgage', 'General') NOT NULL,
        status ENUM('New', 'Contacted', 'Quoted', 'Bound', 'Follow-Up', 'Closed', 'Lost') DEFAULT 'New',
        priority ENUM('High', 'Medium', 'Low') DEFAULT 'Medium',
        client_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        postal_code VARCHAR(10),
        details JSON,
        assigned_to INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    
    // Activities table
    $db->exec("CREATE TABLE IF NOT EXISTS activities (
        id INT AUTO_INCREMENT PRIMARY KEY,
        quote_id INT NOT NULL,
        user_id INT,
        type ENUM('status_change', 'assignment', 'note', 'email_sent', 'system') NOT NULL,
        description TEXT,
        metadata JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    
    // Transactions table
    $db->exec("CREATE TABLE IF NOT EXISTS transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        type ENUM('credit_purchase', 'lead_deduction', 'manual_credit', 'adjustment', 'refund') NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        balance_after DECIMAL(10,2) NOT NULL,
        description TEXT,
        reference_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    
    // System Settings table
    $db->exec("CREATE TABLE IF NOT EXISTS system_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        setting_key VARCHAR(255) NOT NULL UNIQUE,
        setting_value JSON,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    
    // Insert default admin user if not exists
    $stmt = $db->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute(['admin@quoteus.ca']);
    if (!$stmt->fetch()) {
        $hashedPassword = password_hash('password123', PASSWORD_DEFAULT);
        $db->prepare("INSERT INTO users (name, email, password, role, status) VALUES (?, ?, ?, 'admin', 'active')")
           ->execute(['Admin User', 'admin@quoteus.ca', $hashedPassword]);
    }
    
    // Insert default lead costs
    $stmt = $db->prepare("SELECT id FROM system_settings WHERE setting_key = ?");
    $stmt->execute(['lead_costs']);
    if (!$stmt->fetch()) {
        $leadCosts = json_encode([
            'Auto' => 10, 'Home' => 15, 'Tenant' => 5, 'Business' => 20,
            'Life' => 12, 'Travel' => 3, 'Pet' => 5, 'Mortgage' => 15, 'General' => 8
        ]);
        $db->prepare("INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?)")
           ->execute(['lead_costs', $leadCosts]);
    }
}

// ============================================
// AUTHENTICATION FUNCTIONS
// ============================================
function login($email, $password, $role) {
    $db = Database::getInstance()->getConnection();
    $stmt = $db->prepare("SELECT * FROM users WHERE email = ? AND role = ?");
    $stmt->execute([$email, $role]);
    $user = $stmt->fetch();
    
    if ($user && password_verify($password, $user['password'])) {
        if ($user['status'] !== 'active') {
            return ['success' => false, 'message' => 'Account is not active'];
        }
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['user_role'] = $user['role'];
        $_SESSION['user_name'] = $user['name'];
        $_SESSION['user_email'] = $user['email'];
        return ['success' => true, 'user' => $user];
    }
    return ['success' => false, 'message' => 'Invalid credentials'];
}

function logout() {
    session_destroy();
    header('Location: ?page=login');
    exit;
}

function isLoggedIn() {
    return isset($_SESSION['user_id']);
}

function getCurrentUser() {
    if (!isLoggedIn()) return null;
    $db = Database::getInstance()->getConnection();
    $stmt = $db->prepare("SELECT * FROM users WHERE id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    return $stmt->fetch();
}

function requireAuth($allowedRoles = []) {
    if (!isLoggedIn()) {
        header('Location: ?page=login');
        exit;
    }
    if (!empty($allowedRoles) && !in_array($_SESSION['user_role'], $allowedRoles)) {
        die('Access denied');
    }
}

// ============================================
// USER MANAGEMENT
// ============================================
function getUsers($role = null, $status = null) {
    $db = Database::getInstance()->getConnection();
    $sql = "SELECT * FROM users WHERE 1=1";
    $params = [];
    
    if ($role) {
        $sql .= " AND role = ?";
        $params[] = $role;
    }
    if ($status) {
        $sql .= " AND status = ?";
        $params[] = $status;
    }
    $sql .= " ORDER BY created_at DESC";
    
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    return $stmt->fetchAll();
}

function createUser($data) {
    $db = Database::getInstance()->getConnection();
    $hashedPassword = password_hash($data['password'], PASSWORD_DEFAULT);
    
    $stmt = $db->prepare("INSERT INTO users (name, email, password, phone, role, status) VALUES (?, ?, ?, ?, ?, ?)");
    return $stmt->execute([
        $data['name'],
        $data['email'],
        $hashedPassword,
        $data['phone'] ?? null,
        $data['role'] ?? 'broker',
        $data['status'] ?? 'pending'
    ]);
}

function updateUser($id, $data) {
    $db = Database::getInstance()->getConnection();
    $fields = [];
    $params = [];
    
    foreach (['name', 'email', 'phone', 'role', 'status', 'balance', 'pause_start_date', 'pause_end_date'] as $field) {
        if (isset($data[$field])) {
            $fields[] = "$field = ?";
            $params[] = $data[$field];
        }
    }
    
    if (isset($data['password']) && !empty($data['password'])) {
        $fields[] = "password = ?";
        $params[] = password_hash($data['password'], PASSWORD_DEFAULT);
    }
    
    if (isset($data['permissions'])) {
        $fields[] = "permissions = ?";
        $params[] = json_encode($data['permissions']);
    }
    
    $params[] = $id;
    $sql = "UPDATE users SET " . implode(', ', $fields) . " WHERE id = ?";
    
    $stmt = $db->prepare($sql);
    return $stmt->execute($params);
}

// ============================================
// QUOTE/LEAD MANAGEMENT
// ============================================
function getQuotes($filters = []) {
    $db = Database::getInstance()->getConnection();
    $sql = "SELECT q.*, u.name as assigned_name FROM quotes q 
            LEFT JOIN users u ON q.assigned_to = u.id WHERE 1=1";
    $params = [];
    
    if (!empty($filters['type'])) {
        $sql .= " AND q.type = ?";
        $params[] = $filters['type'];
    }
    if (!empty($filters['status'])) {
        $sql .= " AND q.status = ?";
        $params[] = $filters['status'];
    }
    if (!empty($filters['assigned_to'])) {
        $sql .= " AND q.assigned_to = ?";
        $params[] = $filters['assigned_to'];
    }
    
    $sql .= " ORDER BY q.created_at DESC";
    
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    return $stmt->fetchAll();
}

function createQuote($data) {
    $db = Database::getInstance()->getConnection();
    $stmt = $db->prepare("INSERT INTO quotes (type, client_name, email, phone, postal_code, details) VALUES (?, ?, ?, ?, ?, ?)");
    $result = $stmt->execute([
        $data['type'],
        $data['client_name'],
        $data['email'],
        $data['phone'] ?? null,
        $data['postal_code'] ?? null,
        json_encode($data['details'] ?? [])
    ]);
    
    if ($result) {
        $quoteId = $db->lastInsertId();
        logActivity($quoteId, null, 'system', 'Quote created');
        return $quoteId;
    }
    return false;
}

function updateQuote($id, $data) {
    $db = Database::getInstance()->getConnection();
    $fields = [];
    $params = [];
    
    foreach (['status', 'priority', 'assigned_to'] as $field) {
        if (isset($data[$field])) {
            $fields[] = "$field = ?";
            $params[] = $data[$field];
        }
    }
    
    $params[] = $id;
    $sql = "UPDATE quotes SET " . implode(', ', $fields) . " WHERE id = ?";
    
    $stmt = $db->prepare($sql);
    return $stmt->execute($params);
}

function assignQuote($quoteId, $brokerId, $actorId) {
    $db = Database::getInstance()->getConnection();
    
    // Get quote and broker info
    $stmt = $db->prepare("SELECT * FROM quotes WHERE id = ?");
    $stmt->execute([$quoteId]);
    $quote = $stmt->fetch();
    
    $stmt = $db->prepare("SELECT * FROM users WHERE id = ?");
    $stmt->execute([$brokerId]);
    $broker = $stmt->fetch();
    
    if (!$quote || !$broker) {
        return ['success' => false, 'message' => 'Quote or broker not found'];
    }
    
    // Check if broker is paused
    if ($broker['status'] === 'paused') {
        return ['success' => false, 'message' => 'Broker is currently paused'];
    }
    
    // Get lead cost
    $stmt = $db->prepare("SELECT setting_value FROM system_settings WHERE setting_key = 'lead_costs'");
    $stmt->execute();
    $leadCosts = json_decode($stmt->fetch()['setting_value'], true);
    $cost = $leadCosts[$quote['type']] ?? 10;
    
    // Check broker balance
    if ($broker['balance'] < $cost) {
        return ['success' => false, 'message' => 'Insufficient broker balance'];
    }
    
    // Deduct from broker balance
    $newBalance = $broker['balance'] - $cost;
    $db->prepare("UPDATE users SET balance = ? WHERE id = ?")->execute([$newBalance, $brokerId]);
    
    // Record transaction
    $db->prepare("INSERT INTO transactions (user_id, type, amount, balance_after, description) VALUES (?, 'lead_deduction', ?, ?, ?)")
       ->execute([$brokerId, -$cost, $newBalance, "Lead assignment: Quote #$quoteId"]);
    
    // Assign quote
    $db->prepare("UPDATE quotes SET assigned_to = ? WHERE id = ?")->execute([$brokerId, $quoteId]);
    
    // Log activity
    logActivity($quoteId, $actorId, 'assignment', "Assigned to {$broker['name']}");
    
    return ['success' => true, 'message' => 'Quote assigned successfully'];
}

// ============================================
// ACTIVITY LOGGING
// ============================================
function logActivity($quoteId, $userId, $type, $description, $metadata = null) {
    $db = Database::getInstance()->getConnection();
    $stmt = $db->prepare("INSERT INTO activities (quote_id, user_id, type, description, metadata) VALUES (?, ?, ?, ?, ?)");
    return $stmt->execute([$quoteId, $userId, $type, $description, json_encode($metadata)]);
}

function getActivities($quoteId) {
    $db = Database::getInstance()->getConnection();
    $stmt = $db->prepare("SELECT a.*, u.name as user_name FROM activities a 
                          LEFT JOIN users u ON a.user_id = u.id 
                          WHERE a.quote_id = ? ORDER BY a.created_at DESC");
    $stmt->execute([$quoteId]);
    return $stmt->fetchAll();
}

// ============================================
// TRANSACTIONS & CREDITS
// ============================================
function addCredits($userId, $amount, $description = 'Credit purchase') {
    $db = Database::getInstance()->getConnection();
    
    $stmt = $db->prepare("SELECT balance FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch();
    
    $newBalance = $user['balance'] + $amount;
    $db->prepare("UPDATE users SET balance = ? WHERE id = ?")->execute([$newBalance, $userId]);
    
    $db->prepare("INSERT INTO transactions (user_id, type, amount, balance_after, description) VALUES (?, 'credit_purchase', ?, ?, ?)")
       ->execute([$userId, $amount, $newBalance, $description]);
    
    return $newBalance;
}

function getTransactions($userId) {
    $db = Database::getInstance()->getConnection();
    $stmt = $db->prepare("SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC");
    $stmt->execute([$userId]);
    return $stmt->fetchAll();
}

// ============================================
// SETTINGS MANAGEMENT
// ============================================
function getSetting($key) {
    $db = Database::getInstance()->getConnection();
    $stmt = $db->prepare("SELECT setting_value FROM system_settings WHERE setting_key = ?");
    $stmt->execute([$key]);
    $result = $stmt->fetch();
    return $result ? json_decode($result['setting_value'], true) : null;
}

function setSetting($key, $value) {
    $db = Database::getInstance()->getConnection();
    $stmt = $db->prepare("INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?) 
                          ON DUPLICATE KEY UPDATE setting_value = ?");
    $jsonValue = json_encode($value);
    return $stmt->execute([$key, $jsonValue, $jsonValue]);
}

// ============================================
// API HANDLERS
// ============================================
function handleAPI() {
    header('Content-Type: application/json');
    $action = $_GET['action'] ?? '';
    $method = $_SERVER['REQUEST_METHOD'];
    
    switch ($action) {
        case 'login':
            if ($method === 'POST') {
                $data = json_decode(file_get_contents('php://input'), true);
                echo json_encode(login($data['email'], $data['password'], $data['role']));
            }
            break;
            
        case 'quotes':
            if ($method === 'GET') {
                requireAuth(['admin', 'manager', 'broker']);
                $filters = [];
                if ($_SESSION['user_role'] === 'broker') {
                    $filters['assigned_to'] = $_SESSION['user_id'];
                }
                echo json_encode(getQuotes($filters));
            } elseif ($method === 'POST') {
                $data = json_decode(file_get_contents('php://input'), true);
                $id = createQuote($data);
                echo json_encode(['success' => (bool)$id, 'id' => $id]);
            }
            break;
            
        case 'assign':
            if ($method === 'POST') {
                requireAuth(['admin', 'manager']);
                $data = json_decode(file_get_contents('php://input'), true);
                echo json_encode(assignQuote($data['quote_id'], $data['broker_id'], $_SESSION['user_id']));
            }
            break;
            
        case 'users':
            if ($method === 'GET') {
                requireAuth(['admin', 'manager']);
                echo json_encode(getUsers($_GET['role'] ?? null));
            } elseif ($method === 'POST') {
                requireAuth(['admin']);
                $data = json_decode(file_get_contents('php://input'), true);
                echo json_encode(['success' => createUser($data)]);
            }
            break;
            
        case 'credits':
            if ($method === 'POST') {
                requireAuth(['admin', 'manager']);
                $data = json_decode(file_get_contents('php://input'), true);
                $balance = addCredits($data['user_id'], $data['amount'], $data['description'] ?? 'Manual credit');
                echo json_encode(['success' => true, 'balance' => $balance]);
            }
            break;
            
        default:
            http_response_code(404);
            echo json_encode(['error' => 'Unknown action']);
    }
    exit;
}

// ============================================
// ROUTE HANDLING
// ============================================
if (isset($_GET['api'])) {
    handleAPI();
}

// Setup database on first run
try {
    setupDatabase();
} catch (Exception $e) {
    // Database might not be configured yet
}

// Handle form submissions
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    
    switch ($action) {
        case 'login':
            $result = login($_POST['email'], $_POST['password'], $_POST['role']);
            if ($result['success']) {
                header('Location: ?page=dashboard');
                exit;
            }
            $error = $result['message'];
            break;
            
        case 'logout':
            logout();
            break;
            
        case 'submit_quote':
            $quoteData = [
                'type' => $_POST['type'],
                'client_name' => $_POST['first_name'] . ' ' . $_POST['last_name'],
                'email' => $_POST['email'],
                'phone' => $_POST['phone'],
                'postal_code' => $_POST['postal_code'],
                'details' => $_POST
            ];
            createQuote($quoteData);
            $success = "Thank you! Your quote request has been submitted.";
            break;
            
        case 'create_user':
            requireAuth(['admin']);
            createUser($_POST);
            header('Location: ?page=users');
            exit;
            
        case 'update_user':
            requireAuth(['admin', 'manager']);
            updateUser($_POST['id'], $_POST);
            header('Location: ?page=users');
            exit;
            
        case 'assign_lead':
            requireAuth(['admin', 'manager']);
            assignQuote($_POST['quote_id'], $_POST['broker_id'], $_SESSION['user_id']);
            header('Location: ?page=leads');
            exit;
            
        case 'add_credits':
            requireAuth(['admin', 'manager']);
            addCredits($_POST['user_id'], $_POST['amount'], $_POST['description']);
            header('Location: ?page=users');
            exit;
            
        case 'update_status':
            requireAuth(['admin', 'manager', 'broker']);
            updateQuote($_POST['quote_id'], ['status' => $_POST['status']]);
            logActivity($_POST['quote_id'], $_SESSION['user_id'], 'status_change', "Status changed to {$_POST['status']}");
            header('Location: ?page=leads');
            exit;
    }
}

$page = $_GET['page'] ?? 'home';
$user = getCurrentUser();

// ============================================
// HTML OUTPUT
// ============================================
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= SITE_NAME ?> - Ontario Insurance Quotes</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        primary: '#1e3a5f',
                        accent: '#2d9cdb'
                    }
                }
            }
        }
    </script>
</head>
<body class="min-h-screen bg-gray-50">
    <!-- Navigation -->
    <nav class="bg-primary text-white shadow-lg">
        <div class="max-w-7xl mx-auto px-4">
            <div class="flex justify-between items-center h-16">
                <a href="?" class="text-2xl font-bold"><?= SITE_NAME ?></a>
                <div class="flex items-center gap-6">
                    <a href="?page=auto" class="hover:text-accent">Auto</a>
                    <a href="?page=home-insurance" class="hover:text-accent">Home</a>
                    <a href="?page=tenant" class="hover:text-accent">Tenant</a>
                    <a href="?page=life" class="hover:text-accent">Life</a>
                    <a href="?page=business" class="hover:text-accent">Business</a>
                    <a href="?page=mortgage" class="hover:text-accent">Mortgage</a>
                    <?php if ($user): ?>
                        <a href="?page=dashboard" class="bg-accent px-4 py-2 rounded">Dashboard</a>
                        <form method="POST" class="inline">
                            <input type="hidden" name="action" value="logout">
                            <button type="submit" class="hover:text-accent">Logout</button>
                        </form>
                    <?php else: ?>
                        <a href="?page=login" class="bg-accent px-4 py-2 rounded">Broker Login</a>
                    <?php endif; ?>
                </div>
            </div>
        </div>
    </nav>

    <main class="max-w-7xl mx-auto px-4 py-8">
        <?php if (isset($error)): ?>
            <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4"><?= htmlspecialchars($error) ?></div>
        <?php endif; ?>
        <?php if (isset($success)): ?>
            <div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4"><?= htmlspecialchars($success) ?></div>
        <?php endif; ?>

        <?php
        switch ($page) {
            case 'home':
                include_home_page();
                break;
            case 'login':
                include_login_page();
                break;
            case 'dashboard':
                requireAuth(['admin', 'manager', 'broker']);
                include_dashboard_page();
                break;
            case 'leads':
                requireAuth(['admin', 'manager', 'broker']);
                include_leads_page();
                break;
            case 'users':
                requireAuth(['admin', 'manager']);
                include_users_page();
                break;
            case 'auto':
            case 'home-insurance':
            case 'tenant':
            case 'life':
            case 'business':
            case 'mortgage':
                include_quote_form($page);
                break;
            default:
                include_home_page();
        }
        ?>
    </main>

    <footer class="bg-primary text-white py-8 mt-12">
        <div class="max-w-7xl mx-auto px-4 text-center">
            <p>&copy; <?= date('Y') ?> <?= SITE_NAME ?>. All rights reserved.</p>
            <p class="text-sm mt-2 text-gray-300">Ontario Insurance Quotes Made Simple</p>
        </div>
    </footer>
</body>
</html>

<?php
// ============================================
// PAGE TEMPLATES
// ============================================
function include_home_page() {
?>
    <div class="text-center py-16">
        <h1 class="text-5xl font-bold text-primary mb-6">Insurance made simple for Ontarians</h1>
        <p class="text-xl text-gray-600 mb-8">Compare quotes from Canada's top providers. Save money on Auto, Home, and Business insurance.</p>
        <a href="?page=auto" class="bg-accent text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-600">Get a Quote</a>
    </div>
    
    <div class="grid md:grid-cols-3 lg:grid-cols-6 gap-4 mt-12">
        <?php
        $products = [
            ['Auto', 'auto', 'Compare rates for all drivers'],
            ['Home', 'home-insurance', 'Protect your investment'],
            ['Tenant', 'tenant', 'Affordable renters coverage'],
            ['Life', 'life', 'Secure your family'],
            ['Business', 'business', 'Liability & property'],
            ['Mortgage', 'mortgage', 'Best mortgage rates']
        ];
        foreach ($products as $p):
        ?>
            <a href="?page=<?= $p[1] ?>" class="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition text-center">
                <h3 class="font-bold text-primary mb-2"><?= $p[0] ?></h3>
                <p class="text-sm text-gray-500"><?= $p[2] ?></p>
            </a>
        <?php endforeach; ?>
    </div>
<?php
}

function include_login_page() {
?>
    <div class="max-w-md mx-auto">
        <div class="bg-white rounded-lg shadow-lg p-8">
            <h2 class="text-2xl font-bold text-primary mb-6">Broker Portal Login</h2>
            <form method="POST">
                <input type="hidden" name="action" value="login">
                
                <div class="mb-4">
                    <label class="block text-gray-700 mb-2">Email</label>
                    <input type="email" name="email" required class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-accent">
                </div>
                
                <div class="mb-4">
                    <label class="block text-gray-700 mb-2">Password</label>
                    <input type="password" name="password" required class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-accent">
                </div>
                
                <div class="mb-6">
                    <label class="block text-gray-700 mb-2">Role</label>
                    <select name="role" required class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-accent">
                        <option value="broker">Broker</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>
                
                <button type="submit" class="w-full bg-accent text-white py-3 rounded-lg font-semibold hover:bg-blue-600">Log In</button>
            </form>
        </div>
    </div>
<?php
}

function include_dashboard_page() {
    global $user;
    $quotes = getQuotes($_SESSION['user_role'] === 'broker' ? ['assigned_to' => $_SESSION['user_id']] : []);
    $newCount = count(array_filter($quotes, fn($q) => $q['status'] === 'New'));
    $contactedCount = count(array_filter($quotes, fn($q) => $q['status'] === 'Contacted'));
?>
    <h1 class="text-3xl font-bold text-primary mb-6">Dashboard</h1>
    <p class="text-gray-600 mb-8">Welcome back, <?= htmlspecialchars($user['name']) ?>!</p>
    
    <div class="grid md:grid-cols-4 gap-6 mb-8">
        <div class="bg-white p-6 rounded-lg shadow">
            <h3 class="text-gray-500 text-sm">Total Leads</h3>
            <p class="text-3xl font-bold text-primary"><?= count($quotes) ?></p>
        </div>
        <div class="bg-white p-6 rounded-lg shadow">
            <h3 class="text-gray-500 text-sm">New Leads</h3>
            <p class="text-3xl font-bold text-green-600"><?= $newCount ?></p>
        </div>
        <div class="bg-white p-6 rounded-lg shadow">
            <h3 class="text-gray-500 text-sm">Contacted</h3>
            <p class="text-3xl font-bold text-blue-600"><?= $contactedCount ?></p>
        </div>
        <?php if ($user['role'] === 'broker'): ?>
        <div class="bg-white p-6 rounded-lg shadow">
            <h3 class="text-gray-500 text-sm">Credit Balance</h3>
            <p class="text-3xl font-bold text-accent">$<?= number_format($user['balance'], 2) ?></p>
        </div>
        <?php endif; ?>
    </div>
    
    <div class="flex gap-4 mb-8">
        <a href="?page=leads" class="bg-accent text-white px-6 py-3 rounded-lg hover:bg-blue-600">View All Leads</a>
        <?php if (in_array($user['role'], ['admin', 'manager'])): ?>
            <a href="?page=users" class="bg-primary text-white px-6 py-3 rounded-lg hover:bg-blue-900">Manage Users</a>
        <?php endif; ?>
    </div>
<?php
}

function include_leads_page() {
    global $user;
    $quotes = getQuotes($_SESSION['user_role'] === 'broker' ? ['assigned_to' => $_SESSION['user_id']] : []);
    $brokers = getUsers('broker', 'active');
?>
    <h1 class="text-3xl font-bold text-primary mb-6">Lead Management</h1>
    
    <div class="bg-white rounded-lg shadow overflow-hidden">
        <table class="w-full">
            <thead class="bg-gray-50">
                <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned To</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
                <?php foreach ($quotes as $quote): ?>
                <tr>
                    <td class="px-6 py-4">#<?= $quote['id'] ?></td>
                    <td class="px-6 py-4"><span class="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm"><?= $quote['type'] ?></span></td>
                    <td class="px-6 py-4"><?= htmlspecialchars($quote['client_name']) ?></td>
                    <td class="px-6 py-4"><?= htmlspecialchars($quote['email']) ?></td>
                    <td class="px-6 py-4">
                        <form method="POST" class="inline">
                            <input type="hidden" name="action" value="update_status">
                            <input type="hidden" name="quote_id" value="<?= $quote['id'] ?>">
                            <select name="status" onchange="this.form.submit()" class="text-sm border rounded px-2 py-1">
                                <?php foreach (['New', 'Contacted', 'Quoted', 'Bound', 'Follow-Up', 'Closed', 'Lost'] as $status): ?>
                                    <option value="<?= $status ?>" <?= $quote['status'] === $status ? 'selected' : '' ?>><?= $status ?></option>
                                <?php endforeach; ?>
                            </select>
                        </form>
                    </td>
                    <td class="px-6 py-4"><?= $quote['assigned_name'] ?? '<span class="text-gray-400">Unassigned</span>' ?></td>
                    <td class="px-6 py-4">
                        <?php if (in_array($user['role'], ['admin', 'manager']) && !$quote['assigned_to']): ?>
                        <form method="POST" class="inline">
                            <input type="hidden" name="action" value="assign_lead">
                            <input type="hidden" name="quote_id" value="<?= $quote['id'] ?>">
                            <select name="broker_id" class="text-sm border rounded px-2 py-1">
                                <option value="">Assign to...</option>
                                <?php foreach ($brokers as $broker): ?>
                                    <option value="<?= $broker['id'] ?>"><?= htmlspecialchars($broker['name']) ?> ($<?= number_format($broker['balance'], 2) ?>)</option>
                                <?php endforeach; ?>
                            </select>
                            <button type="submit" class="ml-2 text-accent hover:underline">Assign</button>
                        </form>
                        <?php endif; ?>
                    </td>
                </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>
<?php
}

function include_users_page() {
    $users = getUsers();
?>
    <h1 class="text-3xl font-bold text-primary mb-6">User Management</h1>
    
    <div class="mb-6">
        <button onclick="document.getElementById('addUserModal').classList.remove('hidden')" class="bg-accent text-white px-6 py-3 rounded-lg hover:bg-blue-600">Add New User</button>
    </div>
    
    <div class="bg-white rounded-lg shadow overflow-hidden">
        <table class="w-full">
            <thead class="bg-gray-50">
                <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
                <?php foreach ($users as $u): ?>
                <tr>
                    <td class="px-6 py-4"><?= htmlspecialchars($u['name']) ?></td>
                    <td class="px-6 py-4"><?= htmlspecialchars($u['email']) ?></td>
                    <td class="px-6 py-4"><span class="bg-purple-100 text-purple-800 px-2 py-1 rounded text-sm"><?= ucfirst($u['role']) ?></span></td>
                    <td class="px-6 py-4">
                        <span class="px-2 py-1 rounded text-sm <?= $u['status'] === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800' ?>">
                            <?= ucfirst($u['status']) ?>
                        </span>
                    </td>
                    <td class="px-6 py-4">$<?= number_format($u['balance'], 2) ?></td>
                    <td class="px-6 py-4">
                        <?php if ($u['role'] === 'broker'): ?>
                        <form method="POST" class="inline">
                            <input type="hidden" name="action" value="add_credits">
                            <input type="hidden" name="user_id" value="<?= $u['id'] ?>">
                            <input type="number" name="amount" placeholder="Amount" class="w-20 text-sm border rounded px-2 py-1" step="0.01">
                            <input type="hidden" name="description" value="Manual credit adjustment">
                            <button type="submit" class="ml-2 text-accent hover:underline">Add Credits</button>
                        </form>
                        <?php endif; ?>
                    </td>
                </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>
    
    <!-- Add User Modal -->
    <div id="addUserModal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
        <div class="bg-white rounded-lg p-8 max-w-md w-full">
            <h2 class="text-2xl font-bold text-primary mb-6">Add New User</h2>
            <form method="POST">
                <input type="hidden" name="action" value="create_user">
                <div class="mb-4">
                    <label class="block text-gray-700 mb-2">Name</label>
                    <input type="text" name="name" required class="w-full px-4 py-2 border rounded-lg">
                </div>
                <div class="mb-4">
                    <label class="block text-gray-700 mb-2">Email</label>
                    <input type="email" name="email" required class="w-full px-4 py-2 border rounded-lg">
                </div>
                <div class="mb-4">
                    <label class="block text-gray-700 mb-2">Password</label>
                    <input type="password" name="password" required class="w-full px-4 py-2 border rounded-lg">
                </div>
                <div class="mb-4">
                    <label class="block text-gray-700 mb-2">Phone</label>
                    <input type="tel" name="phone" class="w-full px-4 py-2 border rounded-lg">
                </div>
                <div class="mb-4">
                    <label class="block text-gray-700 mb-2">Role</label>
                    <select name="role" required class="w-full px-4 py-2 border rounded-lg">
                        <option value="broker">Broker</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>
                <div class="mb-6">
                    <label class="block text-gray-700 mb-2">Status</label>
                    <select name="status" required class="w-full px-4 py-2 border rounded-lg">
                        <option value="active">Active</option>
                        <option value="pending">Pending</option>
                    </select>
                </div>
                <div class="flex gap-4">
                    <button type="submit" class="flex-1 bg-accent text-white py-3 rounded-lg font-semibold hover:bg-blue-600">Create User</button>
                    <button type="button" onclick="document.getElementById('addUserModal').classList.add('hidden')" class="flex-1 bg-gray-300 py-3 rounded-lg font-semibold hover:bg-gray-400">Cancel</button>
                </div>
            </form>
        </div>
    </div>
<?php
}

function include_quote_form($type) {
    $typeNames = [
        'auto' => 'Auto Insurance',
        'home-insurance' => 'Home Insurance',
        'tenant' => 'Tenant Insurance',
        'life' => 'Life Insurance',
        'business' => 'Business Insurance',
        'mortgage' => 'Mortgage'
    ];
    $typeName = $typeNames[$type] ?? 'Insurance';
    $dbType = ucfirst(str_replace('-insurance', '', $type));
    if ($dbType === 'Home-insurance') $dbType = 'Home';
?>
    <div class="max-w-2xl mx-auto">
        <div class="bg-primary text-white rounded-t-lg p-8 text-center">
            <h1 class="text-3xl font-bold mb-2"><?= $typeName ?> Quote</h1>
            <p class="text-gray-300">Get your personalized quote in minutes</p>
        </div>
        
        <div class="bg-white rounded-b-lg shadow-lg p-8">
            <form method="POST">
                <input type="hidden" name="action" value="submit_quote">
                <input type="hidden" name="type" value="<?= htmlspecialchars($dbType) ?>">
                
                <div class="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label class="block text-gray-700 mb-2">First Name</label>
                        <input type="text" name="first_name" required class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-accent">
                    </div>
                    <div>
                        <label class="block text-gray-700 mb-2">Last Name</label>
                        <input type="text" name="last_name" required class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-accent">
                    </div>
                </div>
                
                <div class="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label class="block text-gray-700 mb-2">Email</label>
                        <input type="email" name="email" required class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-accent">
                    </div>
                    <div>
                        <label class="block text-gray-700 mb-2">Phone</label>
                        <input type="tel" name="phone" required class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-accent">
                    </div>
                </div>
                
                <div class="mb-4">
                    <label class="block text-gray-700 mb-2">Postal Code</label>
                    <input type="text" name="postal_code" required placeholder="M5V 3A8" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-accent">
                </div>
                
                <?php if ($type === 'auto'): ?>
                <div class="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label class="block text-gray-700 mb-2">Date of Birth</label>
                        <input type="date" name="dob" required class="w-full px-4 py-2 border rounded-lg">
                    </div>
                    <div>
                        <label class="block text-gray-700 mb-2">License Type</label>
                        <select name="license_type" required class="w-full px-4 py-2 border rounded-lg">
                            <option value="G">G License</option>
                            <option value="G2">G2 License</option>
                            <option value="G1">G1 License</option>
                        </select>
                    </div>
                </div>
                <div class="grid md:grid-cols-3 gap-4 mb-4">
                    <div>
                        <label class="block text-gray-700 mb-2">Vehicle Year</label>
                        <input type="number" name="vehicle_year" min="1990" max="2026" class="w-full px-4 py-2 border rounded-lg">
                    </div>
                    <div>
                        <label class="block text-gray-700 mb-2">Vehicle Make</label>
                        <input type="text" name="vehicle_make" placeholder="Toyota" class="w-full px-4 py-2 border rounded-lg">
                    </div>
                    <div>
                        <label class="block text-gray-700 mb-2">Vehicle Model</label>
                        <input type="text" name="vehicle_model" placeholder="Camry" class="w-full px-4 py-2 border rounded-lg">
                    </div>
                </div>
                <?php endif; ?>
                
                <?php if ($type === 'home-insurance'): ?>
                <div class="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label class="block text-gray-700 mb-2">Year Built</label>
                        <input type="number" name="year_built" min="1800" max="2026" class="w-full px-4 py-2 border rounded-lg">
                    </div>
                    <div>
                        <label class="block text-gray-700 mb-2">Square Footage</label>
                        <input type="number" name="sqft" class="w-full px-4 py-2 border rounded-lg">
                    </div>
                </div>
                <div class="mb-4">
                    <label class="block text-gray-700 mb-2">Property Type</label>
                    <select name="property_type" class="w-full px-4 py-2 border rounded-lg">
                        <option value="detached">Detached House</option>
                        <option value="semi">Semi-Detached</option>
                        <option value="townhouse">Townhouse</option>
                        <option value="condo">Condo</option>
                    </select>
                </div>
                <?php endif; ?>
                
                <?php if ($type === 'mortgage'): ?>
                <div class="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label class="block text-gray-700 mb-2">Mortgage Type</label>
                        <select name="mortgage_type" class="w-full px-4 py-2 border rounded-lg">
                            <option value="purchase">New Purchase</option>
                            <option value="refinance">Refinance</option>
                            <option value="renewal">Renewal</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-gray-700 mb-2">Property Type</label>
                        <select name="property_type" class="w-full px-4 py-2 border rounded-lg">
                            <option value="detached">Detached House</option>
                            <option value="semi">Semi-Detached</option>
                            <option value="townhouse">Townhouse</option>
                            <option value="condo">Condo</option>
                        </select>
                    </div>
                </div>
                <div class="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label class="block text-gray-700 mb-2">Purchase/Property Price</label>
                        <input type="number" name="purchase_price" placeholder="500000" class="w-full px-4 py-2 border rounded-lg">
                    </div>
                    <div>
                        <label class="block text-gray-700 mb-2">Down Payment</label>
                        <input type="number" name="down_payment" placeholder="100000" class="w-full px-4 py-2 border rounded-lg">
                    </div>
                </div>
                <div class="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label class="block text-gray-700 mb-2">Annual Income</label>
                        <input type="number" name="annual_income" class="w-full px-4 py-2 border rounded-lg">
                    </div>
                    <div>
                        <label class="block text-gray-700 mb-2">Employment Status</label>
                        <select name="employment_status" class="w-full px-4 py-2 border rounded-lg">
                            <option value="employed">Employed</option>
                            <option value="self-employed">Self-Employed</option>
                            <option value="retired">Retired</option>
                        </select>
                    </div>
                </div>
                <?php endif; ?>
                
                <?php if ($type === 'life'): ?>
                <div class="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label class="block text-gray-700 mb-2">Date of Birth</label>
                        <input type="date" name="dob" required class="w-full px-4 py-2 border rounded-lg">
                    </div>
                    <div>
                        <label class="block text-gray-700 mb-2">Coverage Amount</label>
                        <select name="coverage_amount" class="w-full px-4 py-2 border rounded-lg">
                            <option value="100000">$100,000</option>
                            <option value="250000">$250,000</option>
                            <option value="500000">$500,000</option>
                            <option value="1000000">$1,000,000</option>
                        </select>
                    </div>
                </div>
                <div class="mb-4">
                    <label class="block text-gray-700 mb-2">Do you smoke?</label>
                    <select name="smoker" class="w-full px-4 py-2 border rounded-lg">
                        <option value="no">No</option>
                        <option value="yes">Yes</option>
                    </select>
                </div>
                <?php endif; ?>
                
                <div class="mb-6">
                    <label class="block text-gray-700 mb-2">Additional Notes</label>
                    <textarea name="notes" rows="3" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-accent" placeholder="Any additional information..."></textarea>
                </div>
                
                <button type="submit" class="w-full bg-accent text-white py-4 rounded-lg text-lg font-semibold hover:bg-blue-600">Get My Quote</button>
                
                <p class="text-center text-sm text-gray-500 mt-4">By submitting, you agree to be contacted by a licensed specialist.</p>
            </form>
        </div>
    </div>
<?php
}
?>
