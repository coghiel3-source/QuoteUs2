<?php

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../database.php';
require_once __DIR__ . '/../storage.php';

require_once __DIR__ . '/auth.php';

function handleUserRoutes($method, $path, $body) {
    if ($method === 'POST' && $path === '/api/users') {
        return handleCreateUser($body);
    }

    if ($method === 'GET' && $path === '/api/users') {
        return handleGetAllUsers();
    }

    if ($method === 'GET' && preg_match('#^/api/users/([^/]+)$#', $path, $matches)) {
        return handleGetUser($matches[1]);
    }

    if ($method === 'PATCH' && preg_match('#^/api/users/([^/]+)$#', $path, $matches)) {
        return handleUpdateUser($matches[1], $body);
    }

    return null;
}

function handleCreateUser($body) {
    try {
        $required = ['name', 'email'];
        foreach ($required as $field) {
            if (empty($body[$field])) {
                http_response_code(400);
                return ['error' => "Validation error", 'details' => ["$field is required"]];
            }
        }

        if (!filter_var($body['email'], FILTER_VALIDATE_EMAIL)) {
            http_response_code(400);
            return ['error' => 'Validation error', 'details' => ['Invalid email format']];
        }

        if (!empty($body['role']) && !in_array($body['role'], USER_ROLES)) {
            http_response_code(400);
            return ['error' => 'Validation error', 'details' => ['Invalid role']];
        }

        if (!empty($body['password'])) {
            $body['password'] = password_hash($body['password'], PASSWORD_ALGO, ['cost' => PASSWORD_COST]);
        }

        $user = storage()->createUser($body);
        http_response_code(201);
        return safeUser($user);
    } catch (Exception $e) {
        if (strpos($e->getMessage(), 'Duplicate entry') !== false || strpos($e->getMessage(), 'unique') !== false) {
            $existing = storage()->getUserByEmail($body['email']);
            if ($existing) {
                return safeUser($existing);
            }
        }
        http_response_code(500);
        return ['error' => $e->getMessage()];
    }
}

function handleGetAllUsers() {
    try {
        $users = storage()->getAllUsers();
        return safeUsers($users);
    } catch (Exception $e) {
        http_response_code(500);
        return ['error' => $e->getMessage()];
    }
}

function handleGetUser($id) {
    try {
        $user = storage()->getUser($id);
        if (!$user) {
            http_response_code(404);
            return ['error' => 'User not found'];
        }
        return safeUser($user);
    } catch (Exception $e) {
        http_response_code(500);
        return ['error' => $e->getMessage()];
    }
}

function handleUpdateUser($id, $body) {
    try {
        $actorId = $body['actorId'] ?? null;
        unset($body['actorId']);

        if (!$actorId) {
            http_response_code(401);
            return ['error' => 'Actor ID is required for authentication'];
        }

        $actor = storage()->getUser($actorId);
        if (!$actor || ($actor['role'] !== 'admin' && $actor['role'] !== 'manager')) {
            http_response_code(403);
            return ['error' => 'Only admin/manager can update users'];
        }

        if ($actor['role'] === 'manager') {
            $hasPermission = checkPermission($actorId, 'manageBrokers');
            if (!$hasPermission) {
                http_response_code(403);
                return ['error' => "You don't have permission to manage brokers"];
            }
        }

        if (!empty($body['password'])) {
            $body['password'] = password_hash($body['password'], PASSWORD_ALGO, ['cost' => PASSWORD_COST]);
        }

        $user = storage()->updateUser($id, $body);
        if (!$user) {
            http_response_code(404);
            return ['error' => 'User not found'];
        }
        return safeUser($user);
    } catch (Exception $e) {
        http_response_code(500);
        return ['error' => $e->getMessage()];
    }
}

function checkPermission($userId, $permission) {
    $user = storage()->getUser($userId);
    if (!$user) return false;
    if ($user['role'] === 'admin') return true;
    if ($user['role'] === 'manager') {
        $userPermissions = $user['permissions'] ?? null;
        if (is_string($userPermissions)) {
            $userPermissions = json_decode($userPermissions, true);
        }
        if ($userPermissions && is_array($userPermissions)) {
            return !empty($userPermissions[$permission]);
        }
        $globalPermissions = getManagerPermissions();
        return !empty($globalPermissions[$permission]);
    }
    return false;
}

function getManagerPermissions() {
    $settingValue = storage()->getSetting('manager_permissions');
    if (!$settingValue) {
        return [
            'manageBrokers' => false,
            'assignLeads' => false,
            'editLeadCosts' => false,
            'adjustBalances' => false,
            'viewSettings' => false,
        ];
    }
    $decoded = json_decode($settingValue, true);
    return is_array($decoded) ? $decoded : [
        'manageBrokers' => false,
        'assignLeads' => false,
        'editLeadCosts' => false,
        'adjustBalances' => false,
        'viewSettings' => false,
    ];
}
