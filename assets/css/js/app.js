// Simple SPA router
const API_BASE = 'api/';
let currentUser = null;

// ----- Router -----
async function route() {
    const hash = location.hash.slice(1) || 'login';
    const main = document.getElementById('main-content');
    main.innerHTML = '';
    
    try {
        // Check authentication and fetch user data
        if (hash !== 'login') {
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

    // Render navigation if authenticated
    if (currentUser && hash !== 'login') {
        renderNavbar();
    } else {
        document.querySelector('nav')?.remove();
    }

    switch (hash) {
        case 'login':
            renderLogin();
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
function renderNavbar() {
    const nav = document.createElement('nav');
    nav.className = 'navbar navbar-expand-lg navbar-dark bg-primary mb-4';
    nav.innerHTML = `
        <div class="container">
            <a class="navbar-brand" href="#dashboard">TrackPro</a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                <span class="navbar-toggler-icon"></span>
            </button>
            <div class="collapse navbar-collapse" id="navbarNav">
                <ul class="navbar-nav me-auto">
                    <li class="nav-item"><a class="nav-link" href="#dashboard">Dashboard</a></li>
                    <li class="nav-item"><a class="nav-link" href="#entries">Time Entries</a></li>
                    ${currentUser.role === 'admin' ? 
                        '<li class="nav-item"><a class="nav-link" href="#admin/users">User Admin</a></li>' : ''}
                </ul>
                <span class="navbar-text text-white me-3">
                    ${currentUser.username} (${currentUser.role})
                </span>
                <button class="btn btn-outline-light btn-sm" onclick="logout()">Logout</button>
            </div>
        </div>
    `;
    document.getElementById('app').prepend(nav);
}

// ----- Login Page -----
function renderLogin() {
    const main = document.getElementById('main-content');
    main.innerHTML = `
        <div class="login-container card p-4 shadow">
            <h3 class="text-center mb-4">Sign In</h3>
            <div id="login-error" class="alert alert-danger d-none"></div>
            <form id="login-form">
                <div class="mb-3">
                    <label>Username</label>
                    <input type="text" class="form-control" name="username" required>
                </div>
                <div class="mb-3">
                    <label>Password</label>
                    <input type="password" class="form-control" name="password" required>
                </div>
                <button type="submit" class="btn btn-primary w-100">Login</button>
            </form>
            <p class="text-center mt-3 mb-0 text-muted">
                Default admin: admin / admin123<br>
                Default user: john.doe / user123
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

// ----- Dashboard -----
async function renderDashboard() {
    const main = document.getElementById('main-content');
    main.innerHTML = '<div class="text-center p-5">Loading dashboard...</div>';
    try {
        const data = await apiCall('dashboard.php');
        const user = currentUser;
        let html = `<h2>Dashboard</h2>`;
        if (user.role === 'admin') {
            html += `
            <div class="row mt-4">
                <div class="col-md-4">
                    <div class="card card-stats p-3">
                        <h5>Total Users</h5>
                        <p class="display-6">${data.total_users}</p>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card card-stats p-3">
                        <h5>Entries Today</h5>
                        <p class="display-6">${data.entries_today}</p>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card card-stats p-3">
                        <h5>Total Hours Today</h5>
                        <p class="display-6">${data.total_hours_today}</p>
                    </div>
                </div>
            </div>`;
        } else {
            html += `
            <div class="row mt-4">
                <div class="col-md-6">
                    <div class="card card-stats p-3">
                        <h5>My Entries Today</h5>
                        <p class="display-6">${data.entries_today}</p>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card card-stats p-3">
                        <h5>My Hours Today</h5>
                        <p class="display-6">${data.total_hours_today}</p>
                    </div>
                </div>
            </div>`;
        }
        html += `<h4 class="mt-4">Recent Entries</h4>`;
        if (data.recent_entries.length > 0) {
            html += `<table class="table table-striped"><thead><tr>
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
            html += `<p>No recent entries.</p>`;
        }
        main.innerHTML = html;
    } catch (err) {
        main.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
    }
}

// ----- Time Entries Page -----
async function renderEntries() {
    const main = document.getElementById('main-content');
    main.innerHTML = `<h2>Time Entries</h2>
    <button class="btn btn-primary mb-3" onclick="showEntryForm()">Add Entry</button>
    <div id="entries-list">Loading...</div>
    <!-- Modal for add/edit -->
    <div class="modal fade" id="entryModal" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content p-3">
          <div class="modal-header"><h5 class="modal-title" id="entryModalLabel">Add Entry</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <form id="entry-form">
              <input type="hidden" name="id">
              <div class="mb-3"><label>Project Name</label><input type="text" name="project_name" class="form-control" required></div>
              <div class="mb-3"><label>Task Description</label><textarea name="task_description" class="form-control"></textarea></div>
              <div class="mb-3"><label>Date</label><input type="date" name="entry_date" class="form-control" required></div>
              <div class="row">
                <div class="col"><label>Start Time</label><input type="time" name="start_time" class="form-control" required></div>
                <div class="col"><label>End Time</label><input type="time" name="end_time" class="form-control" required></div>
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
            listDiv.innerHTML = '<p>No time entries found.</p>';
            return;
        }
        let html = '<table class="table table-striped"><thead><tr>';
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
                    <span class="text-primary" onclick="editEntry(${e.id}, '${e.project_name}', '${e.task_description || ''}', '${e.entry_date}', '${e.start_time}', '${e.end_time}')" title="Edit"><i class="bi bi-pencil"></i>Edit</span> |
                    <span class="text-danger" onclick="deleteEntry(${e.id})" title="Delete"><i class="bi bi-trash"></i>Delete</span>
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
    main.innerHTML = `<h2>User Administration</h2>
    <button class="btn btn-primary mb-3" onclick="showUserForm()">Add User</button>
    <div id="users-list">Loading...</div>
    <!-- Modal -->
    <div class="modal fade" id="userModal" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content p-3">
          <div class="modal-header"><h5 class="modal-title" id="userModalLabel">Add User</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <form id="user-form">
              <input type="hidden" name="id">
              <div class="mb-3"><label>Username</label><input type="text" name="username" class="form-control" required></div>
              <div class="mb-3"><label>Email</label><input type="email" name="email" class="form-control" required></div>
              <div class="mb-3"><label>Password <small class="text-muted">(leave blank to keep unchanged on edit)</small></label><input type="password" name="password" class="form-control"></div>
              <div class="mb-3"><label>Role</label>
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
        let html = '<table class="table table-striped"><thead><tr><th>ID</th><th>Username</th><th>Email</th><th>Role</th><th>Created</th><th>Actions</th></tr></thead><tbody>';
        users.forEach(u => {
            html += `<tr>
                <td>${u.id}</td>
                <td>${u.username}</td>
                <td>${u.email}</td>
                <td>${u.role}</td>
                <td>${u.created_at}</td>
                <td>
                    <span class="text-primary" onclick="editUser(${u.id}, '${u.username}', '${u.email}', '${u.role}')">Edit</span> |
                    <span class="text-danger" onclick="deleteUser(${u.id})">Delete</span>
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