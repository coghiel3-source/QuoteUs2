<?php

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../database.php';
require_once __DIR__ . '/../storage.php';
require_once __DIR__ . '/../email.php';

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$uri = $_SERVER['REQUEST_URI'];
$path = parse_url($uri, PHP_URL_PATH);
$path = preg_replace('#^/api#', '', $path);

$input = json_decode(file_get_contents('php://input'), true) ?? [];

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

function getLeadCosts(): array {
    global $DEFAULT_LEAD_COSTS;
    $stored = storage()->getSetting('lead_costs');
    if ($stored) {
        $parsed = json_decode($stored, true);
        if (is_array($parsed)) return $parsed;
    }
    return $DEFAULT_LEAD_COSTS;
}

function checkPermission(string $userId, string $permission): bool {
    $user = storage()->getUser($userId);
    if (!$user) return false;
    if ($user['role'] === 'admin') return true;
    if ($user['role'] === 'manager') {
        $perms = $user['permissions'] ?? null;
        if (is_string($perms)) $perms = json_decode($perms, true);
        if (is_array($perms) && isset($perms[$permission])) {
            return (bool)$perms[$permission];
        }
        $globalPerms = storage()->getSetting('manager_permissions');
        if ($globalPerms) {
            $gp = json_decode($globalPerms, true);
            if (is_array($gp)) return !empty($gp[$permission]);
        }
        return false;
    }
    return false;
}

function jsonResponse($data, int $status = 200) {
    http_response_code($status);
    echo json_encode($data);
    exit;
}

function convertKeysToSnakeCase(array $data): array {
    $result = [];
    foreach ($data as $key => $value) {
        $snakeKey = strtolower(preg_replace('/[A-Z]/', '_$0', $key));
        $result[$snakeKey] = $value;
    }
    return $result;
}

// POST /quotes
if ($method === 'POST' && preg_match('#^/quotes$#', $path)) {
    try {
        $quoteData = convertKeysToSnakeCase($input);

        if (empty($quoteData['client_name']) || empty($quoteData['type'])) {
            jsonResponse(['error' => 'Client name and type are required'], 400);
        }

        $quote = storage()->createQuote($quoteData);

        storage()->createActivity([
            'quote_id' => $quote['id'],
            'type' => 'system',
            'content' => 'Lead created via ' . ($quote['source'] ?? 'Web Form'),
            'author' => 'System',
        ]);

        $finalQuote = $quote;
        $refId = $quote['reference_id'] ?? null;
        if ($refId) {
            $allUsers = storage()->getAllUsers();
            $matchingBroker = null;
            foreach ($allUsers as $u) {
                if ($u['role'] === 'broker' && $u['status'] === 'active' && !empty($u['reference_id'])
                    && strtoupper($u['reference_id']) === strtoupper($refId)) {
                    $matchingBroker = $u;
                    break;
                }
            }
            if ($matchingBroker) {
                $updated = storage()->updateQuote($quote['id'], [
                    'assigned_to' => $matchingBroker['id'],
                    'assigned_at' => Database::now(),
                ]);
                if ($updated) $finalQuote = $updated;
                storage()->createActivity([
                    'quote_id' => $quote['id'],
                    'type' => 'assignment',
                    'content' => 'Lead auto-assigned to ' . $matchingBroker['name'] . ' via Reference ID ' . $refId,
                    'author' => 'System',
                ]);
            } else {
                $matchingPartner = storage()->getReferralPartnerByReferenceId($refId);
                if ($matchingPartner && ($matchingPartner['status'] ?? '') === 'active') {
                    storage()->createActivity([
                        'quote_id' => $quote['id'],
                        'type' => 'system',
                        'content' => 'Lead linked to referral partner ' . $matchingPartner['contact_name'] . ' via Reference ID ' . $matchingPartner['reference_id'],
                        'author' => 'System',
                    ]);
                }
            }
        }

        $adminEmail = generateNewLeadEmail([
            'clientName' => $quote['client_name'],
            'type' => $quote['type'],
            'email' => $quote['email'] ?? '',
            'phone' => $quote['phone'] ?? null,
            'source' => $quote['source'] ?? 'Website',
        ]);

        $notificationEmail = storage()->getSetting('notification_email') ?: 'info@quoteus.ca';
        sendEmail($notificationEmail, $adminEmail['subject'], $adminEmail['html']);

        if (!empty($quote['email'])) {
            $thankYou = generateThankYouEmail([
                'clientName' => $quote['client_name'],
                'type' => $quote['type'],
            ]);
            sendEmail($quote['email'], $thankYou['subject'], $thankYou['html']);
        }

        jsonResponse($finalQuote, 201);
    } catch (Exception $e) {
        jsonResponse(['error' => $e->getMessage()], 500);
    }
}

