<?php
require_once __DIR__ . '/../includes/functions.php';
requireAuth();
requireRole('admin'); // Only admins can access this endpoint

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        if (isset($_GET['id']) && is_numeric($_GET['id'])) {
            $stmt = $pdo->prepare("SELECT id, username, email, role, created_at FROM users WHERE id = ?");
            $stmt->execute([$_GET['id']]);
            $user = $stmt->fetch();
            if (!$user) {
                jsonResponse(['error' => 'User not found'], 404);
            }
            jsonResponse($user);
        } else {
            $users = $pdo->query("SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC")->fetchAll();
            jsonResponse($users);
        }
        break;

    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        if (!$data || empty($data['username']) || empty($data['email']) || empty($data['password'])) {
            jsonResponse(['error' => 'Username, email, and password are required'], 400);
        }
        // Check uniqueness
        $stmt = $pdo->prepare("SELECT id FROM users WHERE username = ? OR email = ?");
        $stmt->execute([$data['username'], $data['email']]);
        if ($stmt->fetch()) {
            jsonResponse(['error' => 'Username or email already exists'], 409);
        }
        
        $hashed = hashPassword($data['password']);
        $role = isset($data['role']) && $data['role'] === 'admin' ? 'admin' : 'user';
        $stmt = $pdo->prepare("INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)");
        $stmt->execute([$data['username'], $data['email'], $hashed, $role]);
        jsonResponse(['success' => true, 'id' => $pdo->lastInsertId()], 201);
        break;

    case 'PUT':
        if (empty($_GET['id'])) {
            jsonResponse(['error' => 'User ID required'], 400);
        }
        $userId = $_GET['id'];
        $stmt = $pdo->prepare("SELECT id FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        if (!$stmt->fetch()) {
            jsonResponse(['error' => 'User not found'], 404);
        }
        
        $data = json_decode(file_get_contents('php://input'), true);
        if (!$data) {
            jsonResponse(['error' => 'Invalid JSON'], 400);
        }
        
        $updates = [];
        $params = [];
        if (isset($data['username'])) {
            // Check uniqueness excluding current user
            $chk = $pdo->prepare("SELECT id FROM users WHERE username = ? AND id != ?");
            $chk->execute([$data['username'], $userId]);
            if ($chk->fetch()) {
                jsonResponse(['error' => 'Username already taken'], 409);
            }
            $updates[] = "username = ?";
            $params[] = $data['username'];
        }
        if (isset($data['email'])) {
            $chk = $pdo->prepare("SELECT id FROM users WHERE email = ? AND id != ?");
            $chk->execute([$data['email'], $userId]);
            if ($chk->fetch()) {
                jsonResponse(['error' => 'Email already taken'], 409);
            }
            $updates[] = "email = ?";
            $params[] = $data['email'];
        }
        if (isset($data['password']) && !empty($data['password'])) {
            $updates[] = "password = ?";
            $params[] = hashPassword($data['password']);
        }
        if (isset($data['role']) && in_array($data['role'], ['admin', 'user'])) {
            $updates[] = "role = ?";
            $params[] = $data['role'];
        }
        if (empty($updates)) {
            jsonResponse(['error' => 'No fields to update'], 400);
        }
        $params[] = $userId;
        $stmt = $pdo->prepare("UPDATE users SET " . implode(', ', $updates) . " WHERE id = ?");
        $stmt->execute($params);
        jsonResponse(['success' => true]);
        break;

    case 'DELETE':
        if (empty($_GET['id'])) {
            jsonResponse(['error' => 'User ID required'], 400);
        }
        $userId = $_GET['id'];
        // Prevent deleting the last admin
        $adminCount = $pdo->query("SELECT COUNT(*) FROM users WHERE role = 'admin'")->fetchColumn();
        $stmt = $pdo->prepare("SELECT role FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $userToDelete = $stmt->fetch();
        if ($userToDelete && $userToDelete['role'] === 'admin' && $adminCount <= 1) {
            jsonResponse(['error' => 'Cannot delete the last admin account'], 400);
        }
        $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        if ($stmt->rowCount() === 0) {
            jsonResponse(['error' => 'User not found'], 404);
        }
        jsonResponse(['success' => true]);
        break;

    default:
        jsonResponse(['error' => 'Method not allowed'], 405);
}
