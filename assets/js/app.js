
// BETS – SPA Router 

const API_BASE = 'api/';
let currentUser = null;

// ----- Toast notification system -----
function showToast(message, type = 'success', title = null) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const icons = { success: 'bi-check-circle-fill', error: 'bi-x-circle-fill', info: 'bi-info-circle-fill' };
    const titles = { success: 'Success', error: 'Error', info: 'Info' };

    const toast = document.createElement('div');
    toast.className = `bets-toast toast-${type}`;
    toast.innerHTML = `
        <div class="bets-toast-icon"><i class="bi ${icons[type] || icons.info}"></i></div>
        <div class="bets-toast-body">
            <div class="bets-toast-title">${title || titles[type]}</div>
            <div class="bets-toast-message">${message}</div>
        </div>
    `;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => toast.remove(), 350);
    }, 3800);
}

// ----- Skeleton helpers -----
function skeletonStats(n = 3) {
    return Array.from({ length: n }, () =>
        `<div class="col-md-4"><div class="skeleton skeleton-stat"></div></div>`
    ).join('');
}

function skeletonRows(n = 5) {
    return Array.from({ length: n }, () =>
        `<div class="skeleton skeleton-row"></div>`
    ).join('');
}

// ----- Router -----
async function route() {
    const hash = location.hash.slice(1) || 'login';
    const main = document.getElementById('main-content');
    main.innerHTML = '';

    // SECURITY: Always verify authentication before rendering protected pages
    try {
        if (hash !== 'login' && hash !== 'signup') {
            currentUser = await fetchUser();
            if (!currentUser) { location.hash = '#login'; return; }
        }
    } catch (e) {
        location.hash = '#login';
        return;
    }

    // Auth pages get a special body class for the gradient background
    if (hash === 'login' || hash === 'signup') {
        document.body.classList.add('auth-page');
    } else {
        document.body.classList.remove('auth-page');
    }

    // SECURITY: Clear sidebar and re-render for each navigation
    document.getElementById('sidebar')?.remove();

    if (currentUser && hash !== 'login' && hash !== 'signup') {
        renderSidebar();
        updateActiveNav(hash);
    }

    switch (hash) {
        case 'login':         renderLogin();                                          break;
        case 'signup':        renderSignup();                                         break;
        case 'dashboard':     renderDashboard();                                      break;
        case 'entries':       renderEntries();                                        break;
        case 'admin/users':
            if (currentUser?.role !== 'admin') { location.hash = '#dashboard'; return; }
            renderAdminUsers();
            break;
        case 'admin/projects':
            if (currentUser?.role !== 'admin') { location.hash = '#dashboard'; return; }
            renderAdminProjects();
            break;
        default:
            location.hash = '#login';
    }
}

window.addEventListener('hashchange', route);
window.addEventListener('load', route);

// ----- API Helpers -----
async function apiCall(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
    };
    if (body) options.body = JSON.stringify(body);
    const res = await fetch(API_BASE + endpoint, options);

    // Log debug headers
    console.log('Response debug headers:', {
        'X-Debug-Projects-Count': res.headers.get('X-Debug-Projects-Count'),
        'X-Debug-Total-Assignments': res.headers.get('X-Debug-Total-Assignments'),
        'X-Debug-Current-User-Id': res.headers.get('X-Debug-Current-User-Id'),
        'X-Debug-Requested-User-Id': res.headers.get('X-Debug-Requested-User-Id'),
        'X-Debug-Session-Id': res.headers.get('X-Debug-Session-Id'),
        'X-Debug-Auth': res.headers.get('X-Debug-Auth'),
        'X-Debug-User-Id': res.headers.get('X-Debug-User-Id'),
        status: res.status
    });

    if (res.status === 401) { currentUser = null; location.hash = '#login'; throw new Error('Unauthorized'); }
    if (res.status === 403) { showToast('Access denied.', 'error'); throw new Error('Forbidden'); }
    if (!res.ok) {
        let err;
        try { err = await res.json(); } catch { throw new Error(`Request failed (${res.status})`); }
        throw new Error(err.error || 'Request failed');
    }
    return res.json();
}

async function fetchUser() {
    try {
        const data = await apiCall('me.php');
        return data.user;
    } catch (e) {
        return null;
    }
}

