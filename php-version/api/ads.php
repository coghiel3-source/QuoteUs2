<?php

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../database.php';
require_once __DIR__ . '/../storage.php';

function handleAdsRoutes($method, $path, $body) {
    $segments = explode('/', trim($path, '/'));

    if ($segments[0] === 'admin' && isset($segments[1]) && $segments[1] === 'advertisements') {
        return handleAdminAdvertisementRoutes($method, $segments, $body);
    }

    if ($segments[0] === 'ads') {
        return handlePublicAdRoutes($method, $segments, $body);
    }

    if ($segments[0] === 'advertisements') {
        return handleAdvertisementPublicRoutes($method, $segments, $body);
    }

    if ($segments[0] === 'settings') {
        return handleAdSettingsRoutes($method, $segments, $body);
    }

    return null;
}

function handleAdminAdvertisementRoutes($method, $segments, $body) {
    if ($method === 'GET' && count($segments) === 2) {
        try {
            $ads = storage()->getAllAdvertisements();
            jsonResponse($ads);
        } catch (Exception $e) {
            errorResponse($e->getMessage(), 500);
        }
        return true;
    }

    if ($method === 'POST' && count($segments) === 3 && $segments[2] === 'upload') {
        return handleAdUpload();
    }

    if ($method === 'GET' && count($segments) === 3) {
        try {
            $ad = storage()->getAdvertisement($segments[2]);
            if (!$ad) {
                errorResponse('Advertisement not found', 404);
                return true;
            }
            jsonResponse($ad);
        } catch (Exception $e) {
            errorResponse($e->getMessage(), 500);
        }
        return true;
    }

    if ($method === 'POST' && count($segments) === 2) {
        try {
            $name = $body['name'] ?? null;
            $mediaUrl = $body['mediaUrl'] ?? ($body['media_url'] ?? null);

            if (!$name || !$mediaUrl) {
                errorResponse('Name and media URL are required', 400);
                return true;
            }

            $adData = [
                'name' => $name,
                'media_type' => $body['mediaType'] ?? ($body['media_type'] ?? 'image'),
                'media_url' => $mediaUrl,
                'link_url' => $body['linkUrl'] ?? ($body['link_url'] ?? null),
                'open_in_popup' => !empty($body['openInPopup'] ?? ($body['open_in_popup'] ?? false)),
                'target_pages' => $body['targetPages'] ?? ($body['target_pages'] ?? []),
                'status' => $body['status'] ?? 'active',
                'start_date' => $body['startDate'] ?? ($body['start_date'] ?? null),
                'end_date' => $body['endDate'] ?? ($body['end_date'] ?? null),
                'priority' => $body['priority'] ?? 1,
                'created_by' => $body['createdBy'] ?? ($body['created_by'] ?? null),
                'ad_text' => $body['adText'] ?? ($body['ad_text'] ?? null),
                'text_color' => $body['textColor'] ?? ($body['text_color'] ?? '#ffffff'),
                'background_color' => $body['backgroundColor'] ?? ($body['background_color'] ?? '#1e3a5f'),
                'text_position' => $body['textPosition'] ?? ($body['text_position'] ?? 'bottom'),
                'top_text' => $body['topText'] ?? ($body['top_text'] ?? null),
                'center_text' => $body['centerText'] ?? ($body['center_text'] ?? null),
                'bottom_text' => $body['bottomText'] ?? ($body['bottom_text'] ?? null),
                'top_text_color' => $body['topTextColor'] ?? ($body['top_text_color'] ?? '#ffffff'),
                'center_text_color' => $body['centerTextColor'] ?? ($body['center_text_color'] ?? '#ffffff'),
                'bottom_text_color' => $body['bottomTextColor'] ?? ($body['bottom_text_color'] ?? '#ffffff'),
                'top_bg_color' => $body['topBgColor'] ?? ($body['top_bg_color'] ?? '#1e3a5f'),
                'center_bg_color' => $body['centerBgColor'] ?? ($body['center_bg_color'] ?? '#1e3a5f'),
                'bottom_bg_color' => $body['bottomBgColor'] ?? ($body['bottom_bg_color'] ?? '#1e3a5f'),
            ];

            $ad = storage()->createAdvertisement($adData);
            jsonResponse($ad, 201);
        } catch (Exception $e) {
            errorResponse($e->getMessage(), 500);
        }
        return true;
    }

    if ($method === 'PATCH' && count($segments) === 3) {
        try {
            $fields = [
                'name', 'mediaType', 'media_type', 'mediaUrl', 'media_url',
                'linkUrl', 'link_url', 'openInPopup', 'open_in_popup',
                'targetPages', 'target_pages', 'status',
                'startDate', 'start_date', 'endDate', 'end_date',
                'priority', 'adText', 'ad_text',
                'textColor', 'text_color', 'backgroundColor', 'background_color',
                'textPosition', 'text_position',
                'topText', 'top_text', 'centerText', 'center_text', 'bottomText', 'bottom_text',
                'topTextColor', 'top_text_color', 'centerTextColor', 'center_text_color',
                'bottomTextColor', 'bottom_text_color',
                'topBgColor', 'top_bg_color', 'centerBgColor', 'center_bg_color',
                'bottomBgColor', 'bottom_bg_color',
            ];

            $camelToSnake = [
                'mediaType' => 'media_type', 'mediaUrl' => 'media_url',
                'linkUrl' => 'link_url', 'openInPopup' => 'open_in_popup',
                'targetPages' => 'target_pages', 'startDate' => 'start_date',
                'endDate' => 'end_date', 'adText' => 'ad_text',
                'textColor' => 'text_color', 'backgroundColor' => 'background_color',
                'textPosition' => 'text_position',
                'topText' => 'top_text', 'centerText' => 'center_text', 'bottomText' => 'bottom_text',
                'topTextColor' => 'top_text_color', 'centerTextColor' => 'center_text_color',
                'bottomTextColor' => 'bottom_text_color',
                'topBgColor' => 'top_bg_color', 'centerBgColor' => 'center_bg_color',
                'bottomBgColor' => 'bottom_bg_color',
            ];

            $updates = [];
            foreach ($body as $key => $value) {
                $dbKey = $camelToSnake[$key] ?? $key;
                if (in_array($key, $fields)) {
                    if ($dbKey === 'start_date' || $dbKey === 'end_date') {
                        $updates[$dbKey] = $value ? date('Y-m-d H:i:s', strtotime($value)) : null;
                    } else {
                        $updates[$dbKey] = $value;
                    }
                }
            }

            $ad = storage()->updateAdvertisement($segments[2], $updates);
            if (!$ad) {
                errorResponse('Advertisement not found', 404);
                return true;
            }
            jsonResponse($ad);
        } catch (Exception $e) {
            errorResponse($e->getMessage(), 500);
        }
        return true;
    }

    if ($method === 'DELETE' && count($segments) === 3) {
        try {
            storage()->deleteAdvertisement($segments[2]);
            jsonResponse(['success' => true]);
        } catch (Exception $e) {
            errorResponse($e->getMessage(), 500);
        }
        return true;
    }

    return null;
}

