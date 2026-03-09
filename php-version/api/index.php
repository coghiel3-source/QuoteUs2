<?php

require_once __DIR__ . '/../config.php';

header('Access-Control-Allow-Origin: ' . CORS_ORIGIN);
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path = rtrim($path, '/') ?: '/';
$body = json_decode(file_get_contents('php://input'), true) ?? [];

if (preg_match('#^/api/auth(/|$)#', $path)) {
    require_once __DIR__ . '/auth.php';
    $result = handleAuthRoutes($method, $path, $body);
    if ($result !== null) {
        echo json_encode($result);
        exit;
    }
}

if (preg_match('#^/api/users(/|$)#', $path) &&
    !preg_match('#^/api/users/[^/]+/(balance|transactions)$#', $path)) {
    require_once __DIR__ . '/auth.php';
    require_once __DIR__ . '/users.php';
    $result = handleUserRoutes($method, $path, $body);
    if ($result !== null) {
        echo json_encode($result);
        exit;
    }
}

if (preg_match('#^/api/users/[^/]+/(balance|transactions)$#', $path) ||
    (preg_match('#^/api/(credits|stripe)(/|$)#', $path) && $path !== '/api/credits/lead-costs') ||
    $path === '/api/leads/assign' ||
    $path === '/api/leads/reassign') {
    require_once __DIR__ . '/auth.php';
    require_once __DIR__ . '/credits.php';
    $result = handleCreditsRoutes($method, $path);
    if ($result !== null) {
        echo json_encode($result);
        exit;
    }
}

if (preg_match('#^/api/admin(/|$)#', $path) ||
    preg_match('#^/api/settings/(lead-expiry|ads-per-slot|social-media|custom-css)#', $path) ||
    $path === '/api/credits/lead-costs' ||
    $path === '/api/leads/check-expiry' ||
    $path === '/api/admin/email-report') {

    if (!preg_match('#^/api/admin/advertisements(/|$)#', $path) &&
        !preg_match('#^/api/admin/redirects(/|$)#', $path)) {
        require_once __DIR__ . '/auth.php';
        require_once __DIR__ . '/admin.php';
        $result = handleAdminRoutes($method, $path);
        if ($result !== null) {
            echo json_encode($result);
            exit;
        }
    }
}

if (preg_match('#^/api/(admin/advertisements|ads/|advertisements/)#', $path) ||
    preg_match('#^/api/settings/(ads-per-slot|social-media|custom-css)$#', $path)) {
    require_once __DIR__ . '/ads.php';
    $strippedPath = preg_replace('#^/api/#', '', $path);
    handleAdsRoutes($method, $strippedPath, $body);
}

if (preg_match('#^/api/(referral-partners|admin/redirects|redirects|contact)(/|$)#', $path)) {
    require_once __DIR__ . '/partners.php';
    $strippedPath = preg_replace('#^/api/#', '', $path);
    handlePartnersRoutes($method, $strippedPath, $body);
}

if (preg_match('#^/api/(quotes|activities)(/|$)#', $path) ||
    preg_match('#^/api/leads/[0-9a-f]{8}-#', $path)) {
    require __DIR__ . '/quotes.php';
    exit;
}

http_response_code(404);
echo json_encode(['error' => 'Not found', 'path' => $path, 'method' => $method]);
