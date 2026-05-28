<?php
require_once __DIR__ . '/../includes/functions.php';

// SECURITY: Prevent caching of dashboard data
setNoCacheHeaders();

requireAuth();

$user = getCurrentUser();
$data = [];

if ($user['role'] === 'admin') {
    // Admin dashboard stats
    $data['total_users'] = $pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();
    
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM time_entries WHERE entry_date = CURDATE()");
    $stmt->execute();
    $data['entries_today'] = $stmt->fetchColumn();
    
    $stmt = $pdo->prepare("SELECT SEC_TO_TIME(SUM(TIME_TO_SEC(TIMEDIFF(end_time, start_time)))) AS total_hours 
                           FROM time_entries WHERE entry_date = CURDATE()");
    $stmt->execute();
    $data['total_hours_today'] = $stmt->fetchColumn() ?: '00:00:00';
    
    // Recent 5 entries
    $data['recent_entries'] = $pdo->query(
        "SELECT te.*, u.username FROM time_entries te 
         JOIN users u ON te.user_id = u.id 
         ORDER BY te.created_at DESC LIMIT 5"
    )->fetchAll();
} else {
    // User dashboard stats
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM time_entries WHERE user_id = ? AND entry_date = CURDATE()");
    $stmt->execute([$user['id']]);
    $data['entries_today'] = $stmt->fetchColumn();
    
    $stmt = $pdo->prepare("SELECT SEC_TO_TIME(SUM(TIME_TO_SEC(TIMEDIFF(end_time, start_time)))) 
                           FROM time_entries WHERE user_id = ? AND entry_date = CURDATE()");
    $stmt->execute([$user['id']]);
    $data['total_hours_today'] = $stmt->fetchColumn() ?: '00:00:00';
    
    $stmt = $pdo->prepare("SELECT * FROM time_entries WHERE user_id = ? ORDER BY created_at DESC LIMIT 5");
    $stmt->execute([$user['id']]);
    $data['recent_entries'] = $stmt->fetchAll();
}

jsonResponse($data);