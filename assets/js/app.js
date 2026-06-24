// ──────────────────────────────────────────────────────────────────────────────
// BETS – Single-Page Application (SPA)
//
// Architecture: Hash-based router (#login, #dashboard, #entries, …).
// All HTML is built in JS and injected into #main-content.
// API calls go through apiCall() which handles auth errors centrally.
// Toasts replace all alert() / confirm() feedback.
//
// Roles:
//   admin – can manage Users, Projects and Assignments; reads all time entries.
//   user  – can only log time entries for projects assigned by an admin.
// ──────────────────────────────────────────────────────────────────────────────

const API_BASE = 'api/';
let currentUser = null; // Populated after every authenticated route change
let csrfToken = null;
let currentAdminTimeframe = 'all';

// Apply initial theme immediately to prevent flash
window.getInitialTheme = function() {
    const saved = localStorage.getItem('theme');
    if (saved) return saved;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
};
window.applyTheme = function(theme) {
    if (theme === 'light') document.documentElement.setAttribute('data-theme', 'light');
    else document.documentElement.removeAttribute('data-theme');
};
applyTheme(getInitialTheme());


// ══════════════════════════════════════════════════════════════════════════════
// ROUTER
// ══════════════════════════════════════════════════════════════════════════════

async function route() {
    const hash = location.hash.slice(1) || 'login';
    const main = document.getElementById('main-content');
    main.innerHTML = ''; // Clear previous page content

    // Every protected page must verify the session first.
    // If the server says the user is not authenticated, redirect to login.
    try {
        if (hash !== 'login' && hash !== 'signup') {
            currentUser = await fetchUser();
            if (!currentUser) { location.hash = '#login'; return; }
        }
    } catch (e) {
        location.hash = '#login';
        return;
    }

    // Toggle the special animated background used on auth pages
    const isAuth = hash === 'login' || hash === 'signup';
    document.body.classList.toggle('auth-page', isAuth);
    
    // Hide mobile menu toggle on auth pages
    const mobileBtn = document.getElementById('mobile-menu-toggle');
    if (mobileBtn) mobileBtn.style.display = isAuth ? 'none' : '';

    // Rebuild the sidebar on every navigation so role-based links are always fresh.
    // The old #sidebar element is removed completely before re-rendering.
    document.querySelectorAll('#sidebar').forEach(el => el.remove());
    if (currentUser && hash !== 'login' && hash !== 'signup') {
        renderSidebar();
        updateActiveNav(hash);
    }

    // Dispatch to the correct page renderer
    switch (hash) {
        case 'login':              renderLogin();                                                      break;
        case 'signup':             renderSignup();                                                     break;
        case 'dashboard':          renderDashboard();                                                  break;
        case 'entries':            renderEntries();                                                    break;
        case 'admin/projects':
            if (currentUser?.role !== 'admin') { location.hash = '#dashboard'; return; }
            renderAdminProjects();
            break;
        case 'admin/users':
            if (currentUser?.role !== 'admin') { location.hash = '#dashboard'; return; }
            renderAdminUsers();
            break;
        case 'admin/assignments':
            if (currentUser?.role !== 'admin') { location.hash = '#dashboard'; return; }
            renderAdminAssignments();
            break;
        case 'settings':
            renderSettings();
            break;
        default:
            location.hash = '#login';
    }
}

window.addEventListener('hashchange', route);
window.addEventListener('load', route);


// ══════════════════════════════════════════════════════════════════════════════
// API HELPER
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Central fetch wrapper.
 * – Automatically sets Content-Type and includes cookies (credentials: 'include').
 * – Redirects to #login on 401 (session expired).
 * – Shows a toast on 403 (forbidden).
 * – Throws a typed Error with the server's message for all other failures.
 */
async function apiCall(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include' // Send session cookie with every request
    };
    if (csrfToken && ['POST', 'PUT', 'DELETE'].includes(method.toUpperCase())) {
        options.headers['X-CSRF-Token'] = csrfToken;
    }
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(API_BASE + endpoint, options);

    if (res.status === 401) {
        currentUser = null;
        location.hash = '#login';
        throw new Error('Session expired. Please log in again.');
    }
    if (res.status === 403) {
        showToast('You do not have permission to do that.', 'error');
        throw new Error('Forbidden');
    }
    if (!res.ok) {
        // Try to parse the server's JSON error message; fall back to HTTP status
        let err;
        try { err = await res.json(); } catch { throw new Error(`Request failed (${res.status})`); }
        throw new Error(err.error || 'Request failed');
    }
    return res.json();
}

/** Fetches the current user from /api/me.php. Returns null if not logged in. */
async function fetchUser() {
    try {
        const data = await apiCall('me.php');
        if (data.csrf_token) csrfToken = data.csrf_token;
        return data.user;
    } catch (e) {
        return null;
    }
}


// ══════════════════════════════════════════════════════════════════════════════
// TOAST NOTIFICATIONS
// Replaces browser alert()/confirm() with non-blocking slide-in toasts.
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Display a toast notification.
 * @param {string} message  – Main body text
 * @param {'success'|'error'|'info'} type – Controls icon and colour
 * @param {string|null} title – Optional override for the bold heading
 */
function showToast(message, type = 'success', title = null) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const icons  = { success: 'bi-check-circle-fill', error: 'bi-x-circle-fill', info: 'bi-info-circle-fill' };
    const titles = { success: 'Done',                 error: 'Error',            info: 'Info'               };

    const toast = document.createElement('div');
    toast.className = `bets-toast toast-${type}`;
    toast.innerHTML = `
        <div class="bets-toast-icon"><i class="bi ${icons[type] || icons.info}"></i></div>
        <div class="bets-toast-body">
            <div class="bets-toast-title">${title ?? titles[type]}</div>
            <div class="bets-toast-message">${message}</div>
        </div>
    `;
    container.appendChild(toast);

    // Auto-dismiss after 3.8 s with a CSS exit animation
    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => toast.remove(), 350);
    }, 3800);
}


// ══════════════════════════════════════════════════════════════════════════════
// SKELETON LOADERS
// Shown immediately while API data is being fetched so the page never looks blank.
// ══════════════════════════════════════════════════════════════════════════════

/** Returns n skeleton stat-card placeholders (for the stats row). */
function skeletonStats(n = 3) {
    return Array.from({ length: n }, () =>
        `<div class="col-md-3"><div class="skeleton skeleton-stat"></div></div>`
    ).join('');
}

/** Returns n skeleton row placeholders (for table/list areas). */
function skeletonRows(n = 5) {
    return Array.from({ length: n }, () =>
        `<div class="skeleton skeleton-row"></div>`
    ).join('');
}


// ══════════════════════════════════════════════════════════════════════════════
// SIDEBAR NAVIGATION
// ══════════════════════════════════════════════════════════════════════════════

