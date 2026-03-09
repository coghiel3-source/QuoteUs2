<?php

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../storage.php';
require_once __DIR__ . '/../email.php';

$DEFAULT_LEAD_COSTS = [
    'Auto' => 10,
    'Home' => 15,
    'Tenant' => 5,
    'Business' => 20,
    'Life' => 12,
    'Travel' => 3,
    'Pet' => 5,
    'General' => 8,
];

if (!function_exists('getLeadCosts')) {
    function getLeadCosts() {
        global $DEFAULT_LEAD_COSTS;
        $storedCosts = storage()->getSetting('lead_costs');
        if ($storedCosts) {
            $parsed = json_decode($storedCosts, true);
            if (is_array($parsed)) return $parsed;
        }
        return $DEFAULT_LEAD_COSTS;
    }
}

function getManagerPermissions() {
    $settingValue = storage()->getSetting('manager_permissions');
    if (!$settingValue) {
        return [
            'viewLeads' => true,
            'assignLeads' => true,
            'manageBrokers' => false,
            'viewCredits' => true,
            'adjustBalances' => false,
            'viewSettings' => false,
        ];
    }
    return json_decode($settingValue, true);
}

if (!function_exists('checkPermission')) {
function checkPermission($userId, $permission) {
    $user = storage()->getUser($userId);
    if (!$user) return false;
    if ($user['role'] === 'admin') return true;
    if ($user['role'] === 'manager') {
        $userPermissions = null;
        if (!empty($user['permissions'])) {
            $userPermissions = is_string($user['permissions']) ? json_decode($user['permissions'], true) : $user['permissions'];
        }
        if ($userPermissions && is_array($userPermissions)) {
            return !empty($userPermissions[$permission]);
        }
        $globalPermissions = getManagerPermissions();
        return !empty($globalPermissions[$permission]);
    }
    return false;
}
}

if (!function_exists('safeUser')) {
    function safeUser($user) {
        if (!$user) return $user;
        unset($user['password'], $user['reset_token'], $user['reset_token_expiry']);
        if (isset($user['product_types']) && is_string($user['product_types'])) {
            $user['product_types'] = json_decode($user['product_types'], true);
        }
        if (isset($user['permissions']) && is_string($user['permissions'])) {
            $user['permissions'] = json_decode($user['permissions'], true);
        }
        if (isset($user['assigned_postal_codes']) && is_string($user['assigned_postal_codes'])) {
            $user['assigned_postal_codes'] = json_decode($user['assigned_postal_codes'], true);
        }
        if (isset($user['assigned_cities']) && is_string($user['assigned_cities'])) {
            $user['assigned_cities'] = json_decode($user['assigned_cities'], true);
        }
        if (isset($user['preferred_insurance_types']) && is_string($user['preferred_insurance_types'])) {
            $user['preferred_insurance_types'] = json_decode($user['preferred_insurance_types'], true);
        }
        return $user;
    }
}

