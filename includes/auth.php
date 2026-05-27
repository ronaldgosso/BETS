<?php
// This file is a simple wrapper that uses functions.php to check auth.
// It's used as a middleware include in API endpoints.
require_once __DIR__ . '/functions.php';
requireAuth();