function renderSidebar() {
    let avatarHtml;
    if (currentUser.profile_pic) {
        avatarHtml = `<img src="${currentUser.profile_pic}" alt="Profile" style="width: 100%; height: 100%; object-fit: cover;">`;
    } else {
        avatarHtml = (currentUser.username || '?').slice(0, 2).toUpperCase();
    }

    const sidebarEl = document.createElement('div');
    sidebarEl.id = 'sidebar';

    // Admin sees extra management links; regular users only see their own pages
    const adminLinks = currentUser.role === 'admin' ? `
        <li class="sidebar-section-label">Administration</li>
        <li>
            <a href="#admin/projects" class="nav-link" data-page="admin/projects">
                <i class="bi bi-folder-fill"></i> Projects
            </a>
        </li>
        <li>
            <a href="#admin/users" class="nav-link" data-page="admin/users">
                <i class="bi bi-people-fill"></i> Users
            </a>
        </li>
        <li>
            <a href="#admin/assignments" class="nav-link" data-page="admin/assignments">
                <i class="bi bi-diagram-3-fill"></i> Assignments
            </a>
        </li>` : '';

    sidebarEl.innerHTML = `
        <div class="sidebar-content">
            <a href="#dashboard" class="sidebar-brand">
                <div class="sidebar-brand-icon"><i class="bi bi-lightning-charge-fill"></i></div>
                <div>
                    <div class="sidebar-brand-text">BETS</div>
                    <div class="sidebar-brand-sub">Tracking System</div>
                </div>
            </a>

            <ul class="sidebar-nav">
                <li class="sidebar-section-label">Menu</li>
                <li>
                    <a href="#dashboard" class="nav-link" data-page="dashboard">
                        <i class="bi bi-grid-fill"></i> Dashboard
                    </a>
                </li>
                <li>
                    <a href="#entries" class="nav-link" data-page="entries">
                        <i class="bi bi-journal-text"></i>
                        ${currentUser.role === 'admin' ? 'Time Entries' : 'My Time Log'}
                    </a>
                </li>
                <li>
                    <a href="#settings" class="nav-link" data-page="settings">
                        <i class="bi bi-gear-fill"></i> Settings
                    </a>
                </li>
                ${adminLinks}
            </ul>

            <div class="sidebar-footer">
                <div class="sidebar-user">
                    <div class="sidebar-avatar" style="overflow: hidden; padding: 0;">${avatarHtml}</div>
                    <div>
                        <div class="sidebar-username">${currentUser.username}</div>
                        <div class="sidebar-role">${currentUser.role}</div>
                    </div>
                </div>
                <button class="sidebar-logout" onclick="logout()">
                    <i class="bi bi-box-arrow-right"></i> Sign out
                </button>
            </div>
        </div>
    `;
    document.getElementById('app').prepend(sidebarEl);
}

/** Highlights the link in the sidebar that matches the current page hash. */
function updateActiveNav(page) {
    document.querySelectorAll('#sidebar .nav-link').forEach(link => {
        link.classList.toggle('active', link.getAttribute('data-page') === page);
    });
}

async function logout() {
    await apiCall('logout.php', 'POST');
    currentUser = null;
    location.hash = '#login';
}


// ══════════════════════════════════════════════════════════════════════════════
// AUTH PAGES – LOGIN & SIGNUP
// ══════════════════════════════════════════════════════════════════════════════

function renderLogin() {
    const main = document.getElementById('main-content');
    main.innerHTML = `
        <div class="auth-wrapper">
            <div class="auth-card">
                <div class="auth-logo"><i class="bi bi-lightning-charge-fill"></i></div>
                <h1 class="auth-title">Welcome back</h1>
                <p class="auth-subtitle">Sign in to your BETS account</p>

                <div id="login-error" class="alert alert-danger d-none mb-3"></div>

                <form id="login-form" autocomplete="on">
                    <div class="mb-3">
                        <label class="form-label" for="login-username">Username</label>
                        <input id="login-username" type="text" class="form-control" name="username"
                               required placeholder="Enter your username" autocomplete="username">
                    </div>
                    <div class="mb-4">
                        <label class="form-label" for="login-password">Password</label>
                        <input id="login-password" type="password" class="form-control" name="password"
                               required placeholder="Enter your password" autocomplete="current-password">
                    </div>
                    <button type="submit" id="login-btn" class="btn btn-primary">
                        <i class="bi bi-arrow-right-circle"></i> Sign In
                    </button>
                </form>

                <p class="auth-link">No account? <a href="#signup">Create one</a></p>
            </div>
        </div>
    `;

    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const btn  = document.getElementById('login-btn');
        const err  = document.getElementById('login-error');
        err.classList.add('d-none');

        btn.disabled = true;
        btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Signing in…`;
        try {
            const data = await apiCall('login.php', 'POST', {
                username: form.username.value,
                password: form.password.value
            });
            if (data.csrf_token) csrfToken = data.csrf_token;
            location.hash = '#dashboard';
        } catch (e) {
            err.innerHTML = `<i class="bi bi-exclamation-triangle me-2"></i>${e.message}`;
            err.classList.remove('d-none');
            btn.disabled = false;
            btn.innerHTML = `<i class="bi bi-arrow-right-circle"></i> Sign In`;
        }
    });
}

function renderSignup() {
    const main = document.getElementById('main-content');
    main.innerHTML = `
        <div class="auth-wrapper">
            <div class="auth-card">
                <div class="auth-logo"><i class="bi bi-person-plus-fill"></i></div>
                <h1 class="auth-title">Create account</h1>
                <p class="auth-subtitle">Join the employee tracking system</p>

                <div id="signup-error"   class="alert alert-danger  d-none mb-3"></div>
                <div id="signup-success" class="alert alert-success d-none mb-3"></div>

                <form id="signup-form" autocomplete="on">
                    <div class="mb-3">
                        <label class="form-label" for="su-username">Username</label>
                        <input id="su-username" type="text" class="form-control" name="username"
                               required minlength="3" placeholder="At least 3 characters" autocomplete="username">
                    </div>
                    <div class="mb-3">
                        <label class="form-label" for="su-email">Email</label>
                        <input id="su-email" type="email" class="form-control" name="email"
                               required placeholder="you@example.com" autocomplete="email">
                    </div>
                    <div class="mb-4">
                        <label class="form-label" for="su-password">Password</label>
                        <input id="su-password" type="password" class="form-control" name="password"
                               required minlength="6" placeholder="At least 6 characters" autocomplete="new-password">
                    </div>
                    <button type="submit" id="signup-btn" class="btn btn-primary">
                        <i class="bi bi-person-check"></i> Create Account
                    </button>
                </form>

                <p class="auth-link">Already have an account? <a href="#login">Sign in</a></p>
            </div>
        </div>
    `;

    document.getElementById('signup-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form    = e.target;
        const btn     = document.getElementById('signup-btn');
        const errDiv  = document.getElementById('signup-error');
        const succDiv = document.getElementById('signup-success');
        errDiv.classList.add('d-none');
        succDiv.classList.add('d-none');

        btn.disabled = true;
        btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Creating…`;
        try {
            await apiCall('signup.php', 'POST', {
                username: form.username.value,
                email:    form.email.value,
                password: form.password.value
            });
            succDiv.innerHTML = `<i class="bi bi-check-circle me-2"></i>Account created! Redirecting…`;
            succDiv.classList.remove('d-none');
            setTimeout(() => location.hash = '#login', 1500);
        } catch (err) {
            errDiv.innerHTML = `<i class="bi bi-exclamation-triangle me-2"></i>${err.message}`;
            errDiv.classList.remove('d-none');
            btn.disabled = false;
            btn.innerHTML = `<i class="bi bi-person-check"></i> Create Account`;
        }
    });
}


// ══════════════════════════════════════════════════════════════════════════════
// DASHBOARD – Admin view and User view diverge significantly here
// ══════════════════════════════════════════════════════════════════════════════