// ----- Sidebar -----
function renderSidebar() {
    const initials = (currentUser.username || '?').slice(0, 2).toUpperCase();
    const sidebarEl = document.createElement('div');
    sidebarEl.id = 'sidebar';
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
                        <i class="bi bi-journal-text"></i> Time Entries
                    </a>
                </li>
                ${currentUser.role === 'admin' ? `
                <li class="sidebar-section-label">Admin</li>
                <li>
                    <a href="#admin/projects" class="nav-link" data-page="admin/projects">
                        <i class="bi bi-folder-fill"></i> Projects
                    </a>
                </li>
                <li>
                    <a href="#admin/users" class="nav-link" data-page="admin/users">
                        <i class="bi bi-people-fill"></i> Users
                    </a>
                </li>` : ''}
            </ul>

            <div class="sidebar-footer">
                <div class="sidebar-user">
                    <div class="sidebar-avatar">${initials}</div>
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

function updateActiveNav(page) {
    document.querySelectorAll('#sidebar .nav-link').forEach(link => {
        link.classList.toggle('active', link.getAttribute('data-page') === page);
    });
}

// ----- Logout -----
async function logout() {
    await apiCall('logout.php', 'POST');
    location.hash = '#login';
}

// ======================================================
// AUTH PAGES
// ======================================================

// ----- Login -----
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
            await apiCall('login.php', 'POST', {
                username: form.username.value,
                password: form.password.value
            });
            location.hash = '#dashboard';
        } catch (e) {
            err.textContent = e.message;
            err.classList.remove('d-none');
            btn.disabled = false;
            btn.innerHTML = `<i class="bi bi-arrow-right-circle"></i> Sign In`;
        }
    });
}

// ----- Signup -----
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
                        <label class="form-label" for="signup-username">Username</label>
                        <input id="signup-username" type="text" class="form-control" name="username"
                               required minlength="3" placeholder="At least 3 characters" autocomplete="username">
                    </div>
                    <div class="mb-3">
                        <label class="form-label" for="signup-email">Email</label>
                        <input id="signup-email" type="email" class="form-control" name="email"
                               required placeholder="you@example.com" autocomplete="email">
                    </div>
                    <div class="mb-4">
                        <label class="form-label" for="signup-password">Password</label>
                        <input id="signup-password" type="password" class="form-control" name="password"
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

// ======================================================
// DASHBOARD
// ======================================================
async function renderDashboard() {
    const main = document.getElementById('main-content');
    const isAdmin = currentUser.role === 'admin';

    // Skeleton while loading
    main.innerHTML = `
        <div class="page-header fade-in">
            <div>
                <h2 class="page-title">Dashboard</h2>
                <p class="page-subtitle">Welcome back, ${currentUser.username} 👋</p>
            </div>
        </div>
        <div class="row g-3 mb-4">${skeletonStats(isAdmin ? 3 : 2)}</div>
        <div class="panel fade-in">
            <div class="panel-header"><h3 class="panel-title">Recent Entries</h3></div>
            <div class="p-4">${skeletonRows(5)}</div>
        </div>
    `;

    try {
        const data = await apiCall('dashboard.php');

        let statsHtml = '';
        if (isAdmin) {
            statsHtml = `
                <div class="col-md-4">
                    <div class="stat-card stat-violet fade-in">
                        <div class="stat-card-icon"><i class="bi bi-people-fill"></i></div>
                        <div class="stat-card-value">${data.total_users}</div>
                        <div class="stat-card-label">Total Users</div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="stat-card stat-cyan fade-in">
                        <div class="stat-card-icon"><i class="bi bi-calendar-check-fill"></i></div>
                        <div class="stat-card-value">${data.entries_today}</div>
                        <div class="stat-card-label">Entries Today</div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="stat-card stat-emerald fade-in">
                        <div class="stat-card-icon"><i class="bi bi-clock-fill"></i></div>
                        <div class="stat-card-value">${data.total_hours_today}</div>
                        <div class="stat-card-label">Hours Logged Today</div>
                    </div>
                </div>`;
        } else {
            statsHtml = `
                <div class="col-md-6">
                    <div class="stat-card stat-cyan fade-in">
                        <div class="stat-card-icon"><i class="bi bi-calendar-check-fill"></i></div>
                        <div class="stat-card-value">${data.entries_today}</div>
                        <div class="stat-card-label">My Entries Today</div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="stat-card stat-emerald fade-in">
                        <div class="stat-card-icon"><i class="bi bi-clock-fill"></i></div>
                        <div class="stat-card-value">${data.total_hours_today}</div>
                        <div class="stat-card-label">My Hours Today</div>
                    </div>
                </div>`;
        }

        let tableHtml = '';
        if (data.recent_entries.length > 0) {
            const rows = data.recent_entries.map(e => `
                <tr>
                    ${isAdmin ? `<td><span class="fw-500">${e.username}</span></td>` : ''}
                    <td><span class="fw-500">${e.project_name}</span></td>
                    <td>${formatDate(e.entry_date)}</td>
                    <td>${formatTime(e.start_time)}</td>
                    <td>${formatTime(e.end_time)}</td>
                </tr>`).join('');

            tableHtml = `
                <div style="overflow-x:auto;">
                <table class="bets-table">
                    <thead>
                        <tr>
                            ${isAdmin ? '<th>User</th>' : ''}
                            <th>Project</th><th>Date</th><th>Start</th><th>End</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
                </div>`;
        } else {
            tableHtml = `
                <div class="empty-state">
                    <i class="bi bi-journal-x empty-state-icon"></i>
                    <div class="empty-state-title">No recent entries</div>
                    <div class="empty-state-text">Time entries will appear here once logged.</div>
                </div>`;
        }

        main.innerHTML = `
            <div class="page-header fade-in">
                <div>
                    <h2 class="page-title">Dashboard</h2>
                    <p class="page-subtitle">Welcome back, ${currentUser.username} 👋</p>
                </div>
            </div>
            <div class="row g-3 mb-4">${statsHtml}</div>
            <div class="panel fade-in">
                <div class="panel-header">
                    <h3 class="panel-title"><i class="bi bi-clock-history me-2" style="color:var(--accent)"></i>Recent Entries</h3>
                </div>
                ${tableHtml}
            </div>
        `;
    } catch (err) {
        main.innerHTML = `<div class="alert alert-danger"><i class="bi bi-x-circle"></i>${err.message}</div>`;
    }
}

