const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/sprintsync.db');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
  }
});

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'todo' CHECK(status IN ('todo', 'in_progress', 'done')),
    total_minutes INTEGER DEFAULT 0,
    user_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS time_logs (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    minutes INTEGER NOT NULL,
    logged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_auto_logged BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (task_id) REFERENCES tasks (id),
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);

  // Safely add is_auto_logged column to existing time_logs table
  db.get("PRAGMA table_info(time_logs)", (err, rows) => {
    if (err) {
      console.error('Error checking table schema:', err.message);
      return;
    }
    
    // Check if the column already exists
    db.all("PRAGMA table_info(time_logs)", (err, columns) => {
      if (err) {
        console.error('Error getting table columns:', err.message);
        return;
      }
      
      const hasAutoLoggedColumn = columns.some(col => col.name === 'is_auto_logged');
      
      if (!hasAutoLoggedColumn) {
        // Column doesn't exist, add it
        db.run(`ALTER TABLE time_logs ADD COLUMN is_auto_logged BOOLEAN DEFAULT FALSE`, (err) => {
          if (err) {
            console.error('Error adding is_auto_logged column:', err.message);
          } else {
            console.log('Successfully added is_auto_logged column to time_logs table');
          }
        });
      } else {
        console.log('Column is_auto_logged already exists in time_logs table');
      }
    });
  });
});

module.exports = db;
