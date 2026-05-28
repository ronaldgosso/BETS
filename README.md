# Best Employee Tracking System

A professional, lightweight Single Page Application (SPA) for tracking employee work hours. Built with PHP, MySQL, and vanilla JavaScript, it provides role-based dashboards for administrators and regular users with secure authentication.

---

## Features

- **Role-Based Access Control**: Admin and User roles with separate dashboards and permissions.
- **Project Management** (Admin Only): Create, edit, delete projects. Assign users to projects.
- **Time Entry Management**: Users create entries selecting from assigned projects only. Project must be assigned before entry creation.
- **User Administration**: Admins can add, edit, or remove users (with protected last-admin deletion).
- **Modern Authentication**: Bcrypt password hashing, session-based login with timeout, CSRF-safe logout.
- **SPA Routing**: Hash-based navigation without page reloads, instant UI updates.
- **Responsive UI**: Bootstrap 5 interface that looks great on desktop and mobile.
- **Security First**: Prepared statements (PDO), password hashing, session regeneration, no-cache headers, session timeout.

---

## System Architecture

```
[Browser SPA] <--JSON API--> [PHP Backend (API endpoints)]
     |                        |
     +-- MySQL Database       +-- Session Management
     +-- Hash Router (#dashboard, #entries, #admin/projects, #admin/users)
```

- **Frontend**: Single `index.php` loads a Bootstrap 5 shell. JavaScript manages all views and API calls.
- **Backend**: RESTful-ish API in `api/` directory. All endpoints return JSON. Session management via PHP.
- **Database**: MySQL with four main tables: `users`, `projects`, `time_entries`, and `user_projects` (for assignments).

---

## Installation Instructions (XAMPP)

1. **Clone or download** the project into your XAMPP `htdocs` folder, e.g. `C:/xampp/htdocs/best-employee-tracking/`.

2. **Start Apache and MySQL** from the XAMPP control panel.