// GET /quotes
if ($method === 'GET' && preg_match('#^/quotes$#', $path)) {
    try {
        $quotes = storage()->getAllQuotes();
        jsonResponse($quotes);
    } catch (Exception $e) {
        jsonResponse(['error' => $e->getMessage()], 500);
    }
}

// GET /quotes/:id
if ($method === 'GET' && preg_match('#^/quotes/([a-f0-9\-]+)$#', $path, $m)) {
    try {
        $quote = storage()->getQuote($m[1]);
        if (!$quote) jsonResponse(['error' => 'Quote not found'], 404);
        jsonResponse($quote);
    } catch (Exception $e) {
        jsonResponse(['error' => $e->getMessage()], 500);
    }
}

// PATCH /quotes/:id
if ($method === 'PATCH' && preg_match('#^/quotes/([a-f0-9\-]+)$#', $path, $m)) {
    try {
        $id = $m[1];
        $existingQuote = storage()->getQuote($id);
        if (!$existingQuote) jsonResponse(['error' => 'Quote not found'], 404);

        $updateData = convertKeysToSnakeCase($input);
        $quote = storage()->updateQuote($id, $updateData);
        if (!$quote) jsonResponse(['error' => 'Quote not found'], 404);

        if (!empty($updateData['assigned_to']) && $updateData['assigned_to'] !== $existingQuote['assigned_to']) {
            $broker = storage()->getUser($updateData['assigned_to']);
            if ($broker && !empty($broker['email'])) {
                $assignEmail = generateAssignmentEmail([
                    'brokerName' => $broker['name'],
                    'clientName' => $quote['client_name'],
                    'type' => $quote['type'],
                    'email' => $quote['email'] ?? '',
                    'phone' => $quote['phone'] ?? null,
                    'assignedBy' => $input['assignedBy'] ?? $input['assigned_by'] ?? 'Admin',
                ]);
                sendEmail($broker['email'], $assignEmail['subject'], $assignEmail['html']);
            }
        }

        if (!empty($updateData['status']) && $updateData['status'] !== $existingQuote['status']) {
            if (!empty($quote['assigned_to'])) {
                $broker = storage()->getUser($quote['assigned_to']);
                if ($broker && !empty($broker['email'])) {
                    $statusEmail = generateStatusChangeEmail([
                        'clientName' => $quote['client_name'],
                        'type' => $quote['type'],
                        'oldStatus' => $existingQuote['status'],
                        'newStatus' => $updateData['status'],
                        'changedBy' => $input['changedBy'] ?? $input['changed_by'] ?? 'Admin',
                    ]);
                    sendEmail($broker['email'], $statusEmail['subject'], $statusEmail['html']);
                }
            }
        }

        jsonResponse($quote);
    } catch (Exception $e) {
        jsonResponse(['error' => $e->getMessage()], 500);
    }
}

// DELETE /quotes/:id
if ($method === 'DELETE' && preg_match('#^/quotes/([a-f0-9\-]+)$#', $path, $m)) {
    try {
        $success = storage()->deleteQuote($m[1]);
        if (!$success) jsonResponse(['error' => 'Quote not found'], 404);
        http_response_code(204);
        exit;
    } catch (Exception $e) {
        jsonResponse(['error' => $e->getMessage()], 500);
    }
}

// GET /quotes/:id/activities
if ($method === 'GET' && preg_match('#^/quotes/([a-f0-9\-]+)/activities$#', $path, $m)) {
    try {
        $activities = storage()->getActivitiesForQuote($m[1]);
        jsonResponse($activities);
    } catch (Exception $e) {
        jsonResponse(['error' => $e->getMessage()], 500);
    }
}

// POST /activities
if ($method === 'POST' && preg_match('#^/activities$#', $path)) {
    try {
        $actData = convertKeysToSnakeCase($input);
        if (empty($actData['quote_id']) || empty($actData['type']) || empty($actData['content'])) {
            jsonResponse(['error' => 'Validation error: quoteId, type, and content are required'], 400);
        }
        $activity = storage()->createActivity($actData);
        jsonResponse($activity, 201);
    } catch (Exception $e) {
        jsonResponse(['error' => $e->getMessage()], 500);
    }
}

