<?php
require_once __DIR__ . '/config.php';

/**
 * Send a JSON response and terminate.
 */
function jsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

/**
 * Hash a password using bcrypt.
 */
function hashPassword($password) {
    return password_hash($password, PASSWORD_BCRYPT);
}

/**
 * Verify a password against a hash.
 */
function verifyPassword($password, $hash) {
    return password_verify($password, $hash);
}

/**
 * Get the currently authenticated user from session.
 * Returns user array or null.
 */
function getCurrentUser() {
    global $pdo;
    if (!isset($_SESSION['user_id'])) {
        return null;
    }
    $stmt = $pdo->prepare("SELECT id, username, email, role FROM users WHERE id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    return $stmt->fetch();
}

/**
 * Require that the current user is authenticated. Otherwise send 401.
 */
function requireAuth() {
    if (!getCurrentUser()) {
        jsonResponse(['error' => 'Authentication required'], 401);
    }
}

/**
 * Require a specific role. Checks after authentication.
 */
function requireRole($role) {
    $user = getCurrentUser();
    if (!$user || $user['role'] !== $role) {
        jsonResponse(['error' => 'Forbidden'], 403);
    }
}