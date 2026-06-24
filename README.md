# Best Employee Tracking System

A professional, lightweight Single Page Application (SPA) for tracking employee work hours. Built with PHP, MySQL, and vanilla JavaScript, it provides role-based dashboards for administrators and regular users with secure authentication, dynamic charting, and a highly customizable modern UI.

---

## Features

- **Role-Based Access Control**: Admin and User roles with separate dashboards and permissions.
- **Interactive Analytics** (Admin Only): Filterable dashboard statistics (All-time, Yearly, Quarterly) with interactive Chart.js bar graphs identifying the "Best Employee".
- **User Settings & Profiles**: Users can update their usernames and upload secure profile pictures.
- **Dynamic Theming**: Built-in Theme Switcher supporting OS Default, "Pearl White" Light Mode, and "Midnight Glass" Dark Mode.
- **Project Management** (Admin Only): Create, edit, delete projects. Assign users to projects.
- **Time Entry Management**: Users create entries selecting from assigned projects only. Project must be assigned before entry creation.
- **User Administration**: Admins can add, edit, or remove users (with protected last-admin deletion).
- **Modern Authentication**: Bcrypt password hashing, session-based login with timeout, CSRF validation.
- **SPA Routing**: Hash-based navigation without page reloads, instant UI updates.
- **Responsive UI**: Fully responsive layout that adapts to mobile devices with an off-canvas slide-out hamburger menu.
- **Security First**: Prepared statements (PDO), secure image upload validation, password hashing, session regeneration, no-cache headers.

---

## System Architecture

```
[Browser SPA] <---JSON API---> [PHP Backend (API endpoints)]
     |                              |
     +-- Chart.js & Vanilla JS      +-- Session Management
     +-- Hash Router                +-- Secure File Uploads
```

- **Frontend**: Single `index.php` loads a dynamic shell. JavaScript manages all views, routing, and API calls.
- **Backend**: RESTful API in `api/` directory. All endpoints return JSON. Session management via PHP.
- **Database**: MySQL with four main tables: `users`, `projects`, `time_entries`, and `user_projects` (for assignments).

---

## Installation Instructions (XAMPP)

1. **Clone or download** the project into your XAMPP `htdocs` folder, e.g. `C:/xampp/htdocs/BETS/`.

2. **Start Apache and MySQL** from the XAMPP control panel.

3. **Create the database**:
   - Open phpMyAdmin (http://localhost/phpmyadmin).
   - Click on "New" and create a database named `employee_tracking` with collation `utf8mb4_unicode_ci`.
   - Select the new database, go to the "Import" tab, choose the provided `database.sql` file, and click "Go".

4. **Configure database connection**:
   - Open `includes/config.php`.
   - If your MySQL root password is set, change `DB_PASS` accordingly.
   - The default values (`root` with empty password) work out-of-the-box on most XAMPP installations.

5. **Directory Permissions**:
   - Ensure the `uploads/` directory is writable so users can upload profile pictures.

6. **Run the application**:
   - Navigate to `http://localhost/BETS/` in your browser.
   - You will be redirected to the login page. Create a user via signup or log in.

---

## Usage Guide

### Login
Visit the root URL. You'll see the login form. Enter your username and password. Sessions expire after 30 minutes of inactivity.

### Dashboard
After login, you land on the dashboard:
- **Admin** sees total users, today's entries, and advanced interactive statistics. They can filter data by All-time, Yearly, or Quarterly to identify the top-performing employees via dynamic bar charts.
- **User** sees their own today's entries, hours, and recent logs.

### Settings
Click the "Settings" link in the sidebar to:
- Update your display username.
- Upload a custom profile picture (JPG, PNG, WebP) up to 2MB.
- Toggle the application theme between OS Default, Light, and Dark modes.

### Project Management (Admin Only)
Admins see a "Projects" link in the sidebar.
- View all projects with assigned user counts.
- Add a new project by specifying name, description, and assigning users.
- Edit project details and manage user assignments.
- Delete a project (users retain their entries but lose project assignment).

### Time Entries
Click "Time Entries" in the navigation.
- **For Users**: Click "Add Entry" (only available if assigned to a project). Fill in task descriptions, dates, and times. 
- **For Admins**: Read-only view of all entries across the company. Admins cannot edit user time entries.

### User Administration (Admin Only)
Admins see a "Users" link.
- View, add, edit, or remove registered users.
- Manage user roles (Admin vs. User).

---

## Security Considerations

- **Secure Uploads**: Profile picture uploads are restricted by MIME type, file extension, and file size (max 2MB). A `.htaccess` file prevents script execution in the uploads directory.
- **CSRF Protection**: All state-changing requests (POST, PUT, DELETE) require a valid CSRF token.
- **Password Storage**: All passwords are hashed using PHP's `password_hash()` with bcrypt.
- **Input Validation**: API endpoints validate required fields and respond with proper HTTP status codes.
- **SQL Injection**: All queries use PDO prepared statements with parameter binding.

---

## Troubleshooting

| Problem                           | Likely Solution                              |
|-----------------------------------|----------------------------------------------|
| Blank page / 500 error            | Check `includes/config.php` DB credentials.   |
| "Database connection failed"      | Ensure MySQL is running and database exists.  |
| Image uploads fail                | Ensure `uploads/` directory exists and has 755/777 permissions. |
| Cannot login with default users   | Re-import `database.sql` or check hashes.     |
| "No project assigned" message     | Admin must assign projects in Projects page.  |
| Cannot see Add Entry button       | Ensure user has projects assigned by admin.   |
| Back button shows old content     | Hard refresh (Ctrl+F5) - no-cache enforced.  |

---