function handleAdminRoutes($method, $path) {

    if ($method === 'POST' && $path === '/api/admin/lead-costs') {
        $input = json_decode(file_get_contents('php://input'), true);
        $costs = $input['costs'] ?? null;
        $actorId = $input['actorId'] ?? null;

        if (!$costs || !is_array($costs)) {
            http_response_code(400);
            return ['error' => 'Costs object is required'];
        }
        if (!$actorId) {
            http_response_code(401);
            return ['error' => 'Actor ID is required for authentication'];
        }

        $actor = storage()->getUser($actorId);
        if (!$actor) {
            http_response_code(403);
            return ['error' => 'User not found'];
        }
        if ($actor['role'] === 'manager') {
            if (!checkPermission($actorId, 'editLeadCosts')) {
                http_response_code(403);
                return ['error' => "You don't have permission to edit lead costs"];
            }
        } elseif ($actor['role'] !== 'admin') {
            http_response_code(403);
            return ['error' => 'Only admin/manager can update lead costs'];
        }

        foreach ($costs as $type => $cost) {
            $numCost = floatval($cost);
            if (!is_numeric($cost) || $numCost < 0) {
                http_response_code(400);
                return ['error' => "Invalid cost for $type: must be \$0 or higher"];
            }
        }

        storage()->setSetting('lead_costs', json_encode($costs), $actorId);
        return ['success' => true, 'costs' => $costs];
    }

    if ($method === 'GET' && $path === '/api/credits/lead-costs') {
        $costs = getLeadCosts();
        return ['costs' => $costs];
    }

    if ($method === 'POST' && $path === '/api/admin/smtp/test') {
        $input = json_decode(file_get_contents('php://input'), true);
        $actorId = $input['actorId'] ?? null;
        if (!$actorId) {
            http_response_code(401);
            return ['error' => 'Actor ID is required'];
        }
        $actor = storage()->getUser($actorId);
        if (!$actor || $actor['role'] !== 'admin') {
            http_response_code(403);
            return ['error' => 'Only admin can configure SMTP'];
        }

        $host = $input['host'] ?? '';
        $username = $input['username'] ?? '';
        $password = $input['password'] ?? '';

        if (!$host || !$username) {
            http_response_code(400);
            return ['error' => 'Host and username are required'];
        }

        if (!$password) {
            $existingSettingValue = storage()->getSetting('smtp_settings');
            if ($existingSettingValue) {
                $existing = json_decode($existingSettingValue, true);
                $password = $existing['password'] ?? '';
            }
        }
        if (!$password) {
            http_response_code(400);
            return ['error' => 'Password is required'];
        }

        $port = intval($input['port'] ?? 587);
        $useSsl = !empty($input['useSsl']);

        $protocol = ($useSsl && $port === 465) ? 'ssl' : 'tcp';
        $streamHost = ($protocol === 'ssl') ? "ssl://$host" : $host;
        $socket = @stream_socket_client("$streamHost:$port", $errno, $errstr, 15);

        if (!$socket) {
            http_response_code(400);
            return ['error' => "SMTP connection failed: $errstr ($errno)"];
        }
        fclose($socket);
        return ['success' => true, 'message' => 'SMTP connection successful'];
    }

    if ($method === 'POST' && $path === '/api/admin/smtp/save') {
        $input = json_decode(file_get_contents('php://input'), true);
        $actorId = $input['actorId'] ?? null;
        if (!$actorId) {
            http_response_code(401);
            return ['error' => 'Actor ID is required'];
        }
        $actor = storage()->getUser($actorId);
        if (!$actor || $actor['role'] !== 'admin') {
            http_response_code(403);
            return ['error' => 'Only admin can configure SMTP'];
        }

        $host = $input['host'] ?? '';
        $username = $input['username'] ?? '';
        $password = $input['password'] ?? '';

        if (!$host || !$username) {
            http_response_code(400);
            return ['error' => 'Host and username are required'];
        }

        $existingPassword = '';
        $existingSettingValue = storage()->getSetting('smtp_settings');
        if ($existingSettingValue) {
            $existing = json_decode($existingSettingValue, true);
            $existingPassword = $existing['password'] ?? '';
        }

        $finalPassword = $password ?: $existingPassword;
        if (!$finalPassword) {
            http_response_code(400);
            return ['error' => 'Password is required for initial setup'];
        }

        $smtpSettings = [
            'host' => $host,
            'port' => intval($input['port'] ?? 587),
            'username' => $username,
            'password' => $finalPassword,
            'fromEmail' => $input['fromEmail'] ?? $username,
            'fromName' => $input['fromName'] ?? 'QuoteUs.ca',
            'useSsl' => ($input['useSsl'] ?? true) !== false,
        ];

        storage()->setSetting('smtp_settings', json_encode($smtpSettings), $actorId);
        clearSmtpCache();
        return ['success' => true, 'message' => 'SMTP settings saved'];
    }

    if ($method === 'GET' && $path === '/api/admin/smtp/settings') {
        $settingValue = storage()->getSetting('smtp_settings');
        if (!$settingValue) {
            return ['configured' => false];
        }
        $settings = json_decode($settingValue, true);
        return [
            'configured' => true,
            'host' => $settings['host'] ?? '',
            'port' => $settings['port'] ?? 587,
            'username' => $settings['username'] ?? '',
            'fromEmail' => $settings['fromEmail'] ?? '',
            'fromName' => $settings['fromName'] ?? '',
            'useSsl' => $settings['useSsl'] ?? false,
            'hasPassword' => !empty($settings['password']),
        ];
    }

    if ($method === 'POST' && $path === '/api/admin/smtp/send-test') {
        $input = json_decode(file_get_contents('php://input'), true);
        $actorId = $input['actorId'] ?? null;
        $toEmail = $input['toEmail'] ?? '';
        if (!$actorId) {
            http_response_code(401);
            return ['error' => 'Actor ID is required'];
        }
        $actor = storage()->getUser($actorId);
        if (!$actor || $actor['role'] !== 'admin') {
            http_response_code(403);
            return ['error' => 'Only admin can send test emails'];
        }
        if (!$toEmail) {
            http_response_code(400);
            return ['error' => 'Email address is required'];
        }

        $html = '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Email Test Successful!</h2>
            <p>This is a test email from QuoteUs.ca to verify your SMTP settings are working correctly.</p>
            <p>If you received this email, your email configuration is properly set up.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="color: #6b7280; font-size: 12px;">Sent from QuoteUs.ca CRM System</p>
        </div>';

        $result = sendEmail($toEmail, 'QuoteUs.ca - Test Email', $html);
        if ($result) {
            return ['success' => true, 'message' => 'Test email sent successfully!'];
        }
        http_response_code(400);
        return ['error' => 'Failed to send test email. Please check your SMTP settings.'];
    }

    if ($method === 'GET' && $path === '/api/admin/manager-permissions') {
        $permissions = getManagerPermissions();
        return ['permissions' => $permissions];
    }

    if ($method === 'POST' && $path === '/api/admin/manager-permissions') {
        $input = json_decode(file_get_contents('php://input'), true);
        $permissions = $input['permissions'] ?? null;
        $actorId = $input['actorId'] ?? null;

        if ($actorId) {
            $actor = storage()->getUser($actorId);
            if (!$actor || $actor['role'] !== 'admin') {
                http_response_code(403);
                return ['error' => 'Only admins can modify manager permissions'];
            }
        }

        storage()->setSetting('manager_permissions', json_encode($permissions));
        return ['success' => true];
    }

    if ($method === 'GET' && preg_match('#^/api/admin/settings/([^/]+)$#', $path, $m)) {
        $key = $m[1];
        $value = storage()->getSetting($key);
        return ['value' => $value];
    }

    if ($method === 'POST' && preg_match('#^/api/admin/settings/([^/]+)$#', $path, $m)) {
        $key = $m[1];
        $input = json_decode(file_get_contents('php://input'), true);
        $value = $input['value'] ?? '';
        $actorId = $input['actorId'] ?? null;

        if (!$actorId) {
            http_response_code(401);
            return ['error' => 'Actor ID is required'];
        }
        $actor = storage()->getUser($actorId);
        if (!$actor || ($actor['role'] !== 'admin' && $actor['role'] !== 'manager')) {
            http_response_code(403);
            return ['error' => 'Only admin/manager can modify settings'];
        }

        storage()->setSetting($key, $value, $actorId);
        return ['success' => true];
    }

    if ($method === 'POST' && $path === '/api/admin/broker-lead-cost') {
        $input = json_decode(file_get_contents('php://input'), true);
        $brokerId = $input['brokerId'] ?? null;
        $leadCost = $input['leadCost'] ?? null;
        $actorId = $input['actorId'] ?? null;

        if (!$brokerId) {
            http_response_code(400);
            return ['error' => 'Broker ID is required'];
        }
        if (!$actorId) {
            http_response_code(401);
            return ['error' => 'Actor ID is required for authentication'];
        }
        $actor = storage()->getUser($actorId);
        if (!$actor || ($actor['role'] !== 'admin' && $actor['role'] !== 'manager')) {
            http_response_code(403);
            return ['error' => 'Only admin/manager can update broker lead costs'];
        }

        $broker = storage()->getUser($brokerId);
        if (!$broker) {
            http_response_code(404);
            return ['error' => 'Broker not found'];
        }
        if ($broker['role'] !== 'broker') {
            http_response_code(400);
            return ['error' => 'Can only set lead costs for brokers'];
        }

        $costValue = null;
        if ($leadCost !== null && $leadCost !== '') {
            $numCost = floatval($leadCost);
            if (!is_numeric($leadCost) || $numCost < 0) {
                http_response_code(400);
                return ['error' => 'Lead cost must be $0 or higher'];
            }
            $costValue = number_format($numCost, 2, '.', '');
        }

        $updatedUser = storage()->updateUser($brokerId, ['lead_cost_override' => $costValue]);
        return ['success' => true, 'broker' => safeUser($updatedUser)];
    }

    if ($method === 'POST' && $path === '/api/admin/broker-profile') {
        $input = json_decode(file_get_contents('php://input'), true);
        $brokerId = $input['brokerId'] ?? null;
        $actorId = $input['actorId'] ?? null;

        if (!$actorId) {
            http_response_code(401);
            return ['error' => 'Actor ID is required'];
        }
        $actor = storage()->getUser($actorId);
        if (!$actor || ($actor['role'] !== 'admin' && $actor['role'] !== 'manager')) {
            http_response_code(403);
            return ['error' => 'Only admin/manager can update broker profiles'];
        }
        if (!$brokerId) {
            http_response_code(400);
            return ['error' => 'Broker ID is required'];
        }
        $broker = storage()->getUser($brokerId);
        if (!$broker || $broker['role'] !== 'broker') {
            http_response_code(404);
            return ['error' => 'Broker not found'];
        }

        $updateData = [];
        if (isset($input['brokerTier'])) $updateData['broker_tier'] = $input['brokerTier'] ?: null;
        if (isset($input['preferredInsuranceTypes'])) $updateData['preferred_insurance_types'] = $input['preferredInsuranceTypes'];
        if (isset($input['preferredDemographics'])) $updateData['preferred_demographics'] = $input['preferredDemographics'];
        if (isset($input['referenceId'])) {
            $refId = $input['referenceId'];
            if ($refId !== null) {
                $normalizedRefId = strtoupper(trim($refId));
                if (!preg_match('/^[A-Z0-9]{1,6}$/', $normalizedRefId)) {
                    http_response_code(400);
                    return ['error' => 'Reference ID must be 1-6 alphanumeric characters'];
                }
                $allUsers = storage()->getAllUsers();
                foreach ($allUsers as $u) {
                    if (!empty($u['reference_id']) && strtoupper($u['reference_id']) === $normalizedRefId && $u['id'] !== $brokerId) {
                        http_response_code(409);
                        return ['error' => "Reference ID \"$normalizedRefId\" is already assigned to {$u['name']}"];
                    }
                }
                $updateData['reference_id'] = $normalizedRefId;
            } else {
                $updateData['reference_id'] = null;
            }
        }

        $updated = storage()->updateUser($brokerId, $updateData);
        return ['success' => true, 'broker' => safeUser($updated)];
    }

    if ($method === 'GET' && preg_match('#^/api/admin/broker-notes/([^/]+)$#', $path, $m)) {
        $brokerId = $m[1];
        $actorId = $_GET['actorId'] ?? null;
        if (!$actorId) {
            http_response_code(401);
            return ['error' => 'Actor ID is required'];
        }
        $actor = storage()->getUser($actorId);
        if (!$actor || ($actor['role'] !== 'admin' && $actor['role'] !== 'manager')) {
            http_response_code(403);
            return ['error' => 'Only admin/manager can view broker notes'];
        }
        $notes = storage()->getBrokerNotes($brokerId);
        return $notes;
    }

    if ($method === 'POST' && $path === '/api/admin/broker-notes') {
        $input = json_decode(file_get_contents('php://input'), true);
        $brokerId = $input['brokerId'] ?? null;
        $content = $input['content'] ?? '';
        $actorId = $input['actorId'] ?? null;
        $authorName = $input['authorName'] ?? '';

        if (!$actorId) {
            http_response_code(401);
            return ['error' => 'Actor ID is required'];
        }
        $actor = storage()->getUser($actorId);
        if (!$actor || ($actor['role'] !== 'admin' && $actor['role'] !== 'manager')) {
            http_response_code(403);
            return ['error' => 'Only admin/manager can add broker notes'];
        }
        if (!$brokerId || !$content) {
            http_response_code(400);
            return ['error' => 'Broker ID and content are required'];
        }

        $note = storage()->createBrokerNote([
            'broker_id' => $brokerId,
            'author_id' => $actorId,
            'author_name' => $authorName ?: $actor['name'],
            'content' => $content,
        ]);
        return $note;
    }

    if ($method === 'DELETE' && preg_match('#^/api/admin/broker-notes/([^/]+)$#', $path, $m)) {
        $noteId = $m[1];
        $actorId = $_GET['actorId'] ?? null;
        if (!$actorId) {
            http_response_code(401);
            return ['error' => 'Actor ID is required'];
        }
        $actor = storage()->getUser($actorId);
        if (!$actor || ($actor['role'] !== 'admin' && $actor['role'] !== 'manager')) {
            http_response_code(403);
            return ['error' => 'Only admin/manager can delete broker notes'];
        }
        $deleted = storage()->deleteBrokerNote($noteId);
        return ['success' => $deleted];
    }

    if ($method === 'GET' && preg_match('#^/api/admin/broker-stats/([^/]+)$#', $path, $m)) {
        $brokerId = $m[1];
        $actorId = $_GET['actorId'] ?? null;
        if (!$actorId) {
            http_response_code(401);
            return ['error' => 'Actor ID is required'];
        }
        $actor = storage()->getUser($actorId);
        if (!$actor || ($actor['role'] !== 'admin' && $actor['role'] !== 'manager')) {
            http_response_code(403);
            return ['error' => 'Only admin/manager can view broker stats'];
        }

        $allQuotes = storage()->getAllQuotes();
        $brokerQuotes = array_filter($allQuotes, fn($q) => ($q['assigned_to'] ?? '') === $brokerId);

        $totalAssigned = count($brokerQuotes);
        $bound = count(array_filter($brokerQuotes, fn($q) => $q['status'] === 'Bound'));
        $win = count(array_filter($brokerQuotes, fn($q) => $q['status'] === 'Win'));
        $lose = count(array_filter($brokerQuotes, fn($q) => $q['status'] === 'Lose'));
        $quoted = count(array_filter($brokerQuotes, fn($q) => $q['status'] === 'Quoted'));
        $lost = count(array_filter($brokerQuotes, fn($q) => $q['status'] === 'Lost'));
        $closed = count(array_filter($brokerQuotes, fn($q) => $q['status'] === 'Closed'));
        $contacted = count(array_filter($brokerQuotes, fn($q) => $q['status'] === 'Contacted'));
        $followUp = count(array_filter($brokerQuotes, fn($q) => $q['status'] === 'Follow-Up'));
        $newLeads = count(array_filter($brokerQuotes, fn($q) => $q['status'] === 'New'));
        $totalWins = $bound + $win;
        $winRate = $totalAssigned > 0 ? number_format(($totalWins / $totalAssigned) * 100, 1) : '0.0';

        $byType = [];
        foreach ($brokerQuotes as $q) {
            $t = $q['type'];
            $byType[$t] = ($byType[$t] ?? 0) + 1;
        }

        return [
            'totalAssigned' => $totalAssigned,
            'bound' => $bound,
            'win' => $win,
            'lose' => $lose,
            'quoted' => $quoted,
            'lost' => $lost,
            'closed' => $closed,
            'contacted' => $contacted,
            'followUp' => $followUp,
            'newLeads' => $newLeads,
            'winRate' => $winRate,
            'byType' => (object) $byType,
        ];
    }

    if ($method === 'GET' && $path === '/api/admin/transactions') {
        $transactions = storage()->getAllTransactions();
        return $transactions;
    }

    if ($method === 'POST' && $path === '/api/admin/credits/adjust') {
        $input = json_decode(file_get_contents('php://input'), true);
        $userId = $input['userId'] ?? null;
        $amount = $input['amount'] ?? null;
        $reason = $input['reason'] ?? null;
        $actorId = $input['actorId'] ?? null;
        $actorName = $input['actorName'] ?? '';

        if (!$userId || !$amount || !$reason) {
            http_response_code(400);
            return ['error' => 'User ID, amount, and reason are required'];
        }
        if (!$actorId) {
            http_response_code(401);
            return ['error' => 'Actor ID is required for authentication'];
        }
        $actor = storage()->getUser($actorId);
        if (!$actor || ($actor['role'] !== 'admin' && $actor['role'] !== 'manager')) {
            http_response_code(403);
            return ['error' => 'Only admin/manager can adjust credits'];
        }
        if ($actor['role'] === 'manager') {
            if (!checkPermission($actorId, 'adjustBalances')) {
                http_response_code(403);
                return ['error' => "You don't have permission to adjust credit balances"];
            }
        }

        $numAmount = floatval($amount);
        if (!is_numeric($amount)) {
            http_response_code(400);
            return ['error' => 'Invalid amount'];
        }

        $type = $numAmount >= 0 ? 'manual_credit' : 'adjustment';
        $description = 'Manual ' . ($numAmount >= 0 ? 'credit' : 'debit') . ": $reason";
        $result = storage()->creditBalance(
            $userId,
            number_format(abs($numAmount), 2, '.', ''),
            $type,
            $description,
            ['actorId' => $actorId, 'actorName' => $actorName, 'reason' => $reason]
        );

        return [
            'success' => true,
            'newBalance' => $result['user']['balance'],
            'transaction' => $result['transaction'],
        ];
    }

    if ($method === 'GET' && $path === '/api/settings/lead-expiry-hours') {
        $hours = storage()->getSetting('lead_expiry_hours');
        return ['hours' => $hours ? floatval($hours) : 24];
    }

    if ($method === 'POST' && $path === '/api/settings/lead-expiry-hours') {
        $input = json_decode(file_get_contents('php://input'), true);
        $hours = $input['hours'] ?? null;
        $actorId = $input['actorId'] ?? null;

        if (!$actorId) {
            http_response_code(401);
            return ['error' => 'Actor ID is required'];
        }
        $actor = storage()->getUser($actorId);
        if (!$actor || ($actor['role'] !== 'admin' && $actor['role'] !== 'manager')) {
            http_response_code(403);
            return ['error' => 'Only admin/manager can update expiry timer'];
        }
        if (!is_numeric($hours) || $hours < 1 || $hours > 720) {
            http_response_code(400);
            return ['error' => 'Hours must be between 1 and 720 (30 days)'];
        }

        storage()->setSetting('lead_expiry_hours', strval($hours), $actorId);
        return ['success' => true, 'hours' => $hours];
    }

    if ($method === 'POST' && $path === '/api/leads/check-expiry') {
        $input = json_decode(file_get_contents('php://input'), true);
        $actorId = $input['actorId'] ?? null;
        if (!$actorId) {
            http_response_code(401);
            return ['error' => 'Actor ID is required'];
        }
        $actor = storage()->getUser($actorId);
        if (!$actor || ($actor['role'] !== 'admin' && $actor['role'] !== 'manager')) {
            http_response_code(403);
            return ['error' => 'Only admin/manager can check lead expiry'];
        }

        $expiryHoursSetting = storage()->getSetting('lead_expiry_hours');
        $expiryHours = $expiryHoursSetting ? floatval($expiryHoursSetting) : 24;
        $now = time();
        $allQuotes = storage()->getAllQuotes();

        $expiredLeads = [];
        foreach ($allQuotes as $quote) {
            if (
                !empty($quote['assigned_to']) &&
                !empty($quote['assigned_at']) &&
                $quote['status'] === 'New'
            ) {
                $assignedTime = strtotime($quote['assigned_at']);
                $expiryTime = $assignedTime + ($expiryHours * 3600);
                if ($now > $expiryTime) {
                    storage()->updateQuote($quote['id'], ['status' => 'Expired']);
                    storage()->createActivity([
                        'quote_id' => $quote['id'],
                        'type' => 'system',
                        'content' => "Lead expired - broker did not respond within $expiryHours hours",
                        'author' => 'System',
                    ]);
                    $expiredLeads[] = $quote['id'];
                }
            }
        }

        return ['success' => true, 'expiredCount' => count($expiredLeads), 'expiredLeads' => $expiredLeads];
    }

    if ($method === 'POST' && $path === '/api/admin/email-report') {
        $input = json_decode(file_get_contents('php://input'), true);
        $subject = $input['subject'] ?? '';
        $body = $input['body'] ?? '';
        $to = $input['to'] ?? '';
        $actorId = $input['actorId'] ?? null;

        if (!$actorId) {
            http_response_code(401);
            return ['error' => 'Actor ID is required for authentication'];
        }
        $actor = storage()->getUser($actorId);
        if (!$actor || ($actor['role'] !== 'admin' && $actor['role'] !== 'manager')) {
            http_response_code(403);
            return ['error' => 'Only admin/manager can send reports'];
        }
        if (!$subject || !$body || !$to) {
            http_response_code(400);
            return ['error' => 'Missing required fields: subject, body, to'];
        }

        $date = date('Y-m-d');
        $html = "<div style=\"font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;\">
            <div style=\"background: linear-gradient(135deg, #1e40af, #3b82f6); color: white; padding: 24px; border-radius: 12px 12px 0 0;\">
                <h1 style=\"margin: 0; font-size: 24px;\">QuoteUs.ca Report</h1>
                <p style=\"margin: 8px 0 0; opacity: 0.9;\">$subject</p>
            </div>
            <div style=\"background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;\">
                <pre style=\"white-space: pre-wrap; font-family: Arial, sans-serif; line-height: 1.6; color: #334155;\">$body</pre>
                <hr style=\"border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;\">
                <p style=\"color: #94a3b8; font-size: 12px; text-align: center;\">Generated by QuoteUs.ca on $date</p>
            </div>
        </div>";

        $sent = sendEmail($to, $subject, $html);
        if ($sent) {
            return ['success' => true];
        }
        http_response_code(500);
        return ['error' => 'Failed to send email. Check SMTP configuration.'];
    }

    if ($method === 'GET' && $path === '/api/settings/ads-per-slot') {
        $value = storage()->getSetting('ads_per_slot');
        $parsed = $value ? intval($value) : 1;
        $clamped = max(1, min(3, $parsed));
        return ['value' => $clamped];
    }

    if ($method === 'GET' && $path === '/api/settings/social-media') {
        $value = storage()->getSetting('social_media');
        if ($value) {
            return json_decode($value, true);
        }
        return [
            'facebook' => 'https://www.facebook.com/people/QuoteUsca/100064074608534/',
            'instagram' => 'https://www.instagram.com/quoteus.ca/',
            'twitter' => '',
            'linkedin' => '',
            'youtube' => '',
            'tiktok' => '',
        ];
    }

    if ($method === 'GET' && $path === '/api/settings/custom-css') {
        $value = storage()->getSetting('custom_css');
        return ['value' => $value ?: ''];
    }

    return null;
}