async function renderDashboard() {
    const main    = document.getElementById('main-content');
    const isAdmin = currentUser.role === 'admin';

    // Show skeleton placeholders immediately so the page doesn't look blank
    main.innerHTML = `
        <div class="page-header fade-in">
            <div>
                <h2 class="page-title">Dashboard</h2>
                <p class="page-subtitle">Welcome back, <strong>${currentUser.username}</strong> 👋</p>
            </div>
        </div>
        <div class="row g-3 mb-4">${skeletonStats(isAdmin ? 4 : 3)}</div>
        <div class="panel fade-in">
            <div class="panel-header"><h3 class="panel-title">Loading…</h3></div>
            <div class="p-4">${skeletonRows(5)}</div>
        </div>
    `;

    try {
        const url = isAdmin ? `dashboard.php?timeframe=${currentAdminTimeframe}` : 'dashboard.php';
        const data = await apiCall(url);
        isAdmin ? renderAdminDashboard(main, data) : renderUserDashboard(main, data);
    } catch (err) {
        main.innerHTML = `<div class="alert alert-danger"><i class="bi bi-x-circle me-2"></i>${err.message}</div>`;
    }
}

// ── Admin dashboard ──────────────────────────────────────────────────────────
function renderAdminDashboard(main, data) {

    // 4 stat cards: Users / Projects / Entries today / Hours today
    const stats = `
        <div class="col-md-3">
            <div class="stat-card stat-violet fade-in">
                <div class="stat-card-icon"><i class="bi bi-people-fill"></i></div>
                <div class="stat-card-value">${data.total_users}</div>
                <div class="stat-card-label">Total Users</div>
            </div>
        </div>
        <div class="col-md-3">
            <div class="stat-card stat-cyan fade-in">
                <div class="stat-card-icon"><i class="bi bi-folder-fill"></i></div>
                <div class="stat-card-value">${data.total_projects}</div>
                <div class="stat-card-label">Projects</div>
            </div>
        </div>
        <div class="col-md-3">
            <div class="stat-card stat-emerald fade-in">
                <div class="stat-card-icon"><i class="bi bi-calendar-check-fill"></i></div>
                <div class="stat-card-value">${data.entries_today}</div>
                <div class="stat-card-label">Entries Today</div>
            </div>
        </div>
        <div class="col-md-3">
            <div class="stat-card stat-amber fade-in">
                <div class="stat-card-icon"><i class="bi bi-clock-fill"></i></div>
                <div class="stat-card-value">${formatTime24(data.total_hours_today)}</div>
                <div class="stat-card-label">Hours Today</div>
                ${data.unassigned_users > 0
                    ? `<div class="stat-card-badge"><i class="bi bi-exclamation-triangle-fill me-1"></i>${data.unassigned_users} user${data.unassigned_users > 1 ? 's' : ''} unassigned</div>`
                    : ''}
            </div>
        </div>
    `;

    // Best Employee Summary
    let bestEmployeeHtml = '';
    if (data.employee_stats && data.employee_stats.length > 0) {
        const best = data.employee_stats[0];
        if (best.total_hours_decimal > 0) {
            bestEmployeeHtml = `
                <div class="panel fade-in mb-4" style="background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(6, 182, 212, 0.1) 100%); border-color: rgba(139, 92, 246, 0.3);">
                    <div class="p-4 d-flex align-items-center gap-4">
                        <div style="width: 70px; height: 70px; border-radius: 18px; background: linear-gradient(135deg, var(--accent), var(--accent2)); display: flex; align-items: center; justify-content: center; font-size: 2.2rem; flex-shrink: 0; box-shadow: 0 12px 30px rgba(139, 92, 246, 0.4);">
                            <i class="bi bi-trophy-fill text-white"></i>
                        </div>
                        <div>
                            <h3 class="fw-bold mb-1" style="color: #fff; font-size: 1.4rem;">Top Performer: <span style="color: var(--accent-light);">${best.username}</span></h3>
                            <p class="mb-0 text-secondary">Outstanding contribution with a total of <strong style="color: #fff;">${best.total_hours_formatted}</strong> logged across <strong style="color: #fff;">${best.total_entries}</strong> entries.</p>
                        </div>
                    </div>
                </div>`;
        }
    }

    // Chart.js Graph HTML
    let chartHtml = '';
    if (data.employee_stats && data.employee_stats.length > 0) {
        // Calculate dynamic height based on number of users, min 250px
        const chartHeight = Math.max(250, data.employee_stats.length * 40 + 60);
        chartHtml = `
            <div class="panel fade-in mb-4">
                <div class="panel-header d-flex flex-wrap justify-content-between align-items-center gap-3">
                    <h3 class="panel-title mb-0"><i class="bi bi-bar-chart-fill me-2" style="color:var(--accent)"></i>Employee Analytics</h3>
                    <div class="btn-group" role="group">
                        <button type="button" class="btn ${currentAdminTimeframe === 'all' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="setAdminTimeframe('all')">All Time</button>
                        <button type="button" class="btn ${currentAdminTimeframe === 'yearly' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="setAdminTimeframe('yearly')">Yearly</button>
                        <button type="button" class="btn ${currentAdminTimeframe === 'quarterly' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="setAdminTimeframe('quarterly')">Quarterly</button>
                    </div>
                </div>
                <div class="p-4" style="position: relative; height: ${chartHeight}px; width: 100%;">
                    <canvas id="employeeChart"></canvas>
                </div>
            </div>`;
    }

    // Project summary table (top 5 by hours logged)
    let projectTableHtml = '';
    if (data.project_summary && data.project_summary.length > 0) {
        const rows = data.project_summary.map(p => `
            <tr>
                <td><span class="fw-500">${p.project_name}</span></td>
                <td>${p.assigned_users}</td>
                <td>${p.total_entries}</td>
                <td><code>${formatTime24(p.total_hours)}</code></td>
            </tr>`).join('');

        projectTableHtml = `
            <div class="panel fade-in mb-4">
                <div class="panel-header">
                    <h3 class="panel-title"><i class="bi bi-folder me-2" style="color:var(--accent2)"></i>Project Hours Summary</h3>
                    <a href="#admin/projects" class="btn btn-secondary btn-sm">View all</a>
                </div>
                <div style="overflow-x:auto;">
                <table class="bets-table">
                    <thead><tr><th>Project</th><th>Users</th><th>Entries</th><th>Total Hours</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>
                </div>
            </div>`;
    }

    // Recent entries from all users
    let recentHtml = '';
    if (data.recent_entries && data.recent_entries.length > 0) {
        const rows = data.recent_entries.map(e => `
            <tr>
                <td><span class="fw-500">${e.username}</span></td>
                <td>${e.project_name || '—'}</td>
                <td>${formatDate(e.entry_date)}</td>
                <td>${formatTime(e.start_time)}</td>
                <td>${formatTime(e.end_time)}</td>
            </tr>`).join('');

        recentHtml = `
            <div class="panel fade-in">
                <div class="panel-header">
                    <h3 class="panel-title"><i class="bi bi-clock-history me-2" style="color:var(--accent)"></i>Recent Entries</h3>
                    <a href="#entries" class="btn btn-secondary btn-sm">View all</a>
                </div>
                <div style="overflow-x:auto;">
                <table class="bets-table">
                    <thead><tr><th>User</th><th>Project</th><th>Date</th><th>Start</th><th>End</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>
                </div>
            </div>`;
    } else {
        recentHtml = emptyState('bi-journal-x', 'No entries yet', 'Time entries logged by your team will appear here.');
        recentHtml = `<div class="panel fade-in"><div class="panel-header"><h3 class="panel-title">Recent Entries</h3></div>${recentHtml}</div>`;
    }

    main.innerHTML = `
        <div class="page-header fade-in">
            <div>
                <h2 class="page-title">Admin Dashboard</h2>
                <p class="page-subtitle">Overview of all team activity</p>
            </div>
            <a href="#admin/assignments" class="btn btn-primary">
                <i class="bi bi-diagram-3-fill"></i> Manage Assignments
            </a>
        </div>
        <div class="row g-3 mb-4">${stats}</div>
        ${bestEmployeeHtml}
        ${chartHtml}
        ${projectTableHtml}
        ${recentHtml}
    `;

    // Initialize Chart.js
    if (data.employee_stats && data.employee_stats.length > 0) {
        const ctx = document.getElementById('employeeChart');
        if (ctx) {
            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: data.employee_stats.map(e => e.username),
                    datasets: [{
                        label: 'Total Hours',
                        data: data.employee_stats.map(e => e.total_hours_decimal),
                        backgroundColor: 'rgba(139, 92, 246, 0.6)',
                        borderColor: 'rgba(139, 92, 246, 1)',
                        borderWidth: 1,
                        borderRadius: 6
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: { 
                            beginAtZero: true,
                            grid: { color: 'rgba(255,255,255,0.05)' },
                            ticks: { color: '#94a3b8' },
                            title: { display: true, text: 'Total Hours', color: '#64748b' }
                        },
                        y: {
                            grid: { display: false },
                            ticks: { color: '#94a3b8', font: { size: 13 } }
                        }
                    },
                    plugins: {
                        legend: { display: false }
                    }
                }
            });
        }
    }
}