// POST /leads/:id/send-to-broker
if ($method === 'POST' && preg_match('#^/leads/([a-f0-9\-]+)/send-to-broker$#', $path, $m)) {
    try {
        $id = $m[1];
        $quote = storage()->getQuote($id);
        if (!$quote) jsonResponse(['error' => 'Lead not found'], 404);
        if (empty($quote['assigned_to'])) jsonResponse(['error' => 'Lead is not assigned to a broker'], 400);

        $broker = storage()->getUser($quote['assigned_to']);
        if (!$broker) jsonResponse(['error' => 'Assigned broker not found'], 404);
        if (empty($broker['email'])) jsonResponse(['error' => 'Broker does not have an email address'], 400);

        $leadDetails = $quote['details'] ?? [];
        if (is_string($leadDetails)) $leadDetails = json_decode($leadDetails, true) ?: [];

        $detailsHtml = '';
        if (!empty($leadDetails)) {
            $detailsHtml = '
              <h3 style="color: #1f2937; margin-top: 30px;">Additional Details</h3>
              <div style="background-color: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <pre style="white-space: pre-wrap; word-wrap: break-word; font-family: monospace; font-size: 12px; color: #4b5563; margin: 0;">' . htmlspecialchars(json_encode($leadDetails, JSON_PRETTY_PRINT)) . '</pre>
              </div>';
        }

        $emailHtml = '
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #16a34a; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">QuoteUs.ca</h1>
          </div>
          <div style="padding: 30px; background-color: #f9fafb;">
            <h2 style="color: #1f2937; margin-top: 0;">Lead Details - ' . htmlspecialchars($quote['type']) . ' Insurance</h2>
            <p style="color: #4b5563;">You have been assigned a new lead. Here are the complete details:</p>
            <div style="background-color: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 10px 0; color: #6b7280; border-bottom: 1px solid #e5e7eb; width: 140px;"><strong>Client Name:</strong></td><td style="padding: 10px 0; color: #1f2937; border-bottom: 1px solid #e5e7eb;">' . htmlspecialchars($quote['client_name']) . '</td></tr>
                <tr><td style="padding: 10px 0; color: #6b7280; border-bottom: 1px solid #e5e7eb;"><strong>Insurance Type:</strong></td><td style="padding: 10px 0; color: #1f2937; border-bottom: 1px solid #e5e7eb;">' . htmlspecialchars($quote['type']) . '</td></tr>
                <tr><td style="padding: 10px 0; color: #6b7280; border-bottom: 1px solid #e5e7eb;"><strong>Email:</strong></td><td style="padding: 10px 0; color: #1f2937; border-bottom: 1px solid #e5e7eb;">' . htmlspecialchars($quote['email'] ?? 'Not provided') . '</td></tr>
                <tr><td style="padding: 10px 0; color: #6b7280; border-bottom: 1px solid #e5e7eb;"><strong>Phone:</strong></td><td style="padding: 10px 0; color: #1f2937; border-bottom: 1px solid #e5e7eb;">' . htmlspecialchars($quote['phone'] ?? 'Not provided') . '</td></tr>
                <tr><td style="padding: 10px 0; color: #6b7280; border-bottom: 1px solid #e5e7eb;"><strong>Postal Code:</strong></td><td style="padding: 10px 0; color: #1f2937; border-bottom: 1px solid #e5e7eb;">' . htmlspecialchars($quote['postal_code'] ?? 'Not provided') . '</td></tr>
                <tr><td style="padding: 10px 0; color: #6b7280; border-bottom: 1px solid #e5e7eb;"><strong>Status:</strong></td><td style="padding: 10px 0; color: #1f2937; border-bottom: 1px solid #e5e7eb;">' . htmlspecialchars($quote['status']) . '</td></tr>
                <tr><td style="padding: 10px 0; color: #6b7280; border-bottom: 1px solid #e5e7eb;"><strong>Priority:</strong></td><td style="padding: 10px 0; color: #1f2937; border-bottom: 1px solid #e5e7eb;">' . htmlspecialchars($quote['priority'] ?? 'Medium') . '</td></tr>
                <tr><td style="padding: 10px 0; color: #6b7280;"><strong>Source:</strong></td><td style="padding: 10px 0; color: #1f2937;">' . htmlspecialchars($quote['source'] ?? 'Website') . '</td></tr>
              </table>
            </div>
            ' . $detailsHtml . '
            <p style="color: #4b5563; font-size: 14px; margin-top: 20px;">Please contact the client at your earliest convenience.</p>
            <p style="color: #4b5563; font-size: 14px; margin-top: 20px;">Best regards,<br><strong>QuoteUs.ca Management</strong></p>
          </div>
          <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
            <p>QuoteUs.ca - Your Trusted Ontario Insurance Partner</p>
          </div>
        </div>';

        sendEmail($broker['email'], 'Lead Assignment: ' . $quote['client_name'] . ' - ' . $quote['type'] . ' Insurance', $emailHtml);

        storage()->createActivity([
            'quote_id' => $quote['id'],
            'type' => 'email_sent',
            'content' => 'Lead details emailed to broker ' . $broker['name'],
            'author' => 'System',
        ]);

        jsonResponse(['success' => true, 'message' => 'Email sent to broker']);
    } catch (Exception $e) {
        jsonResponse(['error' => $e->getMessage()], 500);
    }
}

