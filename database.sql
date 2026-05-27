CREATE DATABASE IF NOT EXISTS `employee_tracking` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `employee_tracking`;

-- Users table
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('admin','user') NOT NULL DEFAULT 'user',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Time entries table
CREATE TABLE `time_entries` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `project_name` varchar(100) NOT NULL,
  `task_description` text DEFAULT NULL,
  `entry_date` date NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `entry_date` (`entry_date`),
  CONSTRAINT `time_entries_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert default admin user (password: admin123, bcrypt hashed)
INSERT INTO `users` (`username`, `email`, `password`, `role`) VALUES
('admin', 'admin@tracking.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin');

-- Insert a sample user (password: user123)
INSERT INTO `users` (`username`, `email`, `password`, `role`) VALUES
('john.doe', 'john@tracking.com', '$2y$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'user');

-- Sample time entries for demo
INSERT INTO `time_entries` (`user_id`, `project_name`, `task_description`, `entry_date`, `start_time`, `end_time`) VALUES
(2, 'Website Redesign', 'Created wireframes for landing page', '2026-05-26', '09:00:00', '12:00:00'),
(2, 'Mobile App', 'Fixed login bug on Android', '2026-05-26', '13:00:00', '15:30:00'),
(2, 'Website Redesign', 'Front-end development for contact page', '2026-05-27', '08:00:00', '11:00:00');