// Global timeframe setter for onclick
window.setAdminTimeframe = function(timeframe) {
    currentAdminTimeframe = timeframe;
    renderDashboard();
};

// ── Regular-user dashboard ───────────────────────────────────────────────────
function renderUserDashboard(main, data) {
    const hasProjects = data.assigned_projects > 0;

    // 3 stat cards: Today entries / Today hours / Week hours
    const stats = `
        <div class="col-md-4">
            <div class="stat-card stat-cyan fade-in">
                <div class="stat-card-icon"><i class="bi bi-calendar-check-fill"></i></div>
                <div class="stat-card-value">${data.entries_today}</div>
                <div class="stat-card-label">My Entries Today</div>
            </div>
        </div>
        <div class="col-md-4">
            <div class="stat-card stat-emerald fade-in">
                <div class="stat-card-icon"><i class="bi bi-clock-fill"></i></div>
                <div class="stat-card-value">${formatTime24(data.total_hours_today)}</div>
                <div class="stat-card-label">Hours Today</div>
            </div>
        </div>
        <div class="col-md-4">
            <div class="stat-card stat-violet fade-in">
                <div class="stat-card-icon"><i class="bi bi-graph-up"></i></div>
                <div class="stat-card-value">${formatTime24(data.total_hours_week)}</div>
                <div class="stat-card-label">Hours This Week</div>
            </div>
        </div>
    `;

    // Assigned projects mini-cards (or a call-to-action if none assigned yet)
    let projectsHtml = '';
    if (!hasProjects) {
        projectsHtml = `
            <div class="panel fade-in mb-4">
                <div class="panel-header"><h3 class="panel-title">My Projects</h3></div>
                <div class="empty-state">
                    <i class="bi bi-folder-x empty-state-icon"></i>
                    <div class="empty-state-title">No projects assigned yet</div>
                    <div class="empty-state-text">Contact your admin to get assigned to a project before you can log time.</div>
                </div>
            </div>`;
    } else {
        const cards = data.my_projects.map(p => `
            <div class="col-md-4">
                <div class="project-mini-card fade-in">
                    <div class="project-mini-icon"><i class="bi bi-folder-fill"></i></div>
                    <div class="project-mini-name">${p.name}</div>
                    <div class="project-mini-desc">${p.description || 'No description'}</div>
                    <div class="project-mini-count"><i class="bi bi-clock me-1"></i>${p.my_entries} ${p.my_entries === 1 ? 'entry' : 'entries'} logged</div>
                </div>
            </div>`).join('');

        projectsHtml = `
            <div class="panel fade-in mb-4">
                <div class="panel-header">
                    <h3 class="panel-title"><i class="bi bi-folder me-2" style="color:var(--accent2)"></i>My Projects</h3>
                    <a href="#entries" class="btn btn-primary btn-sm"><i class="bi bi-plus-lg"></i> Log Time</a>
                </div>
                <div class="p-3"><div class="row g-3">${cards}</div></div>
            </div>`;
    }

    // Recent personal entries
    let recentHtml = '';
    if (data.recent_entries && data.recent_entries.length > 0) {
        const rows = data.recent_entries.map(e => `
            <tr>
                <td><span class="fw-500">${e.project_name || '—'}</span></td>
                <td>${formatDate(e.entry_date)}</td>
                <td>${formatTime(e.start_time)}</td>
                <td>${formatTime(e.end_time)}</td>
                <td class="text-muted" style="font-size:0.8rem;">${calcDuration(e.start_time, e.end_time)}</td>
            </tr>`).join('');

        recentHtml = `
            <div class="panel fade-in">
                <div class="panel-header">
                    <h3 class="panel-title"><i class="bi bi-clock-history me-2" style="color:var(--accent)"></i>Recent Entries</h3>
                    <a href="#entries" class="btn btn-secondary btn-sm">View all</a>
                </div>
                <div style="overflow-x:auto;">
                <table class="bets-table">
                    <thead><tr><th>Project</th><th>Date</th><th>Start</th><th>End</th><th>Duration</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>
                </div>
            </div>`;
    } else {
        recentHtml = `
            <div class="panel fade-in">
                <div class="panel-header"><h3 class="panel-title">Recent Entries</h3></div>
                ${emptyState('bi-journal-x', 'No entries yet', hasProjects ? 'Click "Log Time" to record your first entry.' : 'You need a project assigned before you can log time.')}
            </div>`;
    }

    main.innerHTML = `
        <div class="page-header fade-in">
            <div>
                <h2 class="page-title">My Dashboard</h2>
                <p class="page-subtitle">Welcome back, <strong>${currentUser.username}</strong> 👋</p>
            </div>
            ${hasProjects ? `<a href="#entries" class="btn btn-primary"><i class="bi bi-plus-lg"></i> Log Time</a>` : ''}
        </div>
        <div class="row g-3 mb-4">${stats}</div>
        ${projectsHtml}
        ${recentHtml}
    `;
}


// ══════════════════════════════════════════════════════════════════════════════
// TIME ENTRIES PAGE
// Admins see a read-only view of ALL entries.
// Users see only their own entries and can add/edit/delete them — but ONLY if
// they have been assigned at least one project by an admin.
// ══════════════════════════════════════════════════════════════════════════════

let userProjects = []; // Cached list of projects assigned to the current user

