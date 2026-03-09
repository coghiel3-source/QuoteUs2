<?php

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../storage.php';
require_once __DIR__ . '/../email.php';

$CREDIT_PACKAGES = [
    ['amount' => 25, 'label' => '$25'],
    ['amount' => 50, 'label' => '$50'],
    ['amount' => 100, 'label' => '$100'],
    ['amount' => 150, 'label' => '$150'],
    ['amount' => 200, 'label' => '$200'],
    ['amount' => 250, 'label' => '$250'],
];

if (!function_exists('safeUser')) {
    function safeUser($user) {
        if (!$user) return $user;
        unset($user['password'], $user['reset_token'], $user['reset_token_expiry']);
        return $user;
    }
}

function handleCreditsRoutes($method, $path) {
    global $CREDIT_PACKAGES;

    if ($method === 'GET' && $path === '/api/credits/packages') {
        return ['packages' => $CREDIT_PACKAGES];
    }

    if ($method === 'GET' && preg_match('#^/api/users/([^/]+)/balance$#', $path, $m)) {
        $userId = $m[1];
        $user = storage()->getUser($userId);
        if (!$user) {
            http_response_code(404);
            return ['error' => 'User not found'];
        }
        return ['balance' => $user['balance']];
    }

    if ($method === 'GET' && preg_match('#^/api/users/([^/]+)/transactions$#', $path, $m)) {
        $userId = $m[1];
        $transactions = storage()->getTransactionsForUser($userId);
        return $transactions;
    }

    if ($method === 'POST' && $path === '/api/credits/checkout') {
        $input = json_decode(file_get_contents('php://input'), true);
        $userId = $input['userId'] ?? null;
        $amount = $input['amount'] ?? null;

        if (!$userId || !$amount) {
            http_response_code(400);
            return ['error' => 'User ID and amount are required'];
        }

        $validAmounts = array_map(fn($p) => $p['amount'], $CREDIT_PACKAGES);
        if (!in_array(intval($amount), $validAmounts)) {
            http_response_code(400);
            return ['error' => 'Invalid credit amount. Valid amounts: ' . implode(', ', $validAmounts)];
        }

        $user = storage()->getUser($userId);
        if (!$user) {
            http_response_code(404);
            return ['error' => 'User not found'];
        }
        if ($user['role'] !== 'broker') {
            http_response_code(403);
            return ['error' => 'Only brokers can purchase credits'];
        }

        $stripeSecretKey = getenv('STRIPE_SECRET_KEY');
        if (!$stripeSecretKey) {
            http_response_code(500);
            return ['error' => 'Stripe is not configured'];
        }

        $baseUrl = rtrim(APP_URL, '/');

        $sessionData = [
            'payment_method_types' => ['card'],
            'line_items' => [[
                'price_data' => [
                    'currency' => 'cad',
                    'product_data' => [
                        'name' => "Lead Credits - \$$amount",
                        'description' => "Purchase \$$amount in lead credits for QuoteUs.ca",
                    ],
                    'unit_amount' => intval($amount) * 100,
                ],
                'quantity' => 1,
            ]],
            'mode' => 'payment',
            'success_url' => "$baseUrl/broker/credits?success=true&amount=$amount",
            'cancel_url' => "$baseUrl/broker/credits?canceled=true",
            'metadata' => [
                'userId' => $userId,
                'creditAmount' => strval($amount),
                'type' => 'credit_purchase',
            ],
        ];

        $ch = curl_init('https://api.stripe.com/v1/checkout/sessions');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_USERPWD, "$stripeSecretKey:");
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query(flattenForStripe($sessionData)));
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $session = json_decode($response, true);
        if ($httpCode !== 200 || empty($session['url'])) {
            http_response_code(500);
            return ['error' => $session['error']['message'] ?? 'Failed to create checkout session'];
        }

        return ['url' => $session['url'], 'sessionId' => $session['id']];
    }

    if ($method === 'POST' && $path === '/api/credits/confirm') {
        $input = json_decode(file_get_contents('php://input'), true);
        $sessionId = $input['sessionId'] ?? null;
        $userId = $input['userId'] ?? null;

        if (!$sessionId || !$userId) {
            http_response_code(400);
            return ['error' => 'Session ID and user ID required'];
        }

        $stripeSecretKey = getenv('STRIPE_SECRET_KEY');
        if (!$stripeSecretKey) {
            http_response_code(500);
            return ['error' => 'Stripe is not configured'];
        }

        $ch = curl_init("https://api.stripe.com/v1/checkout/sessions/$sessionId");
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_USERPWD, "$stripeSecretKey:");
        $response = curl_exec($ch);
        curl_close($ch);

        $session = json_decode($response, true);
        if (($session['payment_status'] ?? '') !== 'paid') {
            http_response_code(400);
            return ['error' => 'Payment not completed'];
        }

        $metadata = $session['metadata'] ?? [];
        if (empty($metadata['userId']) || $metadata['userId'] !== $userId) {
            http_response_code(400);
            return ['error' => 'Invalid session'];
        }

        $amount = $metadata['creditAmount'] ?? '0';
        $result = storage()->creditBalance(
            $userId,
            $amount,
            'credit_purchase',
            "Purchased \$$amount in credits via Stripe",
            ['stripe_payment_id' => $session['payment_intent'] ?? '']
        );

        return [
            'success' => true,
            'newBalance' => $result['user']['balance'],
            'transaction' => $result['transaction'],
        ];
    }

    if ($method === 'GET' && $path === '/api/stripe/publishable-key') {
        $key = getenv('STRIPE_PUBLISHABLE_KEY') ?: '';
        return ['publishableKey' => $key];
    }

    if ($method === 'POST' && $path === '/api/leads/assign') {
        return handleLeadAssign();
    }

    if ($method === 'POST' && $path === '/api/leads/reassign') {
        return handleLeadReassign();
    }

    return null;
}

