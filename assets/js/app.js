// Simple SPA router
const API_BASE = 'api/';
let currentUser = null;

// ----- Router -----
async function route() {
    const hash = location.hash.slice(1) || 'login';
    const main = document.getElementById('main-content');
    main.innerHTML = '';
    
    try {
        if (hash !== 'login' && hash !== 'signup') {
            currentUser = await fetchUser();
            if (!currentUser) {
                location.hash = '#login';
                return;
            }
        }
    } catch (e) {
        location.hash = '#login';
        return;
    }

    // Render sidebar once for authenticated users
    if (currentUser && hash !== 'login' && hash !== 'signup') {
        renderSidebar();
        updateActiveNav(hash);
    } else {
        document.getElementById('sidebar')?.remove();
    }

    switch (hash) {
        case 'login':
            renderLogin();
            break;
        case 'signup':
            renderSignup();
            break;
        case 'dashboard':
            renderDashboard();
            break;
        case 'entries':
            renderEntries();
            break;
        case 'admin/users':
            if (currentUser?.role !== 'admin') {
                location.hash = '#dashboard';
                return;
            }
            renderAdminUsers();
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
    };
    if (body) options.body = JSON.stringify(body);
    const res = await fetch(API_BASE + endpoint, options);
    if (res.status === 401) {
        currentUser = null;
        location.hash = '#login';
        throw new Error('Unauthorized');
    }
    if (res.status === 403) {
        alert('Access denied');
        throw new Error('Forbidden');
    }
    if (!res.ok) {
        const err = await res.json();
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

// ----- Navigation -----
function renderSidebar() {
    if (document.getElementById('sidebar')) return; // Already rendered
    
    const sidebarEl = document.createElement('div');
    sidebarEl.id = 'sidebar';
    sidebarEl.innerHTML = `
        <div class="d-flex flex-column p-3 bg-dark text-white sidebar-content">
            <a href="#dashboard" class="d-flex align-items-center mb-4 text-white text-decoration-none">
                <i class="bi bi-clock-fill fs-4 me-2"></i>
                <span class="fs-5 fw-semibold">TrackPro</span>
            </a>
            <ul class="nav nav-pills flex-column mb-auto">
                <li class="nav-item mb-1">
                    <a href="#dashboard" class="nav-link text-white" data-page="dashboard">
                        <i class="bi bi-speedometer2 me-2"></i>Dashboard
                    </a>
                </li>
                <li class="nav-item mb-1">
                    <a href="#entries" class="nav-link text-white" data-page="entries">
                        <i class="bi bi-journal-text me-2"></i>Time Entries
                    </a>
                </li>
                ${currentUser.role === 'admin' ? 
                    '<li class="nav-item mb-1"><a href="#admin/users" class="nav-link text-white" data-page="admin/users"><i class="bi bi-people me-2"></i>User Admin</a></li>' : ''}
            </ul>
            <hr class="text-white">
            <div class="d-flex align-items-center mb-3">
                <div class="bg-primary rounded-circle d-flex align-items-center justify-content-center me-2" style="width: 32px; height: 32px;">
                    <i class="bi bi-person-fill small"></i>
                </div>
                <div>
                    <div class="small">${currentUser.username}</div>
                    <div class="small text-muted">${currentUser.role}</div>
                </div>
            </div>
            <button class="btn btn-outline-light btn-sm" onclick="logout()">
                <i class="bi bi-box-arrow-right me-1"></i>Logout
            </button>
        </div>
    `;
    document.getElementById('app').prepend(sidebarEl);
}

function updateActiveNav(page) {
    document.querySelectorAll('#sidebar .nav-link').forEach(link => {
        link.classList.toggle('active', link.getAttribute('data-page') === page);
    });
}

// ----- Login Page -----
function renderLogin() {
    const main = document.getElementById('main-content');
    main.innerHTML = `
        <div class="login-container card p-4">
            <div class="text-center mb-4">
                <i class="bi bi-clock-fill text-primary" style="font-size: 3rem;"></i>
                <h3 class="mt-2 mb-0">Best Employee Tracking</h3>
                <p class="text-muted">Sign in to your account</p>
            </div>
            <div id="login-error" class="alert alert-danger d-none"></div>
            <form id="login-form">
                <div class="mb-3">
                    <label class="form-label">Username</label>
                    <input type="text" class="form-control" name="username" required placeholder="Enter your username">
                </div>
                <div class="mb-3">
                    <label class="form-label">Password</label>
                    <input type="password" class="form-control" name="password" required placeholder="Enter your password">
                </div>
                <button type="submit" class="btn btn-primary w-100 btn-lg">Login</button>
            </form>
            <p class="text-center mt-3 mb-0">
                <a href="#signup">Create an account</a>
            </p>
        </div>
    `;
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const btn = form.querySelector('button');
        const errDiv = document.getElementById('login-error');
        errDiv.classList.add('d-none');
        btn.disabled = true;
        btn.textContent = 'Signing in...';
        try {
            const res = await apiCall('login.php', 'POST', {
                username: form.username.value,
                password: form.password.value
            });
            location.hash = '#dashboard';
        } catch (err) {
            errDiv.textContent = err.message;
            errDiv.classList.remove('d-none');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Login';
        }
    });
}