3. **Create the database**:
   - Open phpMyAdmin (http://localhost/phpmyadmin).
   - Click on "New" and create a database named `employee_tracking` with collation `utf8mb4_unicode_ci`.
   - Select the new database, go to the "Import" tab, choose the provided `database.sql` file, and click "Go".

4. **Configure database connection**:
   - Open `includes/config.php`.
   - If your MySQL root password is set, change `DB_PASS` accordingly.
   - The default values (`root` with empty password) work out-of-the-box on most XAMPP installations.

5. **Run the application**:
   - Navigate to `http://localhost/best-employee-tracking/` in your browser.
   - You will be redirected to the login page. Create a user via signup or check existing credentials.

---

## Usage Guide

### Login
Visit the root URL. You'll see the login form. Enter username and password. Sessions expire after 30 minutes of inactivity.

### Dashboard
After login, you land on the dashboard:
- **Admin** sees total users, today's entries and hours, and a recent activity table from all employees.
- **User** sees their own today's entries, hours, and recent logs.

### Project Management (Admin Only)
Admins see a "Projects" link in the sidebar.
- View all projects with assigned user counts.
- Add a new project by specifying name, description, and assigning users.
- Edit project details and manage user assignments.
- Delete a project (users retain their entries but lose project assignment).

**Important**: Before creating time entries, assign projects to users in the Projects section.

### Time Entries
Click "Time Entries" in the navigation.

**For Users:**
- The "Add Entry" button appears only if you have projects assigned by an admin.
- If no projects are assigned, a warning message prompts you to contact the admin.
- Select a project from the dropdown (only projects assigned to you are shown).
- Fill in task description, date, and time range, then save.

**For Admins:**
- Admins see a read-only view of all entries (no "Add Entry" button).
- The "User" column shows who created each entry.
- Admins cannot edit or delete entries (users manage their own entries only).

### User Administration (Admin Only)
Admins see an "User Admin" link.
- View all registered users.
- Add a new user by specifying username, email, password, and role.
- Edit user details, change role, or reset password.
- Delete a user (cannot delete the last remaining admin).

---

## Security Considerations

- **Password Storage**: All passwords are hashed using PHP's `password_hash()` with bcrypt.
- **Session Security**: Session IDs are regenerated on login. Logout destroys the session and clears the cookie. Sessions timeout after 30 minutes of inactivity.
- **No-Cache Headers**: HTTP headers and meta tags prevent browser caching of protected pages, preventing back-button access after logout.
- **Input Validation**: API endpoints validate required fields and respond with proper HTTP status codes.
- **Access Control**: Each endpoint checks authentication and authorization. Admin-only routes verify the `role`. Users can only manage their own time entries.
- **SQL Injection**: All queries use PDO prepared statements with parameter binding.
- **Session Fixation Prevention**: New session ID generated after successful login.

---

## Customization

- To change the company name in the navbar, edit the brand text in `renderSidebar()` inside `assets/js/app.js`.
- Modify the color scheme by editing `assets/css/style.css` and the Bootstrap variable overrides.
- Additional fields can be added to the `time_entries` table; update the API and frontend accordingly.

---

## Troubleshooting

| Problem                           | Likely Solution                              |
|-----------------------------------|----------------------------------------------|
| Blank page / 500 error            | Check `includes/config.php` DB credentials.   |
| "Database connection failed"      | Ensure MySQL is running and database exists.  |
| Cannot login with default users   | Re-import `database.sql` or check hashes.     |
| "No project assigned" message   | Admin must assign projects in Projects page.  |
| API returns 401 constantly        | Clear browser cookies or use incognito mode.  |
| Cannot see Add Entry button       | Ensure user has projects assigned by admin.   |
| "Cannot delete last admin"        | Create another admin before deleting.         |
| Back button shows old content     | Hard refresh (Ctrl+F5) - no-cache enforced.  |

---

## Features

- **Role-Based Access Control**: Admin and User roles with separate dashboards and permissions.
- **Time Entry Management**: Create, edit, delete work logs with project/task details.
- **User Administration**: Admins can add, edit, or remove users (with protected last-admin deletion).
- **Modern Authentication**: Bcrypt password hashing, session-based login, CSRF-safe logout.
- **SPA Routing**: Hash-based navigation without page reloads, instant UI updates.
- **Responsive UI**: Bootstrap 5 interface that looks great on desktop and mobile.
- **Security First**: Prepared statements (PDO), password hashing, session regeneration, JSON API protection.

---

## System Architecture
[Browser SPA] <--JSON API--> [PHP Backend (API endpoints)]
| |
| +-- MySQL Database
+-- Hash Router (#dashboard, #entries, #admin/users)

- **Frontend**: Single `index.php` loads a Bootstrap 5 shell. JavaScript manages all views and API calls.
- **Backend**: RESTful-ish API in `api/` directory. All endpoints return JSON. Session management via PHP.
- **Database**: MySQL with two main tables: `users` and `time_entries`.

---

## Installation Instructions (XAMPP)

1. **Clone or download** the project into your XAMPP `htdocs` folder, e.g. `C:/xampp/htdocs/best-employee-tracking/`.

2. **Start Apache and MySQL** from the XAMPP control panel.

3. **Create the database**:
   - Open phpMyAdmin (http://localhost/phpmyadmin).
   - Click on "New" and create a database named `employee_tracking` with collation `utf8mb4_unicode_ci`.
   - Select the new database, go to the "Import" tab, choose the provided `database.sql` file, and click "Go".

4. **Configure database connection**:
   - Open `includes/config.php`.
   - If your MySQL root password is set, change `DB_PASS` accordingly.
   - The default values (`root` with empty password) work out-of-the-box on most XAMPP installations.

5. **Run the application**:
   - Navigate to `http://localhost/best-employee-tracking/` in your browser.
   - You will be redirected to the login page. Use the credentials above.

---

## Usage Guide

### Login
Visit the root URL. You'll see the login form. Enter username and password.

### Dashboard
After login, you land on the dashboard:
- **Admin** sees total users, today's entries and hours, and a recent activity table from all employees.
- **User** sees their own today's entries, hours, and recent logs.

### Time Entries
Click "Time Entries" in the navigation.
- Use the "Add Entry" button to fill in project, task, date, and time range.
- Each row has Edit and Delete actions. Users can only manage their own entries; admins can manage all.

### User Administration (Admin Only)
Admins see an "User Admin" link.
- View all registered users.
- Add a new user by specifying username, email, password, and role.
- Edit user details, change role, or reset password.
- Delete a user (cannot delete the last remaining admin).

---

## Security Considerations

- **Password Storage**: All passwords are hashed using PHP's `password_hash()` with bcrypt.
- **Session Security**: Session IDs are regenerated on login. Logout destroys the session and clears the cookie.
- **Input Validation**: API endpoints validate required fields and respond with proper HTTP status codes.
- **Access Control**: Each endpoint checks authentication and authorization. Admin-only routes verify the `role`.
- **SQL Injection**: All queries use PDO prepared statements with parameter binding.

---

## Customization

- To change the company name in the navbar, edit the `brand` text in `renderNavbar()` inside `assets/js/app.js`.
- Modify the color scheme by editing `assets/css/style.css` and the Bootstrap variable overrides.
- Additional fields can be added to the `time_entries` table; update the API and frontend accordingly.

---

## Troubleshooting

| Problem                           | Likely Solution                              |
|-----------------------------------|----------------------------------------------|
| Blank page / 500 error            | Check `includes/config.php` DB credentials.   |
| "Database connection failed"      | Ensure MySQL is running and database exists.  |
| Cannot login with default users   | Re-import `database.sql` or check hashes.     |
| API returns 401 constantly        | Clear browser cookies or use incognito mode.  |
| "Cannot delete last admin"        | Create another admin before deleting.         |

---