// ======================================================
// TIME ENTRIES
// ======================================================
let userProjects = [];

async function renderEntries() {
    const main = document.getElementById('main-content');
    main.innerHTML = `
        <div class="page-header fade-in">
            <div>
                <h2 class="page-title">Time Entries</h2>
                <p class="page-subtitle">Track and manage your logged time</p>
            </div>
            ${currentUser.role !== 'admin'
                ? `<button class="btn btn-primary" id="add-entry-btn" onclick="showEntryForm()">
                       <i class="bi bi-plus-lg"></i> Add Entry
                   </button>` : ''}
        </div>
        <div class="panel fade-in">
            <div id="entries-list" class="p-4">${skeletonRows(6)}</div>
        </div>

        <!-- Entry Modal -->
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
                                <label class="form-label">Task Description <span class="text-muted fw-normal">(optional)</span></label>
                                <textarea name="task_description" class="form-control" placeholder="Describe the work done…"></textarea>
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
        </div>
    `;

    await loadUserProjects();
    await loadEntriesList();

    const addBtn = document.getElementById('add-entry-btn');
    if (addBtn && userProjects.length === 0) {
        addBtn.disabled = true;
        addBtn.title = 'No projects assigned. Please contact the admin.';
    }
}

async function loadUserProjects() {
    // SECURITY: Only load projects for non-admin users
    if (currentUser.role === 'admin') return;
    try {
        console.log('Fetching projects for user_id:', currentUser.id);
        const response = await apiCall(`assignments.php?user_id=${currentUser.id}`);
        console.log('Raw response:', response);
        userProjects = Array.isArray(response) ? response : [];
    } catch (err) {
        console.error('Failed to load projects:', err.message);
        userProjects = [];
    }
}

