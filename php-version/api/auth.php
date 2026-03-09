<?php

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../database.php';
require_once __DIR__ . '/../storage.php';
require_once __DIR__ . '/../email.php';

function handleAuthRoutes($method, $path, $body) {
    if ($method === 'POST' && $path === '/api/auth/login') {
        return handleLogin($body);
    }

    if ($method === 'POST' && $path === '/api/auth/forgot-password') {
        return handleForgotPassword($body);
    }

    if ($method === 'GET' && $path === '/api/auth/verify-reset-token') {
        return handleVerifyResetToken();
    }

    if ($method === 'POST' && $path === '/api/auth/reset-password') {
        return handleResetPassword($body);
    }

    return null;
}

function handleLogin($body) {
    try {
        $email = $body['email'] ?? null;
        $role = $body['role'] ?? null;
        $password = $body['password'] ?? null;

        if (!$email) {
            http_response_code(400);
            return ['error' => 'Email is required'];
        }

        $user = storage()->getUserByEmail($email);

        if (!$user) {
            http_response_code(404);
            return ['error' => 'User not found'];
        }

        if ($role && $user['role'] !== $role) {
            http_response_code(403);
            return ['error' => 'Invalid role'];
        }

        if ($password && !empty($user['password'])) {
            $isHashed = strpos($user['password'], '$2a$') === 0 || strpos($user['password'], '$2b$') === 0 || strpos($user['password'], '$2y$') === 0;
            if ($isHashed) {
                if (!password_verify($password, $user['password'])) {
                    http_response_code(401);
                    return ['error' => 'Invalid password'];
                }
            } else {
                if ($password !== $user['password']) {
                    http_response_code(401);
                    return ['error' => 'Invalid password'];
                }
            }
        }

        return safeUser($user);
    } catch (Exception $e) {
        http_response_code(500);
        return ['error' => $e->getMessage()];
    }
}

function handleForgotPassword($body) {
    try {
        $email = $body['email'] ?? null;

        if (!$email) {
            http_response_code(400);
            return ['error' => 'Email is required'];
        }

        $user = storage()->getUserByEmail($email);

        if (!$user) {
            return ['message' => 'If an account exists with that email, a reset link will be sent.'];
        }

        $resetToken = bin2hex(random_bytes(32));
        $resetExpiry = date('Y-m-d H:i:s', time() + 3600);

        storage()->setResetToken($user['id'], $resetToken, $resetExpiry);

        $resetLink = APP_URL . '/reset-password?token=' . $resetToken;

        $emailContent = generatePasswordResetEmail($user['name'], $resetLink);
        $sent = sendEmail($user['email'], $emailContent['subject'], $emailContent['html']);

        if ($sent) {
            error_log("[Password Reset] Reset email sent to {$user['email']}");
        } else {
            error_log("[Password Reset] Failed to send reset email to {$user['email']}");
        }

        return ['message' => 'If an account exists with that email, a reset link will be sent.'];
    } catch (Exception $e) {
        error_log("[Password Reset] Error: " . $e->getMessage());
        http_response_code(500);
        return ['error' => $e->getMessage()];
    }
}

function handleVerifyResetToken() {
    try {
        $token = $_GET['token'] ?? null;

        if (!$token) {
            http_response_code(400);
            return ['valid' => false, 'error' => 'Token is required'];
        }

        $user = storage()->getUserByResetToken($token);

        if (!$user || empty($user['reset_token_expiry'])) {
            return ['valid' => false, 'error' => 'Invalid or expired token'];
        }

        if (strtotime($user['reset_token_expiry']) < time()) {
            storage()->clearResetToken($user['id']);
            return ['valid' => false, 'error' => 'Token has expired'];
        }

        return ['valid' => true, 'email' => $user['email']];
    } catch (Exception $e) {
        http_response_code(500);
        return ['valid' => false, 'error' => $e->getMessage()];
    }
}

function handleResetPassword($body) {
    try {
        $token = $body['token'] ?? null;
        $password = $body['password'] ?? null;

        if (!$token || !$password) {
            http_response_code(400);
            return ['error' => 'Token and password are required'];
        }

        if (strlen($password) < 6) {
            http_response_code(400);
            return ['error' => 'Password must be at least 6 characters'];
        }

        $user = storage()->getUserByResetToken($token);

        if (!$user || empty($user['reset_token_expiry'])) {
            http_response_code(400);
            return ['error' => 'Invalid or expired token'];
        }

        if (strtotime($user['reset_token_expiry']) < time()) {
            storage()->clearResetToken($user['id']);
            http_response_code(400);
            return ['error' => 'Token has expired'];
        }

        $hashedPassword = password_hash($password, PASSWORD_ALGO, ['cost' => PASSWORD_COST]);
        storage()->updatePassword($user['id'], $hashedPassword);
        storage()->clearResetToken($user['id']);

        error_log("[Password Reset] Password updated for {$user['email']}");

        return ['message' => 'Password has been reset successfully'];
    } catch (Exception $e) {
        error_log("[Password Reset] Error: " . $e->getMessage());
        http_response_code(500);
        return ['error' => $e->getMessage()];
    }
}

function safeUser($user) {
    if (!$user) return $user;
    unset($user['password']);
    unset($user['reset_token']);
    unset($user['reset_token_expiry']);
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

function safeUsers($users) {
    return array_map('safeUser', $users);
}
