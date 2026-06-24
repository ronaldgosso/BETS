<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="BETS – Best Employee Tracking System. Log time entries, manage projects and monitor team productivity.">
    <!-- SECURITY: Prevent browser caching of this page to stop back-button access after logout -->
    <meta http-equiv="Cache-Control" content="no-store, no-cache, must-revalidate">
    <meta http-equiv="Pragma" content="no-cache">
    <meta http-equiv="Expires" content="0">
    <title>BETS – Best Employee Tracking System</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="icon" type="image/svg+xml" href="favicon.svg">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.min.css">
    <link rel="stylesheet" href="assets/css/style.css?v=7">
</head>
<body>
    <div id="app">
        <!-- Mobile Menu Toggle -->
        <button id="mobile-menu-toggle" aria-label="Toggle menu">
            <i class="bi bi-list"></i>
        </button>
        <div id="mobile-overlay"></div>

        <!-- Main content will be dynamically injected here by app.js -->
        <main id="main-content" class="w-100"></main>
    </div>

    <!-- Toast container for notifications -->
    <div id="toast-container" class="position-fixed bottom-0 end-0 p-3" style="z-index: 9999;"></div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="assets/js/app.js?v=7"></script>
</body>
</html>