// POST /leads/:id/request-binder
if ($method === 'POST' && preg_match('#^/leads/([a-f0-9\-]+)/request-binder$#', $path, $m)) {
    try {
        $actorId = $input['actorId'] ?? null;
        if (!$actorId) jsonResponse(['error' => 'Unauthorized'], 401);
        $actor = storage()->getUser($actorId);
        if (!$actor || !in_array($actor['role'], ['admin', 'manager'])) {
            jsonResponse(['error' => 'Only admin/manager can request binders'], 403);
        }
        $quote = storage()->getQuote($m[1]);
        if (!$quote) jsonResponse(['error' => 'Lead not found'], 404);

        storage()->updateQuote($m[1], ['binder_required' => 1]);
        storage()->createActivity([
            'quote_id' => $m[1],
            'type' => 'system',
            'content' => 'Binder/confirmation of insurance requested before closing',
            'author' => $actor['name'],
        ]);

        jsonResponse(['success' => true]);
    } catch (Exception $e) {
        jsonResponse(['error' => $e->getMessage()], 500);
    }
}

// POST /leads/:id/remove-binder-request
if ($method === 'POST' && preg_match('#^/leads/([a-f0-9\-]+)/remove-binder-request$#', $path, $m)) {
    try {
        $actorId = $input['actorId'] ?? null;
        if (!$actorId) jsonResponse(['error' => 'Unauthorized'], 401);
        $actor = storage()->getUser($actorId);
        if (!$actor || !in_array($actor['role'], ['admin', 'manager'])) {
            jsonResponse(['error' => 'Only admin/manager can remove binder requests'], 403);
        }

        storage()->updateQuote($m[1], ['binder_required' => 0]);
        storage()->createActivity([
            'quote_id' => $m[1],
            'type' => 'system',
            'content' => 'Binder requirement removed',
            'author' => $actor['name'],
        ]);

        jsonResponse(['success' => true]);
    } catch (Exception $e) {
        jsonResponse(['error' => $e->getMessage()], 500);
    }
}

// POST /leads/:id/upload-binder
if ($method === 'POST' && preg_match('#^/leads/([a-f0-9\-]+)/upload-binder$#', $path, $m)) {
    try {
        if (empty($_FILES['binder'])) jsonResponse(['error' => 'No file uploaded'], 400);
        $actorId = $_POST['actorId'] ?? null;
        if (!$actorId) jsonResponse(['error' => 'Unauthorized'], 401);

        $quote = storage()->getQuote($m[1]);
        if (!$quote) jsonResponse(['error' => 'Lead not found'], 404);

        $file = $_FILES['binder'];
        $allowedExts = ['jpeg', 'jpg', 'png', 'gif', 'pdf', 'doc', 'docx'];
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if (!in_array($ext, $allowedExts)) {
            jsonResponse(['error' => 'Only PDF, Word documents, and image files are allowed'], 400);
        }

        $binderDir = UPLOAD_DIR . '/binders';
        if (!is_dir($binderDir)) mkdir($binderDir, 0755, true);

        $uniqueSuffix = time() . '-' . rand(100000000, 999999999);
        $filename = "binder-{$uniqueSuffix}.{$ext}";
        $destPath = $binderDir . '/' . $filename;

        if (!move_uploaded_file($file['tmp_name'], $destPath)) {
            jsonResponse(['error' => 'Failed to save uploaded file'], 500);
        }

        $binderUrl = '/uploads/binders/' . $filename;
        $binderUploadedAt = Database::now();
        $actor = storage()->getUser($actorId);

        $existingDocs = $quote['binder_documents'] ?? [];
        if (is_string($existingDocs)) $existingDocs = json_decode($existingDocs, true) ?: [];

        $newDoc = [
            'url' => $binderUrl,
            'filename' => $file['name'],
            'uploadedAt' => $binderUploadedAt,
            'uploadedBy' => $actor['name'] ?? 'Broker',
        ];
        $updatedDocs = array_merge($existingDocs, [$newDoc]);

        storage()->updateQuote($m[1], [
            'binder_url' => $binderUrl,
            'binder_uploaded_at' => $binderUploadedAt,
            'binder_documents' => $updatedDocs,
        ]);

        storage()->createActivity([
            'quote_id' => $m[1],
            'type' => 'system',
            'content' => 'Binder/confirmation of insurance uploaded: ' . $file['name'],
            'author' => $actor['name'] ?? 'Broker',
        ]);

        jsonResponse([
            'success' => true,
            'binderUrl' => $binderUrl,
            'binderUploadedAt' => $binderUploadedAt,
            'binderDocuments' => $updatedDocs,
        ]);
    } catch (Exception $e) {
        jsonResponse(['error' => $e->getMessage()], 500);
    }
}