async function loadEntriesList() {
    const listDiv = document.getElementById('entries-list');

    // SECURITY: Show warning if user has no projects assigned (non-admins only)
    if (currentUser.role !== 'admin' && userProjects.length === 0) {
        listDiv.innerHTML = `
            <div class="empty-state">
                <i class="bi bi-folder-x empty-state-icon"></i>
                <div class="empty-state-title">No projects assigned</div>
                <div class="empty-state-text">Contact your admin to get a project assigned.</div>
            </div>`;
        return;
    }

    try {
        const entries = await apiCall('entries.php');
        if (entries.length === 0) {
            listDiv.innerHTML = `
                <div class="empty-state">
                    <i class="bi bi-journal-x empty-state-icon"></i>
                    <div class="empty-state-title">No time entries yet</div>
                    <div class="empty-state-text">Click "Add Entry" to log your first entry.</div>
                </div>`;
            return;
        }

        const isAdmin = currentUser.role === 'admin';
        const rows = entries.map(e => `
            <tr>
                ${isAdmin ? `<td><span class="fw-500">${e.username}</span></td>` : ''}
                <td><span class="fw-500">${e.project_name}</span></td>
                <td>${formatDate(e.entry_date)}</td>
                <td>${formatTime(e.start_time)}</td>
                <td>${formatTime(e.end_time)}</td>
                <td>
                    ${!isAdmin ? `
                        <button class="tbl-action tbl-action-edit"
                            onclick="editEntry(${e.id}, ${e.project_id || 'null'}, '${escAttr(e.task_description || '')}', '${e.entry_date}', '${e.start_time}', '${e.end_time}')"
                            title="Edit">
                            <i class="bi bi-pencil-fill"></i>
                        </button>
                        <button class="tbl-action tbl-action-delete"
                            onclick="deleteEntry(${e.id})"
                            title="Delete">
                            <i class="bi bi-trash-fill"></i>
                        </button>` : ''}
                </td>
            </tr>`).join('');

        listDiv.innerHTML = `
            <div style="overflow-x:auto;">
            <table class="bets-table">
                <thead>
                    <tr>
                        ${isAdmin ? '<th>User</th>' : ''}
                        <th>Project</th><th>Date</th><th>Start</th><th>End</th><th>Actions</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
            </div>`;
    } catch (err) {
        listDiv.innerHTML = `<div class="alert alert-danger"><i class="bi bi-x-circle"></i> ${err.message}</div>`;
    }
}