function handleLeadAssign() {
    require_once __DIR__ . '/admin.php';

    $input = json_decode(file_get_contents('php://input'), true);
    $quoteId = $input['quoteId'] ?? null;
    $brokerId = $input['brokerId'] ?? null;
    $actorId = $input['actorId'] ?? null;
    $actorName = $input['actorName'] ?? '';

    if (!$quoteId || !$brokerId) {
        http_response_code(400);
        return ['error' => 'Quote ID and broker ID are required'];
    }
    if (!$actorId) {
        http_response_code(401);
        return ['error' => 'Actor ID is required for authentication'];
    }

    $actor = storage()->getUser($actorId);
    if (!$actor || ($actor['role'] !== 'admin' && $actor['role'] !== 'manager')) {
        http_response_code(403);
        return ['error' => 'Only admin/manager can assign leads'];
    }
    if ($actor['role'] === 'manager') {
        if (!checkPermission($actorId, 'assignLeads')) {
            http_response_code(403);
            return ['error' => "You don't have permission to assign leads"];
        }
    }

    $quote = storage()->getQuote($quoteId);
    if (!$quote) {
        http_response_code(404);
        return ['error' => 'Quote not found'];
    }

    if (($quote['assigned_to'] ?? '') === $brokerId) {
        $brokerUser = storage()->getUser($brokerId);
        return [
            'success' => true,
            'message' => 'Lead already assigned to this broker',
            'newBalance' => $brokerUser['balance'] ?? '0.00',
            'leadCost' => 0,
            'alreadyAssigned' => true,
        ];
    }

    $currentLeadCosts = getLeadCosts();
    $validTypes = array_keys($currentLeadCosts);
    if (!in_array($quote['type'], $validTypes)) {
        http_response_code(400);
        return ['error' => 'Invalid lead type'];
    }

    $broker = storage()->getUser($brokerId);
    if (!$broker) {
        http_response_code(404);
        return ['error' => 'Broker not found'];
    }
    if ($broker['role'] !== 'broker') {
        http_response_code(400);
        return ['error' => 'Can only assign leads to brokers'];
    }
    if ($broker['status'] === 'paused') {
        http_response_code(400);
        return ['error' => 'Cannot assign leads to paused brokers'];
    }

    $now = time();
    if (!empty($broker['pause_start_date']) && !empty($broker['pause_end_date'])) {
        $startDate = strtotime($broker['pause_start_date']);
        $endDate = strtotime($broker['pause_end_date']);
        if ($now >= $startDate && $now <= $endDate) {
            http_response_code(400);
            return ['error' => 'Cannot assign leads to brokers during their pause period'];
        }
    } elseif (!empty($broker['pause_start_date']) && empty($broker['pause_end_date'])) {
        $startDate = strtotime($broker['pause_start_date']);
        if ($now >= $startDate) {
            http_response_code(400);
            return ['error' => 'Cannot assign leads to paused brokers'];
        }
    }

    $defaultCost = $currentLeadCosts[$quote['type']] ?? $currentLeadCosts['General'] ?? 8;
    $leadCost = ($broker['lead_cost_override'] !== null && $broker['lead_cost_override'] !== '')
        ? floatval($broker['lead_cost_override'])
        : $defaultCost;

    $debitResult = storage()->debitBalance(
        $brokerId,
        number_format($leadCost, 2, '.', ''),
        "Lead assigned: {$quote['type']} - {$quote['client_name']} ({$quote['quote_number']})",
        ['quote_id' => $quoteId, 'actor_id' => $actorId, 'actor_name' => $actorName]
    );

    if (!$debitResult) {
        http_response_code(400);
        return [
            'error' => 'Insufficient balance',
            'required' => $leadCost,
            'currentBalance' => $broker['balance'],
        ];
    }

    $updatedQuote = storage()->updateQuote($quoteId, [
        'assigned_to' => $brokerId,
        'assigned_at' => Database::now(),
    ]);

    storage()->createActivity([
        'quote_id' => $quoteId,
        'type' => 'assignment',
        'content' => "Lead assigned to {$broker['name']} (\${$leadCost} deducted)",
        'author' => $actorName ?: 'System',
    ]);

    if (!empty($broker['email'])) {
        $assignmentEmail = generateAssignmentEmail([
            'brokerName' => $broker['name'],
            'clientName' => $quote['client_name'],
            'type' => $quote['type'],
            'email' => $quote['email'] ?? '',
            'phone' => $quote['phone'] ?? null,
            'assignedBy' => $actorName ?: 'Admin',
        ]);
        sendEmail($broker['email'], $assignmentEmail['subject'], $assignmentEmail['html']);
    }

    return [
        'success' => true,
        'newBalance' => $debitResult['user']['balance'],
        'transaction' => $debitResult['transaction'],
        'leadCost' => $leadCost,
        'quote' => $updatedQuote,
    ];
}