async function logout() {
    await apiCall('logout.php', 'POST');
    location.hash = '#login';
}

// ----- Signup Page -----
function renderSignup() {
    const main = document.getElementById('main-content');
    main.innerHTML = `
        <div class="login-container card p-4">
            <div class="text-center mb-4">
                <i class="bi bi-person-plus-fill text-primary" style="font-size: 3rem;"></i>
                <h3 class="mt-2 mb-0">Create Account</h3>
                <p class="text-muted">Join the employee tracking system</p>
            </div>
            <div id="signup-error" class="alert alert-danger d-none"></div>
            <div id="signup-success" class="alert alert-success d-none"></div>
            <form id="signup-form">
                <div class="mb-3">
                    <label class="form-label">Username</label>
                    <input type="text" class="form-control" name="username" required minlength="3" placeholder="At least 3 characters">
                </div>
                <div class="mb-3">
                    <label class="form-label">Email</label>
                    <input type="email" class="form-control" name="email" required placeholder="you@example.com">
                </div>
                <div class="mb-3">
                    <label class="form-label">Password</label>
                    <input type="password" class="form-control" name="password" required minlength="6" placeholder="At least 6 characters">
                </div>
                <button type="submit" class="btn btn-primary w-100 btn-lg">Create Account</button>
            </form>
            <p class="text-center mt-3 mb-0">
                <a href="#login">Already have an account? Sign in</a>
            </p>
        </div>
    `;
    document.getElementById('signup-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const btn = form.querySelector('button');
        const errDiv = document.getElementById('signup-error');
        const successDiv = document.getElementById('signup-success');
        errDiv.classList.add('d-none');
        successDiv.classList.add('d-none');
        btn.disabled = true;
        btn.textContent = 'Creating account...';
        try {
            await apiCall('signup.php', 'POST', {
                username: form.username.value,
                email: form.email.value,
                password: form.password.value
            });
            successDiv.textContent = 'Account created successfully! Redirecting to login...';
            successDiv.classList.remove('d-none');
            setTimeout(() => location.hash = '#login', 1500);
        } catch (err) {
            errDiv.textContent = err.message;
            errDiv.classList.remove('d-none');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Create Account';
        }
    });
}

// ----- Dashboard -----
async function renderDashboard() {
    const main = document.getElementById('main-content');
    main.innerHTML = '<div class="text-center p-5">Loading dashboard...</div>';
    try {
        const data = await apiCall('dashboard.php');
        const user = currentUser;
        let html = `<h2 class="mb-4">Dashboard</h2>`;
        if (user.role === 'admin') {
            html += `
            <div class="row g-3">
                <div class="col-md-4">
                    <div class="card card-stats p-3">
                        <div class="d-flex align-items-center">
                            <div class="bg-primary bg-opacity-10 p-3 rounded me-3">
                                <i class="bi bi-people text-primary fs-4"></i>
                            </div>
                            <div>
                                <h6 class="mb-1 text-muted">Total Users</h6>
                                <p class="display-6 mb-0">${data.total_users}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card card-stats p-3">
                        <div class="d-flex align-items-center">
                            <div class="bg-primary bg-opacity-10 p-3 rounded me-3">
                                <i class="bi bi-calendar-check text-primary fs-4"></i>
                            </div>
                            <div>
                                <h6 class="mb-1 text-muted">Entries Today</h6>
                                <p class="display-6 mb-0">${data.entries_today}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card card-stats p-3">
                        <div class="d-flex align-items-center">
                            <div class="bg-primary bg-opacity-10 p-3 rounded me-3">
                                <i class="bi bi-clock text-primary fs-4"></i>
                            </div>
                            <div>
                                <h6 class="mb-1 text-muted">Total Hours Today</h6>
                                <p class="display-6 mb-0">${data.total_hours_today}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
        } else {
            html += `
            <div class="row g-3">
                <div class="col-md-6">
                    <div class="card card-stats p-3">
                        <div class="d-flex align-items-center">
                            <div class="bg-primary bg-opacity-10 p-3 rounded me-3">
                                <i class="bi bi-calendar-check text-primary fs-4"></i>
                            </div>
                            <div>
                                <h6 class="mb-1 text-muted">My Entries Today</h6>
                                <p class="display-6 mb-0">${data.entries_today}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card card-stats p-3">
                        <div class="d-flex align-items-center">
                            <div class="bg-primary bg-opacity-10 p-3 rounded me-3">
                                <i class="bi bi-clock text-primary fs-4"></i>
                            </div>
                            <div>
                                <h6 class="mb-1 text-muted">My Hours Today</h6>
                                <p class="display-6 mb-0">${data.total_hours_today}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
        }
        html += `<h4 class="mt-4 mb-3">Recent Entries</h4>`;
        if (data.recent_entries.length > 0) {
            html += `<table class="table table-hover"><thead class="table-light"><tr>
                ${user.role === 'admin' ? '<th>User</th>' : ''}
                <th>Project</th><th>Date</th><th>Start</th><th>End</th></tr></thead><tbody>`;
            data.recent_entries.forEach(e => {
                html += `<tr>
                    ${user.role === 'admin' ? `<td>${e.username}</td>` : ''}
                    <td>${e.project_name}</td>
                    <td>${e.entry_date}</td>
                    <td>${e.start_time}</td>
                    <td>${e.end_time}</td>
                </tr>`;
            });
            html += `</tbody></table>`;
        } else {
            html += `<div class="alert alert-info">No recent entries.</div>`;
        }
        main.innerHTML = html;
    } catch (err) {
        main.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
    }
}

