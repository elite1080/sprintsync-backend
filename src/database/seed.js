const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

const seedDatabase = async () => {
  try {
    console.log('🌱 Seeding database...');

    const adminPassword = await bcrypt.hash('admin123', 12);
    const userPassword = await bcrypt.hash('user123', 12);

    const adminId = uuidv4();
    const userId1 = uuidv4();
    const userId2 = uuidv4();

    const now = new Date().toISOString();

    db.serialize(() => {
      db.run('DELETE FROM time_logs');
      db.run('DELETE FROM tasks');
      db.run('DELETE FROM users');

      db.run(
        'INSERT INTO users (id, username, email, password_hash, is_admin, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [adminId, 'admin', 'admin@sprintsync.com', adminPassword, true, now, now]
      );

      db.run(
        'INSERT INTO users (id, username, email, password_hash, is_admin, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [userId1, 'john_engineer', 'john@sprintsync.com', userPassword, false, now, now]
      );

      db.run(
        'INSERT INTO users (id, username, email, password_hash, is_admin, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [userId2, 'sarah_dev', 'sarah@sprintsync.com', userPassword, false, now, now]
      );

      const taskId1 = uuidv4();
      const taskId2 = uuidv4();
      const taskId3 = uuidv4();
      const taskId4 = uuidv4();

      db.run(
        'INSERT INTO tasks (id, title, description, status, total_minutes, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [taskId1, 'Implement user authentication', 'Set up JWT-based authentication system with bcrypt password hashing', 'done', 240, userId1, now, now]
      );

      db.run(
        'INSERT INTO tasks (id, title, description, status, total_minutes, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [taskId2, 'Design database schema', 'Create normalized database structure for users, tasks, and time tracking', 'in_progress', 180, userId1, now, now]
      );

      db.run(
        'INSERT INTO tasks (id, title, description, status, total_minutes, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [taskId3, 'Build REST API endpoints', 'Implement CRUD operations for tasks and user management', 'todo', 0, userId2, now, now]
      );

      db.run(
        'INSERT INTO tasks (id, title, description, status, total_minutes, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [taskId4, 'Integrate AI suggestions', 'Connect OpenAI API for task description generation and daily planning', 'todo', 0, userId2, now, now]
      );

      const timeLogId1 = uuidv4();
      const timeLogId2 = uuidv4();
      const timeLogId3 = uuidv4();

      db.run(
        'INSERT INTO time_logs (id, task_id, user_id, minutes, logged_at) VALUES (?, ?, ?, ?, ?)',
        [timeLogId1, taskId1, userId1, 120, now]
      );

      db.run(
        'INSERT INTO time_logs (id, task_id, user_id, minutes, logged_at) VALUES (?, ?, ?, ?, ?)',
        [timeLogId2, taskId1, userId1, 120, now]
      );

      db.run(
        'INSERT INTO time_logs (id, task_id, user_id, minutes, logged_at) VALUES (?, ?, ?, ?, ?)',
        [timeLogId3, taskId2, userId1, 180, now]
      );

      console.log('✅ Database seeded successfully!');
      console.log('\n📋 Sample Data:');
      console.log('- Admin user: admin / admin123');
      console.log('- Regular users: john_engineer / user123, sarah_dev / user123');
      console.log('- 4 sample tasks with different statuses');
      console.log('- Sample time logs for completed tasks');
    });
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  }
};

if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
