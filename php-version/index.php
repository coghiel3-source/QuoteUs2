<?php

$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

if ($path !== '/' && $path !== '') {
    $filePath = __DIR__ . $path;
    if (file_exists($filePath) && is_file($filePath)) {
        return false;
    }
}

$indexHtml = __DIR__ . '/index.html';
if (file_exists($indexHtml)) {
    header('Content-Type: text/html; charset=UTF-8');
    readfile($indexHtml);
    exit;
}

http_response_code(503);
echo '<!DOCTYPE html><html><head><title>QuoteUs.ca</title></head><body>';
echo '<h1>QuoteUs.ca</h1>';
echo '<p>Application is being set up. Please build the frontend first.</p>';
echo '<p>Visit <a href="/install.php">install.php</a> to set up the database.</p>';
echo '</body></html>';