function handlePublicAdRoutes($method, $segments, $body) {
    if ($method === 'GET' && count($segments) === 2) {
        try {
            $ads = storage()->getActiveAdsForPage($segments[1]);
            jsonResponse($ads);
        } catch (Exception $e) {
            errorResponse($e->getMessage(), 500);
        }
        return true;
    }

    if ($method === 'POST' && count($segments) === 3 && $segments[2] === 'impression') {
        try {
            storage()->incrementAdImpression($segments[1]);
            jsonResponse(['success' => true]);
        } catch (Exception $e) {
            errorResponse($e->getMessage(), 500);
        }
        return true;
    }

    if ($method === 'POST' && count($segments) === 3 && $segments[2] === 'click') {
        try {
            storage()->incrementAdClick($segments[1]);
            jsonResponse(['success' => true]);
        } catch (Exception $e) {
            errorResponse($e->getMessage(), 500);
        }
        return true;
    }

    return null;
}

function handleAdvertisementPublicRoutes($method, $segments, $body) {
    if ($method === 'GET' && count($segments) === 2 && $segments[1] === 'active') {
        try {
            $page = $_GET['page'] ?? null;
            if (!$page) {
                errorResponse('Page parameter required', 400);
                return true;
            }
            $ads = storage()->getActiveAdsForPage($page);
            jsonResponse($ads);
        } catch (Exception $e) {
            errorResponse($e->getMessage(), 500);
        }
        return true;
    }

    if ($method === 'GET' && count($segments) === 3 && $segments[1] === 'preview') {
        try {
            $ad = storage()->getAdvertisementByPreviewToken($segments[2]);
            if (!$ad) {
                errorResponse('Advertisement not found', 404);
                return true;
            }
            jsonResponse($ad);
        } catch (Exception $e) {
            errorResponse($e->getMessage(), 500);
        }
        return true;
    }

    if ($method === 'POST' && count($segments) === 4 && $segments[1] === 'preview' && $segments[3] === 'approve') {
        try {
            $approved = $body['approved'] ?? false;
            $ad = storage()->getAdvertisementByPreviewToken($segments[2]);
            if (!$ad) {
                errorResponse('Advertisement not found', 404);
                return true;
            }

            $updatedAd = storage()->updateAdvertisement($ad['id'], [
                'approval_status' => $approved ? 'approved' : 'rejected',
                'status' => $approved ? 'active' : 'paused',
            ]);

            jsonResponse($updatedAd);
        } catch (Exception $e) {
            errorResponse($e->getMessage(), 500);
        }
        return true;
    }

    if ($method === 'POST' && count($segments) === 3 && $segments[2] === 'impression') {
        try {
            storage()->incrementAdImpression($segments[1]);
            jsonResponse(['success' => true]);
        } catch (Exception $e) {
            errorResponse($e->getMessage(), 500);
        }
        return true;
    }

    if ($method === 'POST' && count($segments) === 3 && $segments[2] === 'click') {
        try {
            storage()->incrementAdClick($segments[1]);
            jsonResponse(['success' => true]);
        } catch (Exception $e) {
            errorResponse($e->getMessage(), 500);
        }
        return true;
    }

    return null;
}

