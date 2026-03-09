<?php

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../database.php';
require_once __DIR__ . '/../storage.php';
require_once __DIR__ . '/../email.php';

function handlePartnersRoutes($method, $path, $body) {
    $segments = explode('/', trim($path, '/'));

    if ($segments[0] === 'referral-partners') {
        return handleReferralPartnerRoutes($method, $segments, $body);
    }

    if ($segments[0] === 'admin' && isset($segments[1]) && $segments[1] === 'redirects') {
        return handlePartnerRedirectRoutes($method, $segments, $body);
    }

    if ($segments[0] === 'redirects') {
        return handlePublicRedirectRoutes($method, $segments, $body);
    }

    if ($segments[0] === 'contact') {
        return handleContactRoute($method, $body);
    }

    return null;
}

function handleReferralPartnerRoutes($method, $segments, $body) {
    if ($method === 'GET' && count($segments) === 1) {
        try {
            $partners = storage()->getAllReferralPartners();
            partnersJsonResponse($partners);
        } catch (Exception $e) {
            partnersErrorResponse($e->getMessage(), 500);
        }
        return true;
    }

    if ($method === 'GET' && count($segments) === 3 && $segments[1] === 'generate-id') {
        try {
            $validProvinces = ['ON', 'AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'PE', 'QC', 'SK', 'YT'];
            $province = strtoupper($segments[2]);
            if (!in_array($province, $validProvinces)) {
                partnersErrorResponse('Invalid province code', 400);
                return true;
            }
            $referenceId = storage()->getNextReferenceIdForProvince($province);
            partnersJsonResponse(['referenceId' => $referenceId]);
        } catch (Exception $e) {
            partnersErrorResponse($e->getMessage(), 500);
        }
        return true;
    }

    if ($method === 'GET' && count($segments) === 2) {
        try {
            $partner = storage()->getReferralPartner($segments[1]);
            if (!$partner) {
                partnersErrorResponse('Partner not found', 404);
                return true;
            }
            partnersJsonResponse($partner);
        } catch (Exception $e) {
            partnersErrorResponse($e->getMessage(), 500);
        }
        return true;
    }

    if ($method === 'POST' && count($segments) === 1) {
        try {
            $actorId = $body['actorId'] ?? null;
            if (!$actorId) {
                partnersErrorResponse('Unauthorized', 401);
                return true;
            }

            $actor = storage()->getUser($actorId);
            if (!$actor || !in_array($actor['role'], ['admin', 'manager'])) {
                partnersErrorResponse('Only admin or manager can create referral partners', 403);
                return true;
            }

            $contactName = $body['contactName'] ?? ($body['contact_name'] ?? null);
            $email = $body['email'] ?? null;
            $province = $body['province'] ?? null;

            if (!$contactName || !$email || !$province) {
                partnersErrorResponse('Contact name, email, and province are required', 400);
                return true;
            }

            $validProvinces = ['ON', 'AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'PE', 'QC', 'SK', 'YT'];
            $upperProvince = strtoupper($province);
            if (!in_array($upperProvince, $validProvinces)) {
                partnersErrorResponse('Invalid province code', 400);
                return true;
            }

            $referenceId = storage()->getNextReferenceIdForProvince($upperProvince);

            $partner = storage()->createReferralPartner([
                'contact_name' => $contactName,
                'email' => $email,
                'phone' => $body['phone'] ?? null,
                'address' => $body['address'] ?? null,
                'province' => $upperProvince,
                'business_description' => $body['businessDescription'] ?? ($body['business_description'] ?? null),
                'relationships' => $body['relationships'] ?? null,
                'reference_id' => $referenceId,
                'status' => 'active',
                'created_by' => $actorId,
            ]);

            partnersJsonResponse($partner);
        } catch (Exception $e) {
            partnersErrorResponse($e->getMessage(), 500);
        }
        return true;
    }

    if ($method === 'PUT' && count($segments) === 2) {
        try {
            $actorId = $body['actorId'] ?? null;
            if (!$actorId) {
                partnersErrorResponse('Unauthorized', 401);
                return true;
            }

            $actor = storage()->getUser($actorId);
            if (!$actor || !in_array($actor['role'], ['admin', 'manager'])) {
                partnersErrorResponse('Only admin or manager can update referral partners', 403);
                return true;
            }

            $existing = storage()->getReferralPartner($segments[1]);
            if (!$existing) {
                partnersErrorResponse('Partner not found', 404);
                return true;
            }

            $updateData = $body;
            unset($updateData['actorId']);
            unset($updateData['referenceId']);
            unset($updateData['reference_id']);
            unset($updateData['createdBy']);
            unset($updateData['created_by']);

            $camelToSnake = [
                'contactName' => 'contact_name',
                'businessDescription' => 'business_description',
            ];
            foreach ($camelToSnake as $camel => $snake) {
                if (isset($updateData[$camel])) {
                    $updateData[$snake] = $updateData[$camel];
                    unset($updateData[$camel]);
                }
            }

            $partner = storage()->updateReferralPartner($segments[1], $updateData);
            partnersJsonResponse($partner);
        } catch (Exception $e) {
            partnersErrorResponse($e->getMessage(), 500);
        }
        return true;
    }

    if ($method === 'DELETE' && count($segments) === 2) {
        try {
            $actorId = $body['actorId'] ?? null;
            if (!$actorId) {
                partnersErrorResponse('Unauthorized', 401);
                return true;
            }

            $actor = storage()->getUser($actorId);
            if (!$actor || !in_array($actor['role'], ['admin', 'manager'])) {
                partnersErrorResponse('Only admin or manager can delete referral partners', 403);
                return true;
            }

            $deleted = storage()->deleteReferralPartner($segments[1]);
            if (!$deleted) {
                partnersErrorResponse('Partner not found', 404);
                return true;
            }
            partnersJsonResponse(['success' => true]);
        } catch (Exception $e) {
            partnersErrorResponse($e->getMessage(), 500);
        }
        return true;
    }

    return null;
}

function handlePartnerRedirectRoutes($method, $segments, $body) {
    if ($method === 'GET' && count($segments) === 2) {
        try {
            $redirects = storage()->getAllPartnerRedirects();
            partnersJsonResponse($redirects);
        } catch (Exception $e) {
            partnersErrorResponse($e->getMessage(), 500);
        }
        return true;
    }

    if ($method === 'POST' && count($segments) === 2) {
        try {
            $quoteType = $body['quoteType'] ?? ($body['quote_type'] ?? null);
            $redirectUrl = $body['redirectUrl'] ?? ($body['redirect_url'] ?? null);

            if (!$quoteType || !$redirectUrl) {
                partnersErrorResponse('Quote type and redirect URL are required', 400);
                return true;
            }

            $redirect = storage()->createPartnerRedirect([
                'quote_type' => $quoteType,
                'redirect_url' => $redirectUrl,
                'is_active' => ($body['isActive'] ?? ($body['is_active'] ?? true)) !== false,
                'description' => $body['description'] ?? null,
            ]);
            partnersJsonResponse($redirect);
        } catch (Exception $e) {
            if (strpos($e->getMessage(), 'Duplicate entry') !== false || strpos($e->getMessage(), 'unique') !== false) {
                partnersErrorResponse('A redirect for this quote type already exists', 400);
                return true;
            }
            partnersErrorResponse($e->getMessage(), 500);
        }
        return true;
    }

    if ($method === 'PUT' && count($segments) === 3) {
        try {
            $updateData = $body;
            $camelToSnake = [
                'quoteType' => 'quote_type',
                'redirectUrl' => 'redirect_url',
                'isActive' => 'is_active',
            ];
            foreach ($camelToSnake as $camel => $snake) {
                if (isset($updateData[$camel])) {
                    $updateData[$snake] = $updateData[$camel];
                    unset($updateData[$camel]);
                }
            }

            $redirect = storage()->updatePartnerRedirect($segments[2], $updateData);
            if (!$redirect) {
                partnersErrorResponse('Redirect not found', 404);
                return true;
            }
            partnersJsonResponse($redirect);
        } catch (Exception $e) {
            if (strpos($e->getMessage(), 'Duplicate entry') !== false || strpos($e->getMessage(), 'unique') !== false) {
                partnersErrorResponse('A redirect for this quote type already exists', 400);
                return true;
            }
            partnersErrorResponse($e->getMessage(), 500);
        }
        return true;
    }

    if ($method === 'DELETE' && count($segments) === 3) {
        try {
            $deleted = storage()->deletePartnerRedirect($segments[2]);
            if (!$deleted) {
                partnersErrorResponse('Redirect not found', 404);
                return true;
            }
            partnersJsonResponse(['success' => true]);
        } catch (Exception $e) {
            partnersErrorResponse($e->getMessage(), 500);
        }
        return true;
    }

    return null;
}

function handlePublicRedirectRoutes($method, $segments, $body) {
    if ($method === 'GET' && count($segments) === 2) {
        try {
            $redirect = storage()->getPartnerRedirectByQuoteType($segments[1]);
            if (!$redirect) {
                partnersJsonResponse(['redirectUrl' => null]);
                return true;
            }
            partnersJsonResponse(['redirectUrl' => $redirect['redirect_url']]);
        } catch (Exception $e) {
            partnersErrorResponse($e->getMessage(), 500);
        }
        return true;
    }

    return null;
}

function handleContactRoute($method, $body) {
    if ($method !== 'POST') {
        return null;
    }

    try {
        $name = $body['name'] ?? null;
        $email = $body['email'] ?? null;
        $category = $body['category'] ?? null;
        $message = $body['message'] ?? null;

        if (!$name || !$email || !$category || !$message) {
            partnersErrorResponse('All fields are required', 400);
            return true;
        }

        $categoryLabels = [
            'auto' => 'Auto Insurance',
            'home' => 'Home Insurance',
            'tenant' => 'Tenant Insurance',
            'travel' => 'Travel Insurance',
            'life' => 'Life Insurance',
            'business' => 'Business Insurance',
            'mortgage' => 'Mortgage',
            'compare' => 'Compare Quotes',
            'advertisement' => 'Advertisement Inquiry',
            'other' => 'Other',
        ];

        $categoryLabel = $categoryLabels[$category] ?? $category;

        $subject = "[QuoteUs.ca Contact] {$categoryLabel} - {$name}";
        $html = '<h2>New Contact Form Submission</h2>'
            . '<p><strong>Name:</strong> ' . htmlspecialchars($name) . '</p>'
            . '<p><strong>Email:</strong> ' . htmlspecialchars($email) . '</p>'
            . '<p><strong>Category:</strong> ' . htmlspecialchars($categoryLabel) . '</p>'
            . '<p><strong>Message:</strong></p>'
            . '<p>' . nl2br(htmlspecialchars($message)) . '</p>';

        $sent = sendEmail('info@quoteus.ca', $subject, $html);

        if (!$sent) {
            error_log('[Contact] Email not sent (SMTP not configured), but form submitted successfully');
        }

        partnersJsonResponse(['success' => true, 'message' => 'Contact form submitted successfully']);
    } catch (Exception $e) {
        error_log('[Contact] Error: ' . $e->getMessage());
        partnersErrorResponse($e->getMessage(), 500);
    }
    return true;
}

function partnersJsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

function partnersErrorResponse($message, $statusCode = 400) {
    http_response_code($statusCode);
    header('Content-Type: application/json');
    echo json_encode(['error' => $message]);
    exit;
}
