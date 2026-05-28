<?php
require_once __DIR__ . '/../includes/functions.php';

// SECURITY: Prevent caching of login responses
setNoCacheHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

$data = json_decode(file_get_contents('php://input'), true);
if (!$data || empty($data['username']) || empty($data['password'])) {
    jsonResponse(['error' => 'Username and password are required'], 400);
}

$stmt = $pdo->prepare("SELECT id, username, password, role FROM users WHERE username = ?");
$stmt->execute([$data['username']]);
$user = $stmt->fetch();

if (!$user || !verifyPassword($data['password'], $user['password'])) {
    jsonResponse(['error' => 'Invalid credentials'], 401);
}

// SECURITY: Regenerate session ID to prevent session fixation attacks
session_regenerate_id(true);

// SECURITY: Set session data with activity timestamp
$_SESSION['user_id'] = $user['id'];
$_SESSION['last_activity'] = time();
$_SESSION['user_role'] = $user['role'];

// Debug: Log session info
header('X-Debug-Session-Id: ' . session_id());
header('X-Debug-User-Id: ' . $user['id']);
header('X-Debug-Auth: success');

jsonResponse([
    'success' => true,
    'user' => [
        'id' => $user['id'],
        'username' => $user['username'],
        'role' => $user['role']
    ]
]);