function handleAdSettingsRoutes($method, $segments, $body) {
    if ($method === 'GET' && count($segments) === 2 && $segments[1] === 'ads-per-slot') {
        try {
            $value = storage()->getSetting('ads_per_slot');
            $parsed = $value ? intval($value) : 1;
            $clamped = max(1, min(3, $parsed));
            jsonResponse(['value' => $clamped]);
        } catch (Exception $e) {
            errorResponse($e->getMessage(), 500);
        }
        return true;
    }

    if ($method === 'GET' && count($segments) === 2 && $segments[1] === 'social-media') {
        try {
            $value = storage()->getSetting('social_media');
            if ($value) {
                jsonResponse(json_decode($value, true));
            } else {
                jsonResponse([
                    'facebook' => 'https://www.facebook.com/people/QuoteUsca/100064074608534/',
                    'instagram' => 'https://www.instagram.com/quoteus.ca/',
                    'twitter' => '',
                    'linkedin' => '',
                    'youtube' => '',
                    'tiktok' => '',
                ]);
            }
        } catch (Exception $e) {
            errorResponse($e->getMessage(), 500);
        }
        return true;
    }

    if ($method === 'GET' && count($segments) === 2 && $segments[1] === 'custom-css') {
        try {
            $value = storage()->getSetting('custom_css');
            jsonResponse(['value' => $value ?? '']);
        } catch (Exception $e) {
            errorResponse($e->getMessage(), 500);
        }
        return true;
    }

    return null;
}

function handleAdUpload() {
    try {
        if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
            errorResponse('No file uploaded', 400);
            return true;
        }

        $file = $_FILES['file'];
        $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime'];
        $allowedExts = ['jpeg', 'jpg', 'png', 'gif', 'webp', 'mp4', 'webm', 'mov'];

        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if (!in_array($ext, $allowedExts)) {
            errorResponse('Only image and video files are allowed', 400);
            return true;
        }

        $maxSize = 50 * 1024 * 1024;
        if ($file['size'] > $maxSize) {
            errorResponse('File too large. Maximum 50MB allowed.', 400);
            return true;
        }

        $uploadDir = UPLOAD_DIR;
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        $uniqueSuffix = time() . '-' . rand(100000000, 999999999);
        $filename = "ad-{$uniqueSuffix}.{$ext}";
        $targetPath = $uploadDir . '/' . $filename;

        if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
            errorResponse('Failed to save uploaded file', 500);
            return true;
        }

        jsonResponse([
            'url' => '/uploads/' . $filename,
            'filename' => $filename,
        ]);
    } catch (Exception $e) {
        errorResponse($e->getMessage(), 500);
    }
    return true;
}

function jsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

function errorResponse($message, $statusCode = 400) {
    http_response_code($statusCode);
    header('Content-Type: application/json');
    echo json_encode(['error' => $message]);
    exit;
}