// POST /leads/:id/email-binder
if ($method === 'POST' && preg_match('#^/leads/([a-f0-9\-]+)/email-binder$#', $path, $m)) {
    try {
        $actorId = $input['actorId'] ?? null;
        $to = $input['to'] ?? null;
        $binderUrl = $input['binderUrl'] ?? null;
        $binderFilename = $input['binderFilename'] ?? 'Binder Document';

        if (!$actorId) jsonResponse(['error' => 'Unauthorized'], 401);
        if (!$to || !$binderUrl) jsonResponse(['error' => 'Missing required fields (to, binderUrl)'], 400);
        if (!filter_var($to, FILTER_VALIDATE_EMAIL)) jsonResponse(['error' => 'Invalid email address'], 400);

        $actor = storage()->getUser($actorId);
        if (!$actor) jsonResponse(['error' => 'User not found'], 403);
        if (!in_array($actor['role'], ['admin', 'manager', 'broker'])) {
            jsonResponse(['error' => 'Insufficient permissions'], 403);
        }

        $quote = storage()->getQuote($m[1]);
        if (!$quote) jsonResponse(['error' => 'Lead not found'], 404);

        if ($actor['role'] === 'broker' && ($quote['assigned_to'] ?? '') !== $actor['id']) {
            jsonResponse(['error' => 'Not authorized for this lead'], 403);
        }

        $docs = $quote['binder_documents'] ?? [];
        if (is_string($docs)) $docs = json_decode($docs, true) ?: [];
        $legacyUrl = $quote['binder_url'] ?? null;
        $validUrls = array_map(function($d) { return $d['url'] ?? ''; }, $docs);
        if ($legacyUrl) $validUrls[] = $legacyUrl;
        if (!in_array($binderUrl, $validUrls)) {
            jsonResponse(['error' => 'Invalid binder document URL'], 400);
        }

        $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
        $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
        $fullUrl = $protocol . '://' . $host . $binderUrl;

        $safeClientName = htmlspecialchars($quote['client_name'] ?? '');
        $safeFilename = htmlspecialchars($binderFilename);
        $safeType = htmlspecialchars($quote['type'] ?? '');
        $safeActorName = htmlspecialchars($actor['name'] ?? '');

        $emailHtml = '
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #16a34a; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">QuoteUs.ca</h1>
          </div>
          <div style="padding: 30px; background-color: #f9fafb;">
            <h2 style="color: #1f2937;">Binder / Confirmation of Insurance</h2>
            <p style="color: #4b5563;">Please find the attached binder document for <strong>' . $safeClientName . '</strong>.</p>
            <p style="color: #4b5563;"><strong>Document:</strong> ' . $safeFilename . '</p>
            <p style="color: #4b5563;"><strong>Insurance Type:</strong> ' . $safeType . '</p>
            <div style="margin: 20px 0;">
              <a href="' . $fullUrl . '" style="background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View / Download Binder</a>
            </div>
            <p style="color: #4b5563; font-size: 14px; margin-top: 30px;">
              Best regards,<br>
              <strong>' . $safeActorName . '</strong><br>
              QuoteUs.ca
            </p>
          </div>
          <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
            <p>QuoteUs.ca - Your Trusted Insurance Partner</p>
          </div>
        </div>';

        $sent = sendEmail($to, 'Binder - ' . ($quote['client_name'] ?? '') . ' (' . ($quote['type'] ?? '') . ' Insurance)', $emailHtml);

        storage()->createActivity([
            'quote_id' => $m[1],
            'type' => 'email_sent',
            'content' => ($sent ? 'Binder emailed to ' : 'Binder email logged (SMTP not configured) to ') . $to . ': ' . $binderFilename,
            'author' => $actor['name'],
        ]);

        jsonResponse(['success' => true, 'delivered' => (bool)$sent]);
    } catch (Exception $e) {
        jsonResponse(['error' => $e->getMessage()], 500);
    }
}