// ----- Time Entries Page -----
async function renderEntries() {
    const main = document.getElementById('main-content');
    main.innerHTML = `<div class="d-flex justify-content-between align-items-center mb-4">
        <h2 class="mb-0">Time Entries</h2>
        <button class="btn btn-primary" onclick="showEntryForm()">
            <i class="bi bi-plus-lg me-1"></i>Add Entry
        </button>
    </div>
    <div id="entries-list">Loading...</div>
    <!-- Modal for add/edit -->
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
              <div class="mb-3"><label class="form-label">Project Name</label><input type="text" name="project_name" class="form-control" required placeholder="Project name"></div>
              <div class="mb-3"><label class="form-label">Task Description</label><textarea name="task_description" class="form-control" placeholder="Optional task details"></textarea></div>
              <div class="mb-3"><label class="form-label">Date</label><input type="date" name="entry_date" class="form-control" required></div>
              <div class="row">
                <div class="col"><label class="form-label">Start Time</label><input type="time" name="start_time" class="form-control" required></div>
                <div class="col"><label class="form-label">End Time</label><input type="time" name="end_time" class="form-control" required></div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button class="btn btn-primary" id="save-entry-btn">Save</button>
          </div>
        </div>
      </div>
    </div>`;
    await loadEntriesList();
}

async function loadEntriesList() {
    const listDiv = document.getElementById('entries-list');
    try {
        const entries = await apiCall('entries.php');
        if (entries.length === 0) {
            listDiv.innerHTML = '<div class="alert alert-info">No time entries found.</div>';
            return;
        }
        let html = '<table class="table table-hover"><thead class="table-light"><tr>';
        if (currentUser.role === 'admin') html += '<th>User</th>';
        html += '<th>Project</th><th>Date</th><th>Start</th><th>End</th><th>Actions</th></tr></thead><tbody>';
        entries.forEach(e => {
            html += `<tr>
                ${currentUser.role === 'admin' ? `<td>${e.username}</td>` : ''}
                <td>${e.project_name}</td>
                <td>${e.entry_date}</td>
                <td>${e.start_time}</td>
                <td>${e.end_time}</td>
                <td>
                    <span class="text-primary me-2" onclick="editEntry(${e.id}, '${e.project_name}', '${e.task_description || ''}', '${e.entry_date}', '${e.start_time}', '${e.end_time}')" title="Edit"><i class="bi bi-pencil"></i></span>
                    <span class="text-danger" onclick="deleteEntry(${e.id})" title="Delete"><i class="bi bi-trash"></i></span>
                </td>
            </tr>`;
        });
        html += '</tbody></table>';
        listDiv.innerHTML = html;
    } catch (err) {
        listDiv.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
    }
}

