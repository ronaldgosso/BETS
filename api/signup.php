<?php
require_once __DIR__ . '/../includes/functions.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

$data = json_decode(file_get_contents('php://input'), true);
if (!$data || empty($data['username']) || empty($data['email']) || empty($data['password'])) {
    jsonResponse(['error' => 'Username, email, and password are required'], 400);
}

$username = trim($data['username']);
$email = trim($data['email']);
$password = $data['password'];

if (strlen($username) < 3) {
    jsonResponse(['error' => 'Username must be at least 3 characters'], 400);
}

if (strlen($password) < 6) {
    jsonResponse(['error' => 'Password must be at least 6 characters'], 400);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    jsonResponse(['error' => 'Invalid email address'], 400);
}

$stmt = $pdo->prepare("SELECT id FROM users WHERE username = ? OR email = ?");
$stmt->execute([$username, $email]);
if ($stmt->fetch()) {
    jsonResponse(['error' => 'Username or email already exists'], 409);
}

$hashedPassword = hashPassword($password);
$stmt = $pdo->prepare("INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, 'user')");
$stmt->execute([$username, $email, $hashedPassword]);

jsonResponse([
    'success' => true,
    'message' => 'Account created successfully'
]);