// POST /leads/:id/send-email
if ($method === 'POST' && preg_match('#^/leads/([a-f0-9\-]+)/send-email$#', $path, $m)) {
    try {
        $actorId = $input['actorId'] ?? null;
        $to = $input['to'] ?? null;
        $subject = $input['subject'] ?? null;
        $emailBodyText = $input['body'] ?? null;

        if (!$actorId) jsonResponse(['error' => 'Unauthorized'], 401);
        if (!$to || !$subject || !$emailBodyText) {
            jsonResponse(['error' => 'Missing required fields (to, subject, body)'], 400);
        }

        $actor = storage()->getUser($actorId);
        if (!$actor) jsonResponse(['error' => 'User not found'], 403);

        $quote = storage()->getQuote($m[1]);
        if (!$quote) jsonResponse(['error' => 'Lead not found'], 404);

        $emailHtml = '
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #16a34a; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">QuoteUs.ca</h1>
          </div>
          <div style="padding: 30px; background-color: #f9fafb;">
            <p style="color: #4b5563; white-space: pre-wrap;">' . htmlspecialchars($emailBodyText) . '</p>
            <p style="color: #4b5563; font-size: 14px; margin-top: 30px;">
              Best regards,<br>
              <strong>' . htmlspecialchars($actor['name']) . '</strong><br>
              QuoteUs.ca
            </p>
          </div>
          <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
            <p>QuoteUs.ca - Your Trusted Insurance Partner</p>
          </div>
        </div>';

        $sent = sendEmail($to, $subject, $emailHtml);

        storage()->createActivity([
            'quote_id' => $m[1],
            'type' => 'email_sent',
            'content' => ($sent ? 'Email sent to ' : 'Email logged (SMTP not configured) to ') . $to . ': "' . $subject . '"',
            'author' => $actor['name'],
        ]);

        jsonResponse(['success' => true, 'delivered' => (bool)$sent]);
    } catch (Exception $e) {
        jsonResponse(['error' => $e->getMessage()], 500);
    }
}

// POST /leads/assign
if ($method === 'POST' && preg_match('#^/leads/assign$#', $path)) {
    try {
        $quoteId = $input['quoteId'] ?? null;
        $brokerId = $input['brokerId'] ?? null;
        $actorId = $input['actorId'] ?? null;
        $actorName = $input['actorName'] ?? null;

        if (!$quoteId || !$brokerId) jsonResponse(['error' => 'Quote ID and broker ID are required'], 400);
        if (!$actorId) jsonResponse(['error' => 'Actor ID is required for authentication'], 401);

        $actor = storage()->getUser($actorId);
        if (!$actor || !in_array($actor['role'], ['admin', 'manager'])) {
            jsonResponse(['error' => 'Only admin/manager can assign leads'], 403);
        }

        if ($actor['role'] === 'manager') {
            if (!checkPermission($actorId, 'assignLeads')) {
                jsonResponse(['error' => "You don't have permission to assign leads"], 403);
            }
        }

        $quote = storage()->getQuote($quoteId);
        if (!$quote) jsonResponse(['error' => 'Quote not found'], 404);

        if (($quote['assigned_to'] ?? null) === $brokerId) {
            $existingBroker = storage()->getUser($brokerId);
            jsonResponse([
                'success' => true,
                'message' => 'Lead already assigned to this broker',
                'newBalance' => $existingBroker['balance'] ?? '0.00',
                'leadCost' => 0,
                'alreadyAssigned' => true,
            ]);
        }

        $currentLeadCosts = getLeadCosts();
        $validTypes = array_keys($currentLeadCosts);
        if (!in_array($quote['type'], $validTypes)) {
            jsonResponse(['error' => 'Invalid lead type'], 400);
        }

        $broker = storage()->getUser($brokerId);
        if (!$broker) jsonResponse(['error' => 'Broker not found'], 404);
        if ($broker['role'] !== 'broker') jsonResponse(['error' => 'Can only assign leads to brokers'], 400);
        if ($broker['status'] === 'paused') jsonResponse(['error' => 'Cannot assign leads to paused brokers'], 400);

        $now = time();
        if (!empty($broker['pause_start_date']) && !empty($broker['pause_end_date'])) {
            $start = strtotime($broker['pause_start_date']);
            $end = strtotime($broker['pause_end_date']);
            if ($now >= $start && $now <= $end) {
                jsonResponse(['error' => 'Cannot assign leads to brokers during their pause period'], 400);
            }
        } elseif (!empty($broker['pause_start_date']) && empty($broker['pause_end_date'])) {
            $start = strtotime($broker['pause_start_date']);
            if ($now >= $start) {
                jsonResponse(['error' => 'Cannot assign leads to paused brokers'], 400);
            }
        }

        $defaultCost = $currentLeadCosts[$quote['type']] ?? ($currentLeadCosts['General'] ?? 8);
        $leadCost = ($broker['lead_cost_override'] !== null && $broker['lead_cost_override'] !== '')
            ? (float)$broker['lead_cost_override']
            : $defaultCost;

        $debitResult = storage()->debitBalance(
            $brokerId,
            number_format($leadCost, 2, '.', ''),
            'Lead assigned: ' . $quote['type'] . ' - ' . $quote['client_name'] . ' (' . $quote['quote_number'] . ')',
            ['quote_id' => $quoteId, 'actor_id' => $actorId, 'actor_name' => $actorName]
        );

        if (!$debitResult) {
            jsonResponse([
                'error' => 'Insufficient balance',
                'required' => $leadCost,
                'currentBalance' => $broker['balance'],
            ], 400);
        }

        $updatedQuote = storage()->updateQuote($quoteId, [
            'assigned_to' => $brokerId,
            'assigned_at' => Database::now(),
        ]);

        storage()->createActivity([
            'quote_id' => $quoteId,
            'type' => 'assignment',
            'content' => 'Lead assigned to ' . $broker['name'] . ' ($' . $leadCost . ' deducted)',
            'author' => $actorName ?: 'System',
        ]);

        if (!empty($broker['email'])) {
            $assignEmail = generateAssignmentEmail([
                'brokerName' => $broker['name'],
                'clientName' => $quote['client_name'],
                'type' => $quote['type'],
                'email' => $quote['email'] ?? '',
                'phone' => $quote['phone'] ?? null,
                'assignedBy' => $actorName ?: 'Admin',
            ]);
            sendEmail($broker['email'], $assignEmail['subject'], $assignEmail['html']);
        }

        jsonResponse([
            'success' => true,
            'newBalance' => $debitResult['user']['balance'],
            'transaction' => $debitResult['transaction'],
            'leadCost' => $leadCost,
            'quote' => $updatedQuote,
        ]);
    } catch (Exception $e) {
        jsonResponse(['error' => $e->getMessage()], 500);
    }
}

