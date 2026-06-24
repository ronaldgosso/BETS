<?php
require_once __DIR__ . '/config.php';

/**
 * Set secure session headers to prevent back-button access after logout.
 * Call this before any output to prevent caching of protected pages.
 */
function setNoCacheHeaders() {
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Cache-Control: post-check=0, pre-check=0', false);
    header('Pragma: no-cache');
    header('Expires: 0');
}

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
 * 
 * SECURITY: Validates session integrity and regenerates session ID periodically.
 */
function getCurrentUser() {
    global $pdo;
    if (!isset($_SESSION['user_id']) || !isset($_SESSION['last_activity'])) {
        return null;
    }
    
    // Check for session timeout (30 minutes)
    if (time() - $_SESSION['last_activity'] > 1800) {
        // Session expired - clear and return null
        unset($_SESSION['user_id']);
        unset($_SESSION['last_activity']);
        return null;
    }
    
    // Update last activity time for valid sessions
    $_SESSION['last_activity'] = time();
    
    $stmt = $pdo->prepare("SELECT id, username, email, role, profile_pic FROM users WHERE id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    return $stmt->fetch();
}

/**
 * Require that the current user is authenticated. Otherwise send 401.
 * Calls setNoCacheHeaders() to prevent browser caching of protected API responses.
 */
function requireAuth() {
    setNoCacheHeaders(); // SECURITY: Prevent API responses from being cached
    if (!getCurrentUser()) {
        jsonResponse(['error' => 'Authentication required'], 401);
    }
}

/**
 * Require a specific role. Checks after authentication.
 * Calls setNoCacheHeaders() to prevent browser caching of protected API responses.
 */
function requireRole($role) {
    setNoCacheHeaders(); // SECURITY: Prevent API responses from being cached
    $user = getCurrentUser();
    if (!$user || $user['role'] !== $role) {
        jsonResponse(['error' => 'Forbidden'], 403);
    }
}

/**
 * Generate a CSRF token and store it in the session.
 */
function generateCsrfToken() {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

/**
 * Verify the CSRF token from the X-CSRF-Token header against the session.
 */
function verifyCsrfToken() {
    $token = '';
    
    // Check $_SERVER first (works consistently across web servers)
    if (isset($_SERVER['HTTP_X_CSRF_TOKEN'])) {
        $token = $_SERVER['HTTP_X_CSRF_TOKEN'];
    } else {
        // Fallback to getallheaders
        if (function_exists('getallheaders')) {
            $headers = getallheaders();
            foreach ($headers as $name => $value) {
                if (strtolower($name) === 'x-csrf-token') {
                    $token = $value;
                    break;
                }
            }
        }
    }
    
    if (empty($_SESSION['csrf_token']) || empty($token) || !hash_equals($_SESSION['csrf_token'], $token)) {
        jsonResponse(['error' => 'Invalid CSRF token'], 403);
    }
}