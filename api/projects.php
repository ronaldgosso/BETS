<?php
require_once __DIR__ . '/../includes/functions.php';
requireAuth();
requireRole('admin');

$method = $_SERVER['REQUEST_METHOD'];
if (in_array($method, ['POST', 'PUT', 'DELETE'])) {
    verifyCsrfToken();
}

switch ($method) {
    case 'GET':
        if (isset($_GET['id']) && is_numeric($_GET['id'])) {
            $stmt = $pdo->prepare("SELECT * FROM projects WHERE id = ?");
            $stmt->execute([$_GET['id']]);
            $project = $stmt->fetch();
            if (!$project) {
                jsonResponse(['error' => 'Project not found'], 404);
            }
            jsonResponse($project);
        } else {
            $projects = $pdo->query("SELECT p.*, COUNT(up.user_id) as assigned_users FROM projects p LEFT JOIN user_projects up ON p.id = up.project_id GROUP BY p.id ORDER BY p.created_at DESC")->fetchAll();
            jsonResponse($projects);
        }
        break;

    case 'POST':
        $rawInput = file_get_contents('php://input');
        error_log("Raw input: $rawInput");
        
        $data = json_decode($rawInput, true);
        error_log("Parsed data: " . json_encode($data));
        
        if (!$data || empty($data['name'])) {
            jsonResponse(['error' => 'Project name is required'], 400);
        }
        $stmt = $pdo->prepare("INSERT INTO projects (name, description) VALUES (?, ?)");
        $stmt->execute([$data['name'], $data['description'] ?? '']);
        $projectId = $pdo->lastInsertId();
        
        error_log("Project created: ID=$projectId, name={$data['name']}, user_ids received: " . json_encode($data['user_ids'] ?? 'none'));
        
        if (!empty($data['user_ids']) && is_array($data['user_ids'])) {
            foreach ($data['user_ids'] as $userId) {
                $stmt = $pdo->prepare("INSERT IGNORE INTO user_projects (user_id, project_id) VALUES (?, ?)");
                $stmt->execute([$userId, $projectId]);
            }
        }
        
        $checkStmt = $pdo->prepare("SELECT COUNT(*) FROM user_projects WHERE project_id = ?");
        $checkStmt->execute([$projectId]);
        error_log("Assignments for project $projectId: " . $checkStmt->fetchColumn());
        
        jsonResponse(['success' => true, 'id' => $projectId], 201);
        break;

    case 'PUT':
        if (empty($_GET['id'])) {
            jsonResponse(['error' => 'Project ID required'], 400);
        }
        $projectId = $_GET['id'];
        $stmt = $pdo->prepare("SELECT id FROM projects WHERE id = ?");
        $stmt->execute([$projectId]);
        if (!$stmt->fetch()) {
            jsonResponse(['error' => 'Project not found'], 404);
        }
        $data = json_decode(file_get_contents('php://input'), true);
        if (!$data) {
            jsonResponse(['error' => 'Invalid JSON'], 400);
        }
        $updates = [];
        $params = [];
        if (isset($data['name'])) {
            $updates[] = "name = ?";
            $params[] = $data['name'];
        }
        if (isset($data['description'])) {
            $updates[] = "description = ?";
            $params[] = $data['description'];
        }
        if (!empty($updates)) {
            $params[] = $projectId;
            $stmt = $pdo->prepare("UPDATE projects SET " . implode(', ', $updates) . " WHERE id = ?");
            $stmt->execute($params);
        }
        
        if (isset($data['user_ids'])) {
            $stmt = $pdo->prepare("DELETE FROM user_projects WHERE project_id = ?");
            $stmt->execute([$projectId]);
            if (!empty($data['user_ids'])) {
                foreach ($data['user_ids'] as $userId) {
                    $stmt = $pdo->prepare("INSERT IGNORE INTO user_projects (user_id, project_id) VALUES (?, ?)");
                    $stmt->execute([$userId, $projectId]);
                }
            }
        }
        
        jsonResponse(['success' => true]);
        break;

    case 'DELETE':
        if (empty($_GET['id'])) {
            jsonResponse(['error' => 'Project ID required'], 400);
        }
        $stmt = $pdo->prepare("DELETE FROM projects WHERE id = ?");
        $stmt->execute([$_GET['id']]);
        jsonResponse(['success' => true]);
        break;

    default:
        jsonResponse(['error' => 'Method not allowed'], 405);
}