function showEntryForm(id = null, projectId = null, task = '', date = '', start = '', end = '') {
    if (userProjects.length === 0) {
        showToast('No project assigned. Please contact the admin.', 'error');
        return;
    }

    const modal = new bootstrap.Modal(document.getElementById('entryModal'));
    document.getElementById('entryModalLabel').textContent = id ? 'Edit Entry' : 'Add Entry';
    const form = document.getElementById('entry-form');
    form.id.value              = id || '';
    form.task_description.value = task;
    form.entry_date.value      = date;
    form.start_time.value      = start;
    form.end_time.value        = end;

    const select = document.getElementById('project-select');
    select.innerHTML = '<option value="">Select a project…</option>';
    userProjects.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.name || p.project_name;
        if (p.id == projectId) opt.selected = true;
        select.appendChild(opt);
    });

    const saveBtn = document.getElementById('save-entry-btn');
    saveBtn.onclick = async () => {
        const f = document.getElementById('entry-form');
        const body = {
            project_id:       f.project_id.value,
            task_description: f.task_description.value,
            entry_date:       f.entry_date.value,
            start_time:       f.start_time.value,
            end_time:         f.end_time.value
        };
        try {
            saveBtn.disabled = true;
            saveBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>Saving…`;
            if (f.id.value) {
                await apiCall(`entries.php?id=${f.id.value}`, 'PUT', body);
                showToast('Entry updated successfully.', 'success');
            } else {
                await apiCall('entries.php', 'POST', body);
                showToast('Entry added successfully.', 'success');
            }
            modal.hide();
            loadEntriesList();
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
    if (!confirm('Delete this time entry?')) return;
    try {
        await apiCall(`entries.php?id=${id}`, 'DELETE');
        showToast('Entry deleted.', 'info');
        loadEntriesList();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// ======================================================
// ADMIN – PROJECTS
// ======================================================
async function renderAdminProjects() {
    const main = document.getElementById('main-content');
    main.innerHTML = `
        <div class="page-header fade-in">
            <div>
                <h2 class="page-title">Projects</h2>
                <p class="page-subtitle">Manage projects and team assignments</p>
            </div>
            <button class="btn btn-primary" onclick="showProjectForm()">
                <i class="bi bi-plus-lg"></i> Add Project
            </button>
        </div>
        <div class="panel fade-in">
            <div id="projects-list" class="p-4">${skeletonRows(5)}</div>
        </div>

        <!-- Project Modal -->
        <div class="modal fade" id="projectModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="projectModalLabel">Add Project</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="project-form">
                            <input type="hidden" name="id">
                            <div class="mb-3">
                                <label class="form-label">Project Name</label>
                                <input type="text" name="name" class="form-control" required placeholder="e.g. Website Redesign">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Description <span class="text-muted fw-normal">(optional)</span></label>
                                <textarea name="description" class="form-control" placeholder="Brief description…"></textarea>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Assign to Users</label>
                                <select name="user_ids" class="form-select" multiple id="user-ids-select" style="height:140px;">
                                </select>
                                <small class="text-muted">Hold Ctrl / Cmd to select multiple</small>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button class="btn btn-primary" id="save-project-btn">
                            <i class="bi bi-check-lg"></i> Save Project
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
            listDiv.innerHTML = `
                <div class="empty-state">
                    <i class="bi bi-folder-x empty-state-icon"></i>
                    <div class="empty-state-title">No projects yet</div>
                    <div class="empty-state-text">Create your first project to get started.</div>
                </div>`;
            return;
        }

        const rows = projects.map(p => {
            const assignedUsers = p.assigned_users || 0;
            return `<tr>
                <td><span class="fw-500">${p.name}</span></td>
                <td class="text-muted">${p.description || '<em>—</em>'}</td>
                <td>
                    <span class="badge-role badge-user">
                        <i class="bi bi-person"></i> ${assignedUsers} user${assignedUsers !== 1 ? 's' : ''}
                    </span>
                </td>
                <td class="text-muted" style="font-size:0.8rem;">${formatDate(p.created_at)}</td>
                <td>
                    <button class="tbl-action tbl-action-edit"
                        onclick="editProject(${p.id}, '${escAttr(p.name)}', '${escAttr(p.description || '')}')"
                        title="Edit">
                        <i class="bi bi-pencil-fill"></i>
                    </button>
                    <button class="tbl-action tbl-action-delete"
                        onclick="deleteProject(${p.id})"
                        title="Delete">
                        <i class="bi bi-trash-fill"></i>
                    </button>
                </td>
            </tr>`;
        }).join('');

        listDiv.innerHTML = `
            <div style="overflow-x:auto;">
            <table class="bets-table">
                <thead>
                    <tr><th>Project</th><th>Description</th><th>Assigned</th><th>Created</th><th>Actions</th></tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
            </div>`;
    } catch (err) {
        listDiv.innerHTML = `<div class="alert alert-danger"><i class="bi bi-x-circle"></i> ${err.message}</div>`;
    }
}

async function loadUsersForSelection(selectedIds = []) {
    const select = document.getElementById('user-ids-select');
    select.innerHTML = '';
    const users = await apiCall('users.php');
    console.log('Available users for assignment:', users);
    users.forEach(u => {
        const opt = document.createElement('option');
        opt.value = u.id;
        opt.textContent = u.username;
        if (selectedIds.includes(u.id)) opt.selected = true;
        select.appendChild(opt);
    });
}

async function loadAssignedUsers(projectId) {
    try {
        const assignments = await apiCall(`assignments.php?project_id=${projectId}`);
        console.log('Assigned users for project', projectId, ':', assignments);
        return assignments.map(a => a.id);
    } catch (err) {
        console.error('Failed to load assigned users:', err);
        return [];
    }
}

