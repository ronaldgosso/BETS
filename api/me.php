<?php
require_once __DIR__ . '/../includes/functions.php';

$user = getCurrentUser();
if (!$user) {
    jsonResponse(['error' => 'Not authenticated'], 401);
}
jsonResponse(['user' => $user]);