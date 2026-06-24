<?php
require_once __DIR__ . '/../includes/functions.php';

setNoCacheHeaders();
requireAuth();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

verifyCsrfToken();

$user = getCurrentUser();
$response = ['success' => true];
$updates = [];
$params = [];

if (isset($_POST['username']) && !empty(trim($_POST['username']))) {
    $newUsername = trim($_POST['username']);
    if (strlen($newUsername) < 3) {
        jsonResponse(['error' => 'Username must be at least 3 characters'], 400);
    }
    $stmt = $pdo->prepare("SELECT id FROM users WHERE username = ? AND id != ?");
    $stmt->execute([$newUsername, $user['id']]);
    if ($stmt->fetch()) {
        jsonResponse(['error' => 'Username already taken'], 409);
    }
    $updates[] = "username = ?";
    $params[] = $newUsername;
    $response['username'] = $newUsername;
}

if (isset($_FILES['profile_pic']) && $_FILES['profile_pic']['error'] === UPLOAD_ERR_OK) {
    $file = $_FILES['profile_pic'];
    if ($file['size'] > 2 * 1024 * 1024) {
        jsonResponse(['error' => 'File too large. Maximum size is 2MB.'], 400);
    }
    
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);
    
    if (!in_array($mimeType, ['image/jpeg', 'image/png', 'image/webp'])) {
        jsonResponse(['error' => 'Invalid file type. Only JPG, PNG, and WebP are allowed.'], 400);
    }
    
    $uploadDir = __DIR__ . '/../uploads/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
        file_put_contents($uploadDir . '.htaccess', "Options -Indexes\n<FilesMatch \"\.(php|phtml|php3|php4|php5|pl|py|jsp|asp|html|htm|shtml|sh|cgi)$\">\n    Require all denied\n</FilesMatch>");
    }
    
    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if (!in_array($ext, ['jpg', 'jpeg', 'png', 'webp'])) $ext = 'jpg';
    
    $filename = 'profile_' . $user['id'] . '_' . time() . '.' . $ext;
    $targetPath = $uploadDir . $filename;
    
    if (move_uploaded_file($file['tmp_name'], $targetPath)) {
        $updates[] = "profile_pic = ?";
        $picUrl = 'uploads/' . $filename;
        $params[] = $picUrl;
        $response['profile_pic'] = $picUrl;
    } else {
        jsonResponse(['error' => 'Failed to save uploaded file.'], 500);
    }
}

if (!empty($updates)) {
    $params[] = $user['id'];
    $stmt = $pdo->prepare("UPDATE users SET " . implode(', ', $updates) . " WHERE id = ?");
    $stmt->execute($params);
}

jsonResponse($response);