// GET /settings/lead-expiry-hours
if ($method === 'GET' && preg_match('#^/settings/lead-expiry-hours$#', $path)) {
    try {
        $hours = storage()->getSetting('lead_expiry_hours');
        jsonResponse(['hours' => $hours ? (float)$hours : 24]);
    } catch (Exception $e) {
        jsonResponse(['error' => $e->getMessage()], 500);
    }
}

// POST /settings/lead-expiry-hours
if ($method === 'POST' && preg_match('#^/settings/lead-expiry-hours$#', $path)) {
    try {
        $hours = $input['hours'] ?? null;
        $actorId = $input['actorId'] ?? null;

        if (!$actorId) jsonResponse(['error' => 'Actor ID is required'], 401);
        $actor = storage()->getUser($actorId);
        if (!$actor || !in_array($actor['role'], ['admin', 'manager'])) {
            jsonResponse(['error' => 'Only admin/manager can update expiry timer'], 403);
        }
        if (!is_numeric($hours) || $hours < 1 || $hours > 720) {
            jsonResponse(['error' => 'Hours must be between 1 and 720 (30 days)'], 400);
        }

        storage()->setSetting('lead_expiry_hours', (string)$hours, $actorId);
        jsonResponse(['success' => true, 'hours' => (float)$hours]);
    } catch (Exception $e) {
        jsonResponse(['error' => $e->getMessage()], 500);
    }
}