function showProjectForm(id = null, name = '', description = '', userIds = []) {
    const modal = new bootstrap.Modal(document.getElementById('projectModal'));
    document.getElementById('projectModalLabel').textContent = id ? 'Edit Project' : 'Add Project';
    const form = document.getElementById('project-form');
    form.id.value          = id || '';
    form.name.value        = name;
    form.description.value = description;

    loadUsersForSelection(userIds);
    modal.show();

    const saveBtn = document.getElementById('save-project-btn');
    saveBtn.onclick = async () => {
        const f      = document.getElementById('project-form');
        const select = document.getElementById('user-ids-select');
        const selectedUserIds = Array.from(select.selectedOptions).map(o => parseInt(o.value));
        console.log('Saving project - selected user_ids:', selectedUserIds);
        console.log('Select element options count:', select.options.length);

        if (selectedUserIds.length === 0) {
            showToast('Please select at least one user.', 'error');
            return;
        }

        const body = {
            name:        f.name.value,
            description: f.description.value,
            user_ids:    selectedUserIds
        };
        console.log('Request body:', body);
        try {
            saveBtn.disabled = true;
            saveBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>Saving…`;
            if (f.id.value) {
                await apiCall(`projects.php?id=${f.id.value}`, 'PUT', body);
                showToast('Project updated.', 'success');
            } else {
                await apiCall('projects.php', 'POST', body);
                showToast('Project created.', 'success');
            }
            modal.hide();
            loadProjectsList();
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = `<i class="bi bi-check-lg"></i> Save Project`;
        }
    };
}

function editProject(id, name, description) {
    loadAssignedUsers(id).then(userIds => {
        showProjectForm(id, name, description, userIds);
    });
}

async function deleteProject(id) {
    if (!confirm('Delete this project? All related data will be removed.')) return;
    try {
        await apiCall(`projects.php?id=${id}`, 'DELETE');
        showToast('Project deleted.', 'info');
        loadProjectsList();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// ======================================================
// ADMIN – USERS
// ======================================================
async function renderAdminUsers() {
    const main = document.getElementById('main-content');
    main.innerHTML = `
        <div class="page-header fade-in">
            <div>
                <h2 class="page-title">User Administration</h2>
                <p class="page-subtitle">Manage team members and roles</p>
            </div>
            <button class="btn btn-primary" onclick="showUserForm()">
                <i class="bi bi-plus-lg"></i> Add User
            </button>
        </div>
        <div class="panel fade-in">
            <div id="users-list" class="p-4">${skeletonRows(6)}</div>
        </div>

        <!-- User Modal -->
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
                                <input type="text" name="username" class="form-control" required placeholder="Enter username">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Email</label>
                                <input type="email" name="email" class="form-control" required placeholder="user@example.com">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">
                                    Password
                                    <span class="text-muted fw-normal">(leave blank to keep unchanged)</span>
                                </label>
                                <input type="password" name="password" class="form-control" placeholder="At least 6 characters">
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
                            <i class="bi bi-check-lg"></i> Save User
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
            listDiv.innerHTML = `
                <div class="empty-state">
                    <i class="bi bi-people empty-state-icon"></i>
                    <div class="empty-state-title">No users yet</div>
                    <div class="empty-state-text">Add the first user to get started.</div>
                </div>`;
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
                        title="Edit">
                        <i class="bi bi-pencil-fill"></i>
                    </button>
                    <button class="tbl-action tbl-action-delete"
                        onclick="deleteUser(${u.id})"
                        title="Delete">
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
        listDiv.innerHTML = `<div class="alert alert-danger"><i class="bi bi-x-circle"></i> ${err.message}</div>`;
    }
}

function showUserForm(id = null, username = '', email = '', role = 'user') {
    const modal = new bootstrap.Modal(document.getElementById('userModal'));
    document.getElementById('userModalLabel').textContent = id ? 'Edit User' : 'Add User';
    const form = document.getElementById('user-form');
    form.id.value       = id || '';
    form.username.value = username;
    form.email.value    = email;
    form.password.value = '';
    form.role.value     = role;
    form.password.required = !id;

    const saveBtn = document.getElementById('save-user-btn');
    saveBtn.onclick = async () => {
        const f    = document.getElementById('user-form');
        const body = {
            username: f.username.value,
            email:    f.email.value,
            role:     f.role.value
        };
        if (f.password.value) body.password = f.password.value;
        try {
            saveBtn.disabled = true;
            saveBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>Saving…`;
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
            saveBtn.innerHTML = `<i class="bi bi-check-lg"></i> Save User`;
        }
    };
    modal.show();
}

function editUser(id, username, email, role) {
    showUserForm(id, username, email, role);
}

async function deleteUser(id) {
    if (!confirm('Delete this user? All their entries will be removed.')) return;
    try {
        await apiCall(`users.php?id=${id}`, 'DELETE');
        showToast('User deleted.', 'info');
        loadUsersList();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// ======================================================
// UTILITIES
// ======================================================

// Escape attribute values for inline onclick strings
function escAttr(str) {
    return String(str).replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

// Format ISO date to "May 28, 2026"
function formatDate(str) {
    if (!str) return '—';
    try {
        return new Date(str).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch { return str; }
}

// Format "HH:MM:SS" to "HH:MM"
function formatTime(str) {
    if (!str) return '—';
    return str.slice(0, 5);
}
