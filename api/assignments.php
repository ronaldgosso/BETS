<?php
require_once __DIR__ . '/../includes/functions.php';
requireAuth();
$currentUser = getCurrentUser();

$method = $_SERVER['REQUEST_METHOD'];
if (in_array($method, ['POST', 'PUT', 'DELETE'])) {
    verifyCsrfToken();
}

switch ($method) {
    case 'GET':
        setNoCacheHeaders();
        
        if (isset($_GET['project_id']) && is_numeric($_GET['project_id'])) {
            if ($currentUser['role'] !== 'admin') {
                jsonResponse(['error' => 'Access denied'], 403);
            }
            $stmt = $pdo->prepare("SELECT u.id, u.username, u.email FROM users u 
                                   JOIN user_projects up ON u.id = up.user_id 
                                   WHERE up.project_id = ?");
            $stmt->execute([$_GET['project_id']]);
            $users = $stmt->fetchAll();
            header('X-Debug-Type: project_assignments');
            header('X-Debug-Count: ' . count($users));
            jsonResponse($users);
        } else if (isset($_GET['user_id']) && is_numeric($_GET['user_id'])) {
            $requestedUserId = (int)$_GET['user_id'];
            if ($currentUser['role'] !== 'admin' && $requestedUserId !== $currentUser['id']) {
                jsonResponse(['error' => 'Access denied'], 403);
            }
            $checkStmt = $pdo->prepare("SELECT COUNT(*) FROM user_projects WHERE user_id = ?");
            $checkStmt->execute([$requestedUserId]);
            $userAssignments = $checkStmt->fetchColumn();
            
            $totalStmt = $pdo->query("SELECT COUNT(*) FROM user_projects");
            $totalAssignments = $totalStmt->fetchColumn();
            
            $stmt = $pdo->prepare("SELECT p.id, p.name, p.description FROM projects p 
                                   JOIN user_projects up ON p.id = up.project_id 
                                   WHERE up.user_id = ?");
            $stmt->execute([$requestedUserId]);
            $projects = $stmt->fetchAll();
            
            header('X-Debug-Projects-Count: ' . count($projects));
            header('X-Debug-Total-Assignments: ' . $totalAssignments);
            header('X-Debug-Current-User-Id: ' . $currentUser['id']);
            header('X-Debug-Requested-User-Id: ' . $requestedUserId);
            header('X-Debug-User-Assignments-Count: ' . $userAssignments);
            header('X-Debug-Type: user_projects');
            
            jsonResponse($projects);
        } else {
            if ($currentUser['role'] !== 'admin') {
                jsonResponse(['error' => 'Access denied'], 403);
            }
            $stmt = $pdo->query("SELECT up.*, u.username as user_name, p.name as project_name 
                                 FROM user_projects up 
                                 JOIN users u ON up.user_id = u.id 
                                 JOIN projects p ON up.project_id = p.id 
                                 ORDER BY p.name, u.username");
            jsonResponse($stmt->fetchAll());
        }
        break;

    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        if (!$data || empty($data['user_id']) || empty($data['project_id'])) {
            jsonResponse(['error' => 'user_id and project_id are required'], 400);
        }
        $stmt = $pdo->prepare("INSERT IGNORE INTO user_projects (user_id, project_id) VALUES (?, ?)");
        $stmt->execute([$data['user_id'], $data['project_id']]);
        jsonResponse(['success' => true], 201);
        break;

    case 'DELETE':
        if (empty($_GET['user_id']) || empty($_GET['project_id'])) {
            jsonResponse(['error' => 'user_id and project_id required'], 400);
        }
        $stmt = $pdo->prepare("DELETE FROM user_projects WHERE user_id = ? AND project_id = ?");
        $stmt->execute([$_GET['user_id'], $_GET['project_id']]);
        jsonResponse(['success' => true]);
        break;

    default:
        jsonResponse(['error' => 'Method not allowed'], 405);
}