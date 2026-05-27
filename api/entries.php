<?php
require_once __DIR__ . '/../includes/functions.php';
requireAuth();

$user = getCurrentUser();
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        // List entries: admin sees all, user sees own
        if ($user['role'] === 'admin') {
            if (isset($_GET['user_id']) && is_numeric($_GET['user_id'])) {
                $stmt = $pdo->prepare("SELECT te.*, u.username FROM time_entries te 
                                        JOIN users u ON te.user_id = u.id 
                                        LEFT JOIN projects p ON te.project_id = p.id
                                        WHERE te.user_id = ? ORDER BY te.entry_date DESC, te.start_time DESC");
                $stmt->execute([$_GET['user_id']]);
            } else {
                $stmt = $pdo->query("SELECT te.*, u.username FROM time_entries te 
                                     JOIN users u ON te.user_id = u.id 
                                     LEFT JOIN projects p ON te.project_id = p.id
                                     ORDER BY te.entry_date DESC, te.start_time DESC");
            }
        } else {
            $stmt = $pdo->prepare("SELECT te.* FROM time_entries te 
                                    LEFT JOIN projects p ON te.project_id = p.id
                                    WHERE te.user_id = ? 
                                    ORDER BY te.entry_date DESC, te.start_time DESC");
            $stmt->execute([$user['id']]);
        }
        $entries = $stmt->fetchAll();
        jsonResponse($entries);
        break;

    case 'POST':
        // Create new entry (user creates for themselves)
        $data = json_decode(file_get_contents('php://input'), true);
        if (!$data || empty($data['entry_date']) || empty($data['start_time']) || empty($data['end_time'])) {
            jsonResponse(['error' => 'Required fields: entry_date, start_time, end_time (and project_id or project_name)'], 400);
        }
        
        $projectName = $data['project_name'] ?? '';
        if (!empty($data['project_id'])) {
            $stmt = $pdo->prepare("SELECT name FROM projects WHERE id = ?");
            $stmt->execute([$data['project_id']]);
            $project = $stmt->fetch();
            if ($project) {
                $projectName = $project['name'];
            }
        }
        
        $stmt = $pdo->prepare("INSERT INTO time_entries (user_id, project_id, project_name, task_description, entry_date, start_time, end_time) 
                               VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $user['id'],
            $data['project_id'] ?? null,
            $projectName,
            $data['task_description'] ?? '',
            $data['entry_date'],
            $data['start_time'],
            $data['end_time']
        ]);
        $newId = $pdo->lastInsertId();
        jsonResponse(['success' => true, 'id' => $newId], 201);
        break;

    case 'PUT':
        // Update an entry: admin can update any, user can update own
        if (empty($_GET['id'])) {
            jsonResponse(['error' => 'Entry ID required'], 400);
        }
        $entryId = $_GET['id'];
        
        // Fetch entry to check ownership or admin
        $stmt = $pdo->prepare("SELECT * FROM time_entries WHERE id = ?");
        $stmt->execute([$entryId]);
        $entry = $stmt->fetch();
        if (!$entry) {
            jsonResponse(['error' => 'Entry not found'], 404);
        }
        if ($user['role'] !== 'admin' && $entry['user_id'] != $user['id']) {
            jsonResponse(['error' => 'Forbidden'], 403);
        }
        
        $data = json_decode(file_get_contents('php://input'), true);
        if (!$data) {
            jsonResponse(['error' => 'Invalid JSON'], 400);
        }
        
        $update = [];
        $params = [];
        if (isset($data['project_id'])) {
            $update[] = "project_id = ?";
            $params[] = $data['project_id'];
            $stmt = $pdo->prepare("SELECT name FROM projects WHERE id = ?");
            $stmt->execute([$data['project_id']]);
            $project = $stmt->fetch();
            if ($project) {
                $update[] = "project_name = ?";
                $params[] = $project['name'];
            }
        }
        foreach (['project_name', 'task_description', 'entry_date', 'start_time', 'end_time'] as $field) {
            if (isset($data[$field])) {
                $update[] = "$field = ?";
                $params[] = $data[$field];
            }
        }
        if (empty($update)) {
            jsonResponse(['error' => 'No fields to update'], 400);
        }
        $params[] = $entryId;
        $stmt = $pdo->prepare("UPDATE time_entries SET " . implode(', ', $update) . " WHERE id = ?");
        $stmt->execute($params);
        jsonResponse(['success' => true]);
        break;

    case 'DELETE':
        if (empty($_GET['id'])) {
            jsonResponse(['error' => 'Entry ID required'], 400);
        }
        $entryId = $_GET['id'];
        $stmt = $pdo->prepare("SELECT * FROM time_entries WHERE id = ?");
        $stmt->execute([$entryId]);
        $entry = $stmt->fetch();
        if (!$entry) {
            jsonResponse(['error' => 'Entry not found'], 404);
        }
        if ($user['role'] !== 'admin' && $entry['user_id'] != $user['id']) {
            jsonResponse(['error' => 'Forbidden'], 403);
        }
        $stmt = $pdo->prepare("DELETE FROM time_entries WHERE id = ?");
        $stmt->execute([$entryId]);
        jsonResponse(['success' => true]);
        break;

    default:
        jsonResponse(['error' => 'Method not allowed'], 405);
}