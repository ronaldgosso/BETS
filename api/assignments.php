<?php
require_once __DIR__ . '/../includes/functions.php';
requireAuth();
// Get the already-verified user from requireAuth()
$currentUser = getCurrentUser();

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        // SECURITY: Prevent caching of responses
        setNoCacheHeaders();
        
        // Get all project assignments or assignments for a specific project
        if (isset($_GET['project_id']) && is_numeric($_GET['project_id'])) {
            // SECURITY: Only admins can view assignments by project
            if ($currentUser['role'] !== 'admin') {
                jsonResponse(['error' => 'Access denied'], 403);
            }
            $stmt = $pdo->prepare("SELECT u.id, u.username, u.email FROM users u 
                                   JOIN user_projects up ON u.id = up.user_id 
                                   WHERE up.project_id = ?");
            $stmt->execute([$_GET['project_id']]);
        } else if (isset($_GET['user_id']) && is_numeric($_GET['user_id'])) {
            // SECURITY: Users can only see their own assignments
            $requestedUserId = (int)$_GET['user_id'];
            if ($currentUser['role'] !== 'admin' && $requestedUserId !== $currentUser['id']) {
                jsonResponse(['error' => 'Access denied'], 403);
            }
            // Check if user_projects table has any entries for debugging
            $checkStmt = $pdo->query("SELECT COUNT(*) FROM user_projects");
            $totalAssignments = $checkStmt->fetchColumn();
            
            $stmt = $pdo->prepare("SELECT p.id, p.name, p.description FROM projects p 
                                   JOIN user_projects up ON p.id = up.project_id 
                                   WHERE up.user_id = ?");
            $stmt->execute([$requestedUserId]);
            $projects = $stmt->fetchAll();
            
            // Debug headers
            header('X-Debug-Projects-Count: ' . count($projects));
            header('X-Debug-Total-Assignments: ' . $totalAssignments);
            header('X-Debug-Current-User-Id: ' . $currentUser['id']);
            header('X-Debug-Requested-User-Id: ' . $requestedUserId);
            
            jsonResponse($projects);
            break;
        } else {
            // SECURITY: Only admins can view all assignments
            if ($currentUser['role'] !== 'admin') {
                jsonResponse(['error' => 'Access denied'], 403);
            }
            $stmt = $pdo->query("SELECT up.*, u.username as user_name, p.name as project_name 
                                 FROM user_projects up 
                                 JOIN users u ON up.user_id = u.id 
                                 JOIN projects p ON up.project_id = p.id 
                                 ORDER BY p.name, u.username");
        }
        jsonResponse($stmt->fetchAll());
        break;

    case 'POST':
        // Assign project to user
        $data = json_decode(file_get_contents('php://input'), true);
        if (!$data || empty($data['user_id']) || empty($data['project_id'])) {
            jsonResponse(['error' => 'user_id and project_id are required'], 400);
        }
        $stmt = $pdo->prepare("INSERT IGNORE INTO user_projects (user_id, project_id) VALUES (?, ?)");
        $stmt->execute([$data['user_id'], $data['project_id']]);
        jsonResponse(['success' => true], 201);
        break;

    case 'DELETE':
        // Remove assignment
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