// POST /leads/check-expiry
if ($method === 'POST' && preg_match('#^/leads/check-expiry$#', $path)) {
    try {
        $actorId = $input['actorId'] ?? null;
        if (!$actorId) jsonResponse(['error' => 'Actor ID is required'], 401);
        $actor = storage()->getUser($actorId);
        if (!$actor || !in_array($actor['role'], ['admin', 'manager'])) {
            jsonResponse(['error' => 'Only admin/manager can check lead expiry'], 403);
        }

        $expiryHoursSetting = storage()->getSetting('lead_expiry_hours');
        $expiryHours = $expiryHoursSetting ? (float)$expiryHoursSetting : 24;
        $now = time();
        $allQuotes = storage()->getAllQuotes();

        $expiredLeads = [];
        foreach ($allQuotes as $quote) {
            if (!empty($quote['assigned_to']) && !empty($quote['assigned_at']) && $quote['status'] === 'New') {
                $assignedTime = strtotime($quote['assigned_at']);
                $expiryTime = $assignedTime + ($expiryHours * 3600);
                if ($now > $expiryTime) {
                    storage()->updateQuote($quote['id'], ['status' => 'Expired']);
                    storage()->createActivity([
                        'quote_id' => $quote['id'],
                        'type' => 'system',
                        'content' => "Lead expired - broker did not respond within {$expiryHours} hours",
                        'author' => 'System',
                    ]);
                    $expiredLeads[] = $quote['id'];
                }
            }
        }

        jsonResponse(['success' => true, 'expiredCount' => count($expiredLeads), 'expiredLeads' => $expiredLeads]);
    } catch (Exception $e) {
        jsonResponse(['error' => $e->getMessage()], 500);
    }
}

// POST /leads/reassign
if ($method === 'POST' && preg_match('#^/leads/reassign$#', $path)) {
    try {
        $quoteId = $input['quoteId'] ?? null;
        $brokerId = $input['brokerId'] ?? null;
        $actorId = $input['actorId'] ?? null;
        $actorName = $input['actorName'] ?? null;

        if (!$quoteId || !$brokerId) jsonResponse(['error' => 'Quote ID and broker ID are required'], 400);
        if (!$actorId) jsonResponse(['error' => 'Actor ID is required'], 401);

        $actor = storage()->getUser($actorId);
        if (!$actor || !in_array($actor['role'], ['admin', 'manager'])) {
            jsonResponse(['error' => 'Only admin/manager can reassign leads'], 403);
        }
        if ($actor['role'] === 'manager') {
            if (!checkPermission($actorId, 'assignLeads')) {
                jsonResponse(['error' => "You don't have permission to reassign leads"], 403);
            }
        }

        $quote = storage()->getQuote($quoteId);
        if (!$quote) jsonResponse(['error' => 'Quote not found'], 404);

        $broker = storage()->getUser($brokerId);
        if (!$broker || $broker['role'] !== 'broker') jsonResponse(['error' => 'Invalid broker'], 400);
        if ($broker['status'] === 'paused') jsonResponse(['error' => 'Cannot reassign to paused brokers'], 400);

        $currentLeadCosts = getLeadCosts();
        $defaultCost = $currentLeadCosts[$quote['type']] ?? ($currentLeadCosts['General'] ?? 8);
        $leadCost = ($broker['lead_cost_override'] !== null && $broker['lead_cost_override'] !== '')
            ? (float)$broker['lead_cost_override']
            : $defaultCost;

        $debitResult = storage()->debitBalance(
            $brokerId,
            number_format($leadCost, 2, '.', ''),
            'Lead reassigned: ' . $quote['type'] . ' - ' . $quote['client_name'] . ' (' . $quote['quote_number'] . ')',
            ['quote_id' => $quoteId, 'actor_id' => $actorId, 'actor_name' => $actorName]
        );

        if (!$debitResult) {
            jsonResponse([
                'error' => 'Insufficient balance',
                'required' => $leadCost,
                'currentBalance' => $broker['balance'],
            ], 400);
        }

        storage()->updateQuote($quoteId, [
            'assigned_to' => $brokerId,
            'assigned_at' => Database::now(),
            'status' => 'New',
        ]);

        storage()->createActivity([
            'quote_id' => $quoteId,
            'type' => 'assignment',
            'content' => 'Lead reassigned to ' . $broker['name'] . ' ($' . $leadCost . ' deducted) by ' . ($actorName ?: 'Admin'),
            'author' => $actorName ?: 'System',
        ]);

        if (!empty($broker['email'])) {
            $assignEmail = generateAssignmentEmail([
                'brokerName' => $broker['name'],
                'clientName' => $quote['client_name'],
                'type' => $quote['type'],
                'email' => $quote['email'] ?? '',
                'phone' => $quote['phone'] ?? null,
                'assignedBy' => $actorName ?: 'Admin',
            ]);
            sendEmail($broker['email'], $assignEmail['subject'], $assignEmail['html']);
        }

        jsonResponse([
            'success' => true,
            'newBalance' => $debitResult['user']['balance'],
            'transaction' => $debitResult['transaction'],
            'leadCost' => $leadCost,
        ]);
    } catch (Exception $e) {
        jsonResponse(['error' => $e->getMessage()], 500);
    }
}

http_response_code(404);
echo json_encode(['error' => 'Quote endpoint not found']);
