<?php
require_once __DIR__ . '/../includes/functions.php';

// Prevent the browser from caching this API response
setNoCacheHeaders();

// Kick out unauthenticated requests immediately
requireAuth();

$user = getCurrentUser();
$data = [];

if ($user['role'] === 'admin') {

    // ── Admin dashboard stats ────────────────────────────────────────────────

    // Total registered users (any role)
    $data['total_users'] = $pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();

    // Total projects in the system
    $data['total_projects'] = $pdo->query("SELECT COUNT(*) FROM projects")->fetchColumn();

    // Number of time entries logged today (all users)
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM time_entries WHERE entry_date = CURDATE()");
    $stmt->execute();
    $data['entries_today'] = $stmt->fetchColumn();

    // Total work hours logged today across all users, formatted as HH:MM:SS
    $stmt = $pdo->prepare(
        "SELECT SEC_TO_TIME(SUM(TIME_TO_SEC(TIMEDIFF(end_time, start_time))))
         FROM time_entries WHERE entry_date = CURDATE()"
    );
    $stmt->execute();
    $data['total_hours_today'] = $stmt->fetchColumn() ?: '00:00:00';

    // Users who have NOT been assigned any project yet (need attention)
    $data['unassigned_users'] = $pdo->query(
        "SELECT COUNT(*) FROM users
         WHERE role = 'user'
         AND id NOT IN (SELECT DISTINCT user_id FROM user_projects)"
    )->fetchColumn();

    // Per-project hours summary (for the admin overview table)
    $data['project_summary'] = $pdo->query(
        "SELECT p.name AS project_name,
                COUNT(DISTINCT up.user_id) AS assigned_users,
                COUNT(te.id) AS total_entries,
                SEC_TO_TIME(COALESCE(SUM(TIME_TO_SEC(TIMEDIFF(te.end_time, te.start_time))), 0)) AS total_hours
         FROM projects p
         LEFT JOIN user_projects up ON p.id = up.project_id
         LEFT JOIN time_entries te  ON p.id = te.project_id
         GROUP BY p.id, p.name
         ORDER BY total_hours DESC
         LIMIT 5"
    )->fetchAll();

    // Most recent 10 time entries across all users
    $data['recent_entries'] = $pdo->query(
        "SELECT te.*, u.username, p.name AS project_name
         FROM time_entries te
         JOIN users u ON te.user_id = u.id
         LEFT JOIN projects p ON te.project_id = p.id
         ORDER BY te.created_at DESC
         LIMIT 10"
    )->fetchAll();

} else {

    // ── Regular-user dashboard stats ─────────────────────────────────────────

    // How many entries this user logged today
    $stmt = $pdo->prepare(
        "SELECT COUNT(*) FROM time_entries WHERE user_id = ? AND entry_date = CURDATE()"
    );
    $stmt->execute([$user['id']]);
    $data['entries_today'] = $stmt->fetchColumn();

    // Total hours worked today by this user
    $stmt = $pdo->prepare(
        "SELECT SEC_TO_TIME(SUM(TIME_TO_SEC(TIMEDIFF(end_time, start_time))))
         FROM time_entries WHERE user_id = ? AND entry_date = CURDATE()"
    );
    $stmt->execute([$user['id']]);
    $data['total_hours_today'] = $stmt->fetchColumn() ?: '00:00:00';

    // Total hours this user worked in the current week (Mon–Sun)
    $stmt = $pdo->prepare(
        "SELECT SEC_TO_TIME(SUM(TIME_TO_SEC(TIMEDIFF(end_time, start_time))))
         FROM time_entries
         WHERE user_id = ?
         AND YEARWEEK(entry_date, 1) = YEARWEEK(CURDATE(), 1)"
    );
    $stmt->execute([$user['id']]);
    $data['total_hours_week'] = $stmt->fetchColumn() ?: '00:00:00';

    // Number of projects assigned to this user
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM user_projects WHERE user_id = ?");
    $stmt->execute([$user['id']]);
    $data['assigned_projects'] = $stmt->fetchColumn();

    // The actual list of assigned projects (shown as cards on the user dashboard)
    $stmt = $pdo->prepare(
        "SELECT p.id, p.name, p.description,
                COUNT(te.id) AS my_entries
         FROM projects p
         JOIN user_projects up ON p.id = up.project_id
         LEFT JOIN time_entries te ON te.project_id = p.id AND te.user_id = ?
         WHERE up.user_id = ?
         GROUP BY p.id, p.name, p.description"
    );
    $stmt->execute([$user['id'], $user['id']]);
    $data['my_projects'] = $stmt->fetchAll();

    // Recent 8 entries for this user, with project name
    $stmt = $pdo->prepare(
        "SELECT te.*, p.name AS project_name
         FROM time_entries te
         LEFT JOIN projects p ON te.project_id = p.id
         WHERE te.user_id = ?
         ORDER BY te.entry_date DESC, te.start_time DESC
         LIMIT 8"
    );
    $stmt->execute([$user['id']]);
    $data['recent_entries'] = $stmt->fetchAll();
}

jsonResponse($data);