async function renderEntries() {
    const main    = document.getElementById('main-content');
    const isAdmin = currentUser.role === 'admin';

    main.innerHTML = `
        <div class="page-header fade-in">
            <div>
                <h2 class="page-title">${isAdmin ? 'All Time Entries' : 'My Time Log'}</h2>
                <p class="page-subtitle">${isAdmin ? 'Read-only view of all employee time entries' : 'Log and manage your personal work hours'}</p>
            </div>
            ${!isAdmin ? `
                <button class="btn btn-primary" id="add-entry-btn" onclick="showEntryForm()">
                    <i class="bi bi-plus-lg"></i> Add Entry
                </button>` : ''}
        </div>
        <div class="panel fade-in">
            <div id="entries-list" class="p-4">${skeletonRows(7)}</div>
        </div>

        <!-- Add / Edit entry modal (only rendered for non-admins) -->
        ${!isAdmin ? `
        <div class="modal fade" id="entryModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="entryModalLabel">Add Entry</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="entry-form">
                            <input type="hidden" name="id">
                            <div class="mb-3">
                                <label class="form-label">Project</label>
                                <select name="project_id" class="form-select" required id="project-select">
                                    <option value="">Select a project…</option>
                                </select>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">
                                    Task Description
                                    <span class="text-muted fw-normal">(optional)</span>
                                </label>
                                <textarea name="task_description" class="form-control"
                                          placeholder="What did you work on?"></textarea>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Date</label>
                                <input type="date" name="entry_date" class="form-control" required>
                            </div>
                            <div class="row g-3">
                                <div class="col">
                                    <label class="form-label">Start Time</label>
                                    <input type="time" name="start_time" class="form-control" required>
                                </div>
                                <div class="col">
                                    <label class="form-label">End Time</label>
                                    <input type="time" name="end_time" class="form-control" required>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button class="btn btn-primary" id="save-entry-btn">
                            <i class="bi bi-check-lg"></i> Save Entry
                        </button>
                    </div>
                </div>
            </div>
        </div>` : ''}
    `;

    // For regular users: load their assigned projects before rendering the list.
    // If they have none, we block the Add button and show a warning.
    if (!isAdmin) {
        await loadUserProjects();

        const addBtn = document.getElementById('add-entry-btn');
        if (addBtn && userProjects.length === 0) {
            addBtn.disabled = true;
            addBtn.title = 'Contact admin to get a project assigned first.';
        }
    }

    await loadEntriesList();
}

/** Fetches the projects assigned to the current (non-admin) user and stores them. */
async function loadUserProjects() {
    if (currentUser.role === 'admin') return; // Admins do not log entries
    try {
        const response = await apiCall(`assignments.php?user_id=${currentUser.id}`);
        userProjects = Array.isArray(response) ? response : [];
    } catch (err) {
        userProjects = [];
    }
}

/** Renders the entries table into #entries-list. */
async function loadEntriesList() {
    const listDiv = document.getElementById('entries-list');
    const isAdmin = currentUser.role === 'admin';

    // Block non-admin users who have no project assigned at all
    if (!isAdmin && userProjects.length === 0) {
        listDiv.innerHTML = emptyState(
            'bi-folder-x',
            'No projects assigned',
            'You cannot log time until an admin assigns you to a project.'
        );
        return;
    }

    try {
        const entries = await apiCall('entries.php');

        if (entries.length === 0) {
            listDiv.innerHTML = emptyState(
                'bi-journal-x',
                'No time entries yet',
                isAdmin ? 'Entries logged by your team will appear here.' : 'Click "Add Entry" to log your first entry.'
            );
            return;
        }

        const rows = entries.map(e => `
            <tr>
                ${isAdmin ? `<td><span class="fw-500">${e.username}</span></td>` : ''}
                <td><span class="fw-500">${e.project_name || '—'}</span></td>
                <td>${formatDate(e.entry_date)}</td>
                <td>${formatTime(e.start_time)}</td>
                <td>${formatTime(e.end_time)}</td>
                <td class="text-muted" style="font-size:0.8rem;">${calcDuration(e.start_time, e.end_time)}</td>
                <td>
                    ${!isAdmin ? `
                        <button class="tbl-action tbl-action-edit"
                            onclick="editEntry(${e.id}, ${e.project_id ?? 'null'}, '${escAttr(e.task_description || '')}', '${e.entry_date}', '${e.start_time}', '${e.end_time}')"
                            title="Edit this entry">
                            <i class="bi bi-pencil-fill"></i>
                        </button>
                        <button class="tbl-action tbl-action-delete"
                            onclick="deleteEntry(${e.id})"
                            title="Delete this entry">
                            <i class="bi bi-trash-fill"></i>
                        </button>` : '<span class="text-muted">—</span>'}
                </td>
            </tr>`).join('');

        listDiv.innerHTML = `
            <div style="overflow-x:auto;">
            <table class="bets-table">
                <thead>
                    <tr>
                        ${isAdmin ? '<th>User</th>' : ''}
                        <th>Project</th>
                        <th>Date</th>
                        <th>Start</th>
                        <th>End</th>
                        <th>Duration</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
            </div>`;
    } catch (err) {
        listDiv.innerHTML = `<div class="alert alert-danger"><i class="bi bi-x-circle me-2"></i>${err.message}</div>`;
    }
}

/** Opens the Add/Edit entry modal pre-filled with the given values (all blank for new). */
function showEntryForm(id = null, projectId = null, task = '', date = '', start = '', end = '') {
    // Double-check: user must have at least one project (the button should already be disabled)
    if (userProjects.length === 0) {
        showToast('No project assigned. Contact your admin.', 'error');
        return;
    }

    const modal  = new bootstrap.Modal(document.getElementById('entryModal'));
    const form   = document.getElementById('entry-form');
    const saveBtn = document.getElementById('save-entry-btn');

    document.getElementById('entryModalLabel').textContent = id ? 'Edit Entry' : 'Add Entry';
    form.id.value               = id || '';
    form.task_description.value = task;
    form.entry_date.value       = date;
    form.start_time.value       = start;
    form.end_time.value         = end;

    // Rebuild the project dropdown from the cached list of assigned projects
    const select = document.getElementById('project-select');
    select.innerHTML = '<option value="">Select a project…</option>';
    userProjects.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.name || p.project_name;
        if (p.id == projectId) opt.selected = true;
        select.appendChild(opt);
    });

    saveBtn.onclick = async () => {
        const f    = document.getElementById('entry-form');
        const body = {
            project_id:       f.project_id.value,
            task_description: f.task_description.value,
            entry_date:       f.entry_date.value,
            start_time:       f.start_time.value,
            end_time:         f.end_time.value
        };
        saveBtn.disabled = true;
        saveBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>Saving…`;
        try {
            if (f.id.value) {
                // Editing an existing entry
                await apiCall(`entries.php?id=${f.id.value}`, 'PUT', body);
                showToast('Entry updated.', 'success');
            } else {
                // Creating a new entry
                await apiCall('entries.php', 'POST', body);
                showToast('Entry logged.', 'success');
            }
            modal.hide();
            loadEntriesList(); // Refresh the list without a full page reload
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = `<i class="bi bi-check-lg"></i> Save Entry`;
        }
    };
    modal.show();
}

function editEntry(id, projectId, task, date, start, end) {
    showEntryForm(id, projectId, task, date, start, end);
}

async function deleteEntry(id) {
    if (!confirm('Delete this time entry? This cannot be undone.')) return;
    try {
        await apiCall(`entries.php?id=${id}`, 'DELETE');
        showToast('Entry deleted.', 'info');
        loadEntriesList();
    } catch (err) {
        showToast(err.message, 'error');
    }
}


// ══════════════════════════════════════════════════════════════════════════════
// ADMIN – PROJECTS
// Admins can create, edit, delete projects and assign users directly here.
// ══════════════════════════════════════════════════════════════════════════════

async function renderAdminProjects() {
    const main = document.getElementById('main-content');
    main.innerHTML = `
        <div class="page-header fade-in">
            <div>
                <h2 class="page-title">Projects</h2>
                <p class="page-subtitle">Create and manage projects; assign them to team members</p>
            </div>
            <button class="btn btn-primary" onclick="showProjectForm()">
                <i class="bi bi-plus-lg"></i> New Project
            </button>
        </div>
        <div class="panel fade-in">
            <div id="projects-list" class="p-4">${skeletonRows(5)}</div>
        </div>

        <!-- Add / Edit project modal -->
        <div class="modal fade" id="projectModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="projectModalLabel">New Project</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="project-form">
                            <input type="hidden" name="id">
                            <div class="mb-3">
                                <label class="form-label">Project Name</label>
                                <input type="text" name="name" class="form-control"
                                       required placeholder="e.g. Website Redesign">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">
                                    Description
                                    <span class="text-muted fw-normal">(optional)</span>
                                </label>
                                <textarea name="description" class="form-control"
                                          placeholder="Brief description…"></textarea>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Assign to Users</label>
                                <select name="user_ids" class="form-select" multiple
                                        id="user-ids-select" style="height:130px;">
                                </select>
                                <small class="text-muted">Hold Ctrl / Cmd to select multiple users</small>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button class="btn btn-primary" id="save-project-btn">
                            <i class="bi bi-check-lg"></i> Save
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    await loadProjectsList();
}

async function loadProjectsList() {
    const listDiv = document.getElementById('projects-list');
    try {
        const projects = await apiCall('projects.php');

        if (projects.length === 0) {
            listDiv.innerHTML = emptyState('bi-folder-x', 'No projects yet', 'Create your first project to get started.');
            return;
        }

        const rows = projects.map(p => {
            const assigned = p.assigned_users || 0;
            return `<tr>
                <td><span class="fw-500">${p.name}</span></td>
                <td class="text-muted">${p.description || '<em>—</em>'}</td>
                <td>
                    <span class="badge-role ${assigned > 0 ? 'badge-admin' : 'badge-user'}">
                        <i class="bi bi-person"></i> ${assigned} user${assigned !== 1 ? 's' : ''}
                    </span>
                </td>
                <td class="text-muted" style="font-size:0.8rem;">${formatDate(p.created_at)}</td>
                <td>
                    <button class="tbl-action tbl-action-edit"
                        onclick="editProject(${p.id}, '${escAttr(p.name)}', '${escAttr(p.description || '')}')"
                        title="Edit project">
                        <i class="bi bi-pencil-fill"></i>
                    </button>
                    <button class="tbl-action tbl-action-delete"
                        onclick="deleteProject(${p.id})"
                        title="Delete project">
                        <i class="bi bi-trash-fill"></i>
                    </button>
                </td>
            </tr>`;
        }).join('');

        listDiv.innerHTML = `
            <div style="overflow-x:auto;">
            <table class="bets-table">
                <thead>
                    <tr><th>Name</th><th>Description</th><th>Assigned</th><th>Created</th><th>Actions</th></tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
            </div>`;
    } catch (err) {
        listDiv.innerHTML = `<div class="alert alert-danger"><i class="bi bi-x-circle me-2"></i>${err.message}</div>`;
    }
}

/** Populates the multi-select inside the project modal with all users. */
async function loadUsersForSelection(selectedIds = []) {
    const select = document.getElementById('user-ids-select');
    select.innerHTML = '';
    const users = await apiCall('users.php');
    users.forEach(u => {
        const opt = document.createElement('option');
        opt.value = u.id;
        opt.textContent = `${u.username} (${u.role})`;
        if (selectedIds.includes(u.id)) opt.selected = true;
        select.appendChild(opt);
    });
}

/** Returns the IDs of users currently assigned to a project. */
async function loadAssignedUsers(projectId) {
    try {
        const assignments = await apiCall(`assignments.php?project_id=${projectId}`);
        return assignments.map(a => a.id);
    } catch {
        return [];
    }
}

function showProjectForm(id = null, name = '', description = '', userIds = []) {
    const modal   = new bootstrap.Modal(document.getElementById('projectModal'));
    const form    = document.getElementById('project-form');
    const saveBtn = document.getElementById('save-project-btn');

    document.getElementById('projectModalLabel').textContent = id ? 'Edit Project' : 'New Project';
    form.id.value          = id || '';
    form.name.value        = name;
    form.description.value = description;

    loadUsersForSelection(userIds);
    modal.show();

    saveBtn.onclick = async () => {
        const f              = document.getElementById('project-form');
        const select         = document.getElementById('user-ids-select');
        const selectedUserIds = Array.from(select.selectedOptions).map(o => parseInt(o.value));

        // At least one user must be selected when creating or editing a project
        if (selectedUserIds.length === 0) {
            showToast('Please assign at least one user to this project.', 'error');
            return;
        }

        const body = {
            name:        f.name.value,
            description: f.description.value,
            user_ids:    selectedUserIds
        };

        saveBtn.disabled = true;
        saveBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>Saving…`;
        try {
            if (f.id.value) {
                await apiCall(`projects.php?id=${f.id.value}`, 'PUT', body);
                showToast('Project updated.', 'success');
            } else {
                await apiCall('projects.php', 'POST', body);
                showToast('Project created and users assigned.', 'success');
            }
            modal.hide();
            loadProjectsList();
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = `<i class="bi bi-check-lg"></i> Save`;
        }
    };
}

function editProject(id, name, description) {
    // First load the currently assigned users, then open the modal with those pre-selected
    loadAssignedUsers(id).then(userIds => showProjectForm(id, name, description, userIds));
}

async function deleteProject(id) {
    if (!confirm('Delete this project? All related assignments and entries will be affected.')) return;
    try {
        await apiCall(`projects.php?id=${id}`, 'DELETE');
        showToast('Project deleted.', 'info');
        loadProjectsList();
    } catch (err) {
        showToast(err.message, 'error');
    }
}


// ══════════════════════════════════════════════════════════════════════════════
// ADMIN – USERS
// ══════════════════════════════════════════════════════════════════════════════

async function renderAdminUsers() {
    const main = document.getElementById('main-content');
    main.innerHTML = `
        <div class="page-header fade-in">
            <div>
                <h2 class="page-title">User Administration</h2>
                <p class="page-subtitle">Manage team member accounts and roles</p>
            </div>
            <button class="btn btn-primary" onclick="showUserForm()">
                <i class="bi bi-plus-lg"></i> Add User
            </button>
        </div>
        <div class="panel fade-in">
            <div id="users-list" class="p-4">${skeletonRows(6)}</div>
        </div>

        <!-- Add / Edit user modal -->
        <div class="modal fade" id="userModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="userModalLabel">Add User</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="user-form">
                            <input type="hidden" name="id">
                            <div class="mb-3">
                                <label class="form-label">Username</label>
                                <input type="text" name="username" class="form-control"
                                       required placeholder="Enter username">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Email</label>
                                <input type="email" name="email" class="form-control"
                                       required placeholder="user@example.com">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">
                                    Password
                                    <span class="text-muted fw-normal" id="pw-hint">(leave blank to keep unchanged)</span>
                                </label>
                                <input type="password" name="password" class="form-control"
                                       placeholder="At least 6 characters">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Role</label>
                                <select name="role" class="form-select">
                                    <option value="user">User</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button class="btn btn-primary" id="save-user-btn">
                            <i class="bi bi-check-lg"></i> Save
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    await loadUsersList();
}

async function loadUsersList() {
    const listDiv = document.getElementById('users-list');
    try {
        const users = await apiCall('users.php');

        if (users.length === 0) {
            listDiv.innerHTML = emptyState('bi-people', 'No users yet', 'Add the first team member.');
            return;
        }

        const rows = users.map(u => `
            <tr>
                <td class="text-muted" style="font-size:0.78rem;">#${u.id}</td>
                <td><span class="fw-500">${u.username}</span></td>
                <td class="text-muted">${u.email}</td>
                <td>
                    <span class="badge-role ${u.role === 'admin' ? 'badge-admin' : 'badge-user'}">
                        <i class="bi ${u.role === 'admin' ? 'bi-shield-fill' : 'bi-person-fill'}"></i>
                        ${u.role}
                    </span>
                </td>
                <td class="text-muted" style="font-size:0.8rem;">${formatDate(u.created_at)}</td>
                <td>
                    <button class="tbl-action tbl-action-edit"
                        onclick="editUser(${u.id}, '${escAttr(u.username)}', '${escAttr(u.email)}', '${u.role}')"
                        title="Edit user">
                        <i class="bi bi-pencil-fill"></i>
                    </button>
                    <button class="tbl-action tbl-action-delete"
                        onclick="deleteUser(${u.id})"
                        title="Delete user">
                        <i class="bi bi-trash-fill"></i>
                    </button>
                </td>
            </tr>`).join('');

        listDiv.innerHTML = `
            <div style="overflow-x:auto;">
            <table class="bets-table">
                <thead>
                    <tr><th>#</th><th>Username</th><th>Email</th><th>Role</th><th>Created</th><th>Actions</th></tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
            </div>`;
    } catch (err) {
        listDiv.innerHTML = `<div class="alert alert-danger"><i class="bi bi-x-circle me-2"></i>${err.message}</div>`;
    }
}

function showUserForm(id = null, username = '', email = '', role = 'user') {
    const modal   = new bootstrap.Modal(document.getElementById('userModal'));
    const form    = document.getElementById('user-form');
    const saveBtn = document.getElementById('save-user-btn');

    document.getElementById('userModalLabel').textContent = id ? 'Edit User' : 'Add User';
    // Hide the "(leave blank…)" hint on new user forms — password is required there
    document.getElementById('pw-hint').style.display = id ? '' : 'none';

    form.id.value       = id || '';
    form.username.value = username;
    form.email.value    = email;
    form.password.value = '';
    form.role.value     = role;
    form.password.required = !id; // Required only when creating a new account

    saveBtn.onclick = async () => {
        const f    = document.getElementById('user-form');
        const body = {
            username: f.username.value,
            email:    f.email.value,
            role:     f.role.value
        };
        if (f.password.value) body.password = f.password.value;

        saveBtn.disabled = true;
        saveBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>Saving…`;
        try {
            if (f.id.value) {
                await apiCall(`users.php?id=${f.id.value}`, 'PUT', body);
                showToast('User updated.', 'success');
            } else {
                await apiCall('users.php', 'POST', body);
                showToast('User created.', 'success');
            }
            modal.hide();
            loadUsersList();
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = `<i class="bi bi-check-lg"></i> Save`;
        }
    };
    modal.show();
}

function editUser(id, username, email, role) {
    showUserForm(id, username, email, role);
}

async function deleteUser(id) {
    if (!confirm('Delete this user and all their time entries?')) return;
    try {
        await apiCall(`users.php?id=${id}`, 'DELETE');
        showToast('User deleted.', 'info');
        loadUsersList();
    } catch (err) {
        showToast(err.message, 'error');
    }
}


// ══════════════════════════════════════════════════════════════════════════════
// ADMIN – ASSIGNMENTS
// Dedicated page to quickly assign/remove users from projects.
// This is the primary way admins control who can log time on which project.
// ══════════════════════════════════════════════════════════════════════════════

async function renderAdminAssignments() {
    const main = document.getElementById('main-content');
    main.innerHTML = `
        <div class="page-header fade-in">
            <div>
                <h2 class="page-title">Assignments</h2>
                <p class="page-subtitle">Control which users can log time on each project</p>
            </div>
        </div>
        <div class="row g-3" id="assignments-grid">
            ${skeletonStats(3)}
        </div>
    `;

    try {
        // Load projects and users in parallel for speed
        const [projects, users] = await Promise.all([
            apiCall('projects.php'),
            apiCall('users.php')
        ]);

        // Only regular users can be assigned (admins don't log time)
        const regularUsers = users.filter(u => u.role === 'user');

        if (projects.length === 0) {
            document.getElementById('assignments-grid').innerHTML =
                emptyState('bi-folder-x', 'No projects yet', 'Create a project first before assigning users.');
            return;
        }

        // Render one card per project, each with its own assignment checkboxes
        const cards = projects.map(p => `
            <div class="col-md-6 col-lg-4">
                <div class="panel assignment-card fade-in" data-project-id="${p.id}">
                    <div class="panel-header">
                        <div>
                            <h3 class="panel-title">${p.name}</h3>
                            <div class="text-muted" style="font-size:0.75rem;">${p.description || 'No description'}</div>
                        </div>
                        <span class="badge-role badge-admin" id="count-${p.id}">${p.assigned_users} user${p.assigned_users !== 1 ? 's' : ''}</span>
                    </div>
                    <div class="p-3" id="users-for-${p.id}">
                        ${regularUsers.length === 0
                            ? '<div class="text-muted" style="font-size:0.82rem;">No regular users exist yet.</div>'
                            : regularUsers.map(u => `
                                <label class="assignment-row" id="assign-label-${p.id}-${u.id}">
                                    <input type="checkbox"
                                        id="assign-${p.id}-${u.id}"
                                        onchange="toggleAssignment(${p.id}, ${u.id}, this.checked, '${escAttr(p.name)}', '${escAttr(u.username)}')"
                                        style="accent-color:var(--accent);">
                                    <span class="assignment-username">${u.username}</span>
                                    <span class="assignment-email">${u.email}</span>
                                </label>`).join('')}
                    </div>
                </div>
            </div>
        `).join('');

        document.getElementById('assignments-grid').innerHTML = `<div class="col-12"><div class="row g-3">${cards}</div></div>`;

        // Now load the current assignment state for every project and tick the right checkboxes
        await Promise.all(projects.map(async p => {
            try {
                const assigned = await apiCall(`assignments.php?project_id=${p.id}`);
                const assignedIds = assigned.map(a => a.id);
                assignedIds.forEach(uid => {
                    const cb = document.getElementById(`assign-${p.id}-${uid}`);
                    if (cb) cb.checked = true;
                });
            } catch { /* silently skip if a single project fails */ }
        }));

    } catch (err) {
        document.getElementById('assignments-grid').innerHTML =
            `<div class="col-12"><div class="alert alert-danger"><i class="bi bi-x-circle me-2"></i>${err.message}</div></div>`;
    }
}

/**
 * Called when a checkbox on the Assignments page changes.
 * Adds or removes the user-project assignment via the API.
 */
async function toggleAssignment(projectId, userId, isChecked, projectName, username) {
    const cb    = document.getElementById(`assign-${projectId}-${userId}`);
    const label = document.getElementById(`assign-label-${projectId}-${userId}`);

    // Visually disable the checkbox while the request is in flight
    if (cb) cb.disabled = true;
    if (label) label.classList.add('assignment-row--saving');

    try {
        if (isChecked) {
            // Assign the user to the project
            await apiCall('assignments.php', 'POST', { user_id: userId, project_id: projectId });
            showToast(`${username} assigned to "${projectName}".`, 'success');
        } else {
            // Remove the user from the project
            await apiCall(`assignments.php?user_id=${userId}&project_id=${projectId}`, 'DELETE');
            showToast(`${username} removed from "${projectName}".`, 'info');
        }

        // Update the user-count badge on that project's card
        const countBadge = document.getElementById(`count-${projectId}`);
        if (countBadge) {
            const currentCount = parseInt(countBadge.textContent) || 0;
            const newCount = isChecked ? currentCount + 1 : Math.max(0, currentCount - 1);
            countBadge.textContent = `${newCount} user${newCount !== 1 ? 's' : ''}`;
        }
    } catch (err) {
        // Revert the checkbox if the API call failed
        if (cb) cb.checked = !isChecked;
        showToast(err.message, 'error');
    } finally {
        if (cb) cb.disabled = false;
        if (label) label.classList.remove('assignment-row--saving');
    }
}


// ══════════════════════════════════════════════════════════════════════════════
// SETTINGS
// ══════════════════════════════════════════════════════════════════════════════

function renderSettings() {
    const main = document.getElementById('main-content');
    const currentTheme = localStorage.getItem('theme') || 'os';

    main.innerHTML = `
        <div class="page-header fade-in">
            <div>
                <h2 class="page-title">Settings</h2>
                <p class="page-subtitle">Manage your profile and preferences</p>
            </div>
        </div>

        <div class="row fade-in">
            <div class="col-md-6 mb-4">
                <div class="panel h-100">
                    <div class="panel-header"><h3 class="panel-title"><i class="bi bi-person-circle me-2 text-primary"></i>My Profile</h3></div>
                    <div class="p-4">
                        <form id="settings-profile-form">
                            <div class="mb-3">
                                <label class="form-label">Username</label>
                                <input type="text" class="form-control" name="username" value="${escAttr(currentUser.username)}" required minlength="3">
                            </div>
                            <div class="mb-4">
                                <label class="form-label">Profile Picture (JPG, PNG, WebP)</label>
                                <input type="file" class="form-control" name="profile_pic" accept="image/jpeg, image/png, image/webp">
                            </div>
                            <button type="submit" class="btn btn-primary" id="btn-save-profile">
                                <i class="bi bi-save me-2"></i>Save Profile
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            <div class="col-md-6 mb-4">
                <div class="panel h-100">
                    <div class="panel-header"><h3 class="panel-title"><i class="bi bi-palette-fill me-2 text-info"></i>Appearance</h3></div>
                    <div class="p-4">
                        <div class="mb-4">
                            <label class="form-label d-block mb-3">Theme Preference</label>
                            <div class="btn-group w-100" role="group">
                                <input type="radio" class="btn-check" name="theme_pref" id="theme-os" value="os" ${currentTheme==='os'?'checked':''}>
                                <label class="btn btn-outline-secondary" for="theme-os"><i class="bi bi-display me-2"></i>OS Default</label>

                                <input type="radio" class="btn-check" name="theme_pref" id="theme-light" value="light" ${currentTheme==='light'?'checked':''}>
                                <label class="btn btn-outline-secondary" for="theme-light"><i class="bi bi-sun-fill me-2 text-warning"></i>Light</label>

                                <input type="radio" class="btn-check" name="theme_pref" id="theme-dark" value="dark" ${currentTheme==='dark'?'checked':''}>
                                <label class="btn btn-outline-secondary" for="theme-dark"><i class="bi bi-moon-stars-fill me-2 text-info"></i>Dark</label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('settings-profile-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btn-save-profile');
        const originalBtn = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Saving...`;

        try {
            const formData = new FormData(e.target);
            // using fetch manually since apiCall sends JSON and we need multipart/form-data
            const res = await fetch('api/settings.php', {
                method: 'POST',
                headers: { 'X-CSRF-Token': csrfToken },
                body: formData
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to update settings');

            if (data.username) currentUser.username = data.username;
            if (data.profile_pic) currentUser.profile_pic = data.profile_pic;

            showToast('Profile updated successfully!', 'success');
            route(); // Update sidebar and page cleanly
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalBtn;
        }
    });

    document.querySelectorAll('input[name="theme_pref"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const val = e.target.value;
            if (val === 'os') {
                localStorage.removeItem('theme');
                applyTheme(getInitialTheme());
            } else {
                localStorage.setItem('theme', val);
                applyTheme(val);
            }
        });
    });
}


// ══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Escape single-quotes and double-quotes for safe embedding inside
 * inline onclick="…" attributes. Prevents XSS via data from the server.
 */
function escAttr(str) {
    return String(str).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

/** Format an ISO / SQL date string to "May 28, 2026". */
function formatDate(str) {
    if (!str) return '—';
    try {
        return new Date(str).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    } catch { return str; }
}

/** Trim "HH:MM:SS" → "HH:MM" (removes seconds). */
function formatTime(str) {
    if (!str) return '—';
    return String(str).slice(0, 5);
}

/** Format "HH:MM:SS" to "Xh YYm" (e.g. "3h 45m") for human-friendly display. */
function formatTime24(str) {
    if (!str || str === '00:00:00') return '0h 00m';
    const parts = String(str).split(':');
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    return `${h}h ${String(m).padStart(2, '0')}m`;
}

/**
 * Calculate the duration between two "HH:MM" or "HH:MM:SS" strings.
 * Returns a formatted string like "2h 30m".
 */
function calcDuration(start, end) {
    if (!start || !end) return '—';
    try {
        const toMins = t => {
            const [h, m] = t.split(':').map(Number);
            return h * 60 + m;
        };
        const diff = toMins(end) - toMins(start);
        if (diff <= 0) return '—';
        return `${Math.floor(diff / 60)}h ${String(diff % 60).padStart(2, '0')}m`;
    } catch { return '—'; }
}

/**
 * Returns the HTML for an empty-state placeholder.
 * Used when a list/table has no rows to display.
 */
function emptyState(icon, title, text) {
    return `
        <div class="empty-state">
            <i class="bi ${icon} empty-state-icon"></i>
            <div class="empty-state-title">${title}</div>
            <div class="empty-state-text">${text}</div>
        </div>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// GLOBAL EVENT LISTENERS
// ══════════════════════════════════════════════════════════════════════════════

document.addEventListener('click', e => {
    // Mobile menu toggle
    if (e.target.closest('#mobile-menu-toggle')) {
        const sidebar = document.querySelector('.sidebar-content');
        const overlay = document.getElementById('mobile-overlay');
        if (sidebar) sidebar.classList.toggle('show');
        if (overlay) overlay.classList.toggle('show');
    } 
    // Close mobile menu when clicking overlay or any nav-link
    else if (e.target.matches('#mobile-overlay') || e.target.closest('.nav-link')) {
        const sidebar = document.querySelector('.sidebar-content');
        const overlay = document.getElementById('mobile-overlay');
        if (sidebar && sidebar.classList.contains('show')) {
            sidebar.classList.remove('show');
            if (overlay) overlay.classList.remove('show');
        }
    }
});