function showEntryForm(id = null, project = '', task = '', date = '', start = '', end = '') {
    const modal = new bootstrap.Modal(document.getElementById('entryModal'));
    document.getElementById('entryModalLabel').textContent = id ? 'Edit Entry' : 'Add Entry';
    const form = document.getElementById('entry-form');
    form.id.value = id || '';
    form.project_name.value = project;
    form.task_description.value = task;
    form.entry_date.value = date;
    form.start_time.value = start;
    form.end_time.value = end;
    
    const saveBtn = document.getElementById('save-entry-btn');
    saveBtn.onclick = async () => {
        const f = document.getElementById('entry-form');
        const body = {
            project_name: f.project_name.value,
            task_description: f.task_description.value,
            entry_date: f.entry_date.value,
            start_time: f.start_time.value,
            end_time: f.end_time.value
        };
        try {
            if (f.id.value) {
                await apiCall(`entries.php?id=${f.id.value}`, 'PUT', body);
            } else {
                await apiCall('entries.php', 'POST', body);
            }
            modal.hide();
            loadEntriesList();
        } catch (err) {
            alert(err.message);
        }
    };
    modal.show();
}

function editEntry(id, project, task, date, start, end) {
    showEntryForm(id, project, task, date, start, end);
}

async function deleteEntry(id) {
    if (!confirm('Delete this entry?')) return;
    try {
        await apiCall(`entries.php?id=${id}`, 'DELETE');
        loadEntriesList();
    } catch (err) {
        alert(err.message);
    }
}

// ----- Admin Users Page -----
async function renderAdminUsers() {
    const main = document.getElementById('main-content');
    main.innerHTML = `<div class="d-flex justify-content-between align-items-center mb-4">
        <h2 class="mb-0">User Administration</h2>
        <button class="btn btn-primary" onclick="showUserForm()">
            <i class="bi bi-plus-lg me-1"></i>Add User
        </button>
    </div>
    <div id="users-list">Loading...</div>
    <!-- Modal -->
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
              <div class="mb-3"><label class="form-label">Username</label><input type="text" name="username" class="form-control" required placeholder="Enter username"></div>
              <div class="mb-3"><label class="form-label">Email</label><input type="email" name="email" class="form-control" required placeholder="user@example.com"></div>
              <div class="mb-3"><label class="form-label">Password <small class="text-muted">(leave blank to keep unchanged on edit)</small></label><input type="password" name="password" class="form-control" placeholder="At least 6 characters"></div>
              <div class="mb-3"><label class="form-label">Role</label>
                <select name="role" class="form-select">
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button class="btn btn-primary" id="save-user-btn">Save</button>
          </div>
        </div>
      </div>
    </div>`;
    await loadUsersList();
}

async function loadUsersList() {
    const listDiv = document.getElementById('users-list');
    try {
        const users = await apiCall('users.php');
        let html = '<table class="table table-hover"><thead class="table-light"><tr><th>ID</th><th>Username</th><th>Email</th><th>Role</th><th>Created</th><th>Actions</th></tr></thead><tbody>';
        users.forEach(u => {
            html += `<tr>
                <td>${u.id}</td>
                <td>${u.username}</td>
                <td>${u.email}</td>
                <td><span class="badge bg-${u.role === 'admin' ? 'primary' : 'secondary'}">${u.role}</span></td>
                <td>${u.created_at}</td>
                <td>
                    <span class="text-primary me-2" onclick="editUser(${u.id}, '${u.username}', '${u.email}', '${u.role}')" title="Edit"><i class="bi bi-pencil"></i></span>
                    <span class="text-danger" onclick="deleteUser(${u.id})" title="Delete"><i class="bi bi-trash"></i></span>
                </td>
            </tr>`;
        });
        html += '</tbody></table>';
        listDiv.innerHTML = html;
    } catch (err) {
        listDiv.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
    }
}

function showUserForm(id = null, username = '', email = '', role = 'user') {
    const modal = new bootstrap.Modal(document.getElementById('userModal'));
    document.getElementById('userModalLabel').textContent = id ? 'Edit User' : 'Add User';
    const form = document.getElementById('user-form');
    form.id.value = id || '';
    form.username.value = username;
    form.email.value = email;
    form.password.value = '';
    form.role.value = role;
    if (id) form.password.required = false; else form.password.required = true;
    
    const saveBtn = document.getElementById('save-user-btn');
    saveBtn.onclick = async () => {
        const f = document.getElementById('user-form');
        const body = {
            username: f.username.value,
            email: f.email.value,
            role: f.role.value
        };
        if (f.password.value) body.password = f.password.value;
        try {
            if (f.id.value) {
                await apiCall(`users.php?id=${f.id.value}`, 'PUT', body);
            } else {
                await apiCall('users.php', 'POST', body);
            }
            modal.hide();
            loadUsersList();
        } catch (err) {
            alert(err.message);
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
        loadUsersList();
    } catch (err) {
        alert(err.message);
    }
}