function handleLeadReassign() {
    require_once __DIR__ . '/admin.php';

    $input = json_decode(file_get_contents('php://input'), true);
    $quoteId = $input['quoteId'] ?? null;
    $brokerId = $input['brokerId'] ?? null;
    $actorId = $input['actorId'] ?? null;
    $actorName = $input['actorName'] ?? '';

    if (!$quoteId || !$brokerId) {
        http_response_code(400);
        return ['error' => 'Quote ID and broker ID are required'];
    }
    if (!$actorId) {
        http_response_code(401);
        return ['error' => 'Actor ID is required'];
    }

    $actor = storage()->getUser($actorId);
    if (!$actor || ($actor['role'] !== 'admin' && $actor['role'] !== 'manager')) {
        http_response_code(403);
        return ['error' => 'Only admin/manager can reassign leads'];
    }
    if ($actor['role'] === 'manager') {
        if (!checkPermission($actorId, 'assignLeads')) {
            http_response_code(403);
            return ['error' => "You don't have permission to reassign leads"];
        }
    }

    $quote = storage()->getQuote($quoteId);
    if (!$quote) {
        http_response_code(404);
        return ['error' => 'Quote not found'];
    }

    $broker = storage()->getUser($brokerId);
    if (!$broker || $broker['role'] !== 'broker') {
        http_response_code(400);
        return ['error' => 'Invalid broker'];
    }
    if ($broker['status'] === 'paused') {
        http_response_code(400);
        return ['error' => 'Cannot reassign to paused brokers'];
    }

    $currentLeadCosts = getLeadCosts();
    $defaultCost = $currentLeadCosts[$quote['type']] ?? $currentLeadCosts['General'] ?? 8;
    $leadCost = ($broker['lead_cost_override'] !== null && $broker['lead_cost_override'] !== '')
        ? floatval($broker['lead_cost_override'])
        : $defaultCost;

    $debitResult = storage()->debitBalance(
        $brokerId,
        number_format($leadCost, 2, '.', ''),
        "Lead reassigned: {$quote['type']} - {$quote['client_name']} ({$quote['quote_number']})",
        ['quote_id' => $quoteId, 'actor_id' => $actorId, 'actor_name' => $actorName]
    );

    if (!$debitResult) {
        http_response_code(400);
        return [
            'error' => 'Insufficient balance',
            'required' => $leadCost,
            'currentBalance' => $broker['balance'],
        ];
    }

    storage()->updateQuote($quoteId, [
        'assigned_to' => $brokerId,
        'assigned_at' => Database::now(),
        'status' => 'New',
    ]);

    storage()->createActivity([
        'quote_id' => $quoteId,
        'type' => 'assignment',
        'content' => "Lead reassigned to {$broker['name']} (\${$leadCost} deducted) by " . ($actorName ?: 'Admin'),
        'author' => $actorName ?: 'System',
    ]);

    if (!empty($broker['email'])) {
        $assignmentEmail = generateAssignmentEmail([
            'brokerName' => $broker['name'],
            'clientName' => $quote['client_name'],
            'type' => $quote['type'],
            'email' => $quote['email'] ?? '',
            'phone' => $quote['phone'] ?? null,
            'assignedBy' => $actorName ?: 'Admin',
        ]);
        sendEmail($broker['email'], $assignmentEmail['subject'], $assignmentEmail['html']);
    }

    return [
        'success' => true,
        'newBalance' => $debitResult['user']['balance'],
        'transaction' => $debitResult['transaction'],
        'leadCost' => $leadCost,
    ];
}

function flattenForStripe($data, $prefix = '') {
    $result = [];
    foreach ($data as $key => $value) {
        $fullKey = $prefix ? "{$prefix}[{$key}]" : $key;
        if (is_array($value)) {
            $result = array_merge($result, flattenForStripe($value, $fullKey));
        } else {
            $result[$fullKey] = $value;
        }
    }
    return $result;
}
