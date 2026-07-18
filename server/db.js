const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      role TEXT DEFAULT 'user' -- 'admin' or 'user'
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS bots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      type TEXT, -- 'nodejs' or 'python'
      start_command TEXT,
      main_file TEXT,
      owner_id INTEGER,
      directory TEXT,
      status TEXT DEFAULT 'offline',
      ftp_password TEXT,
      FOREIGN KEY(owner_id) REFERENCES users(id)
    )
  `);

  // Migration for existing databases
  db.run(`ALTER TABLE bots ADD COLUMN ftp_password TEXT`, (err) => {
    // Ignore error if column already exists
  });
  
  // Create default admin if not exists
  const bcrypt = require('bcrypt');
  const adminUser = process.env.ADMIN_USERNAME || 'admin';
  const adminPass = process.env.ADMIN_PASSWORD || 'admin';

  db.get("SELECT id FROM users WHERE username = ?", [adminUser], (err, row) => {
    if (!row) {
      bcrypt.hash(adminPass, 10, (err, hash) => {
        if (err) return console.error(err);
        db.run("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", [adminUser, hash, 'admin']);
        console.log(`Default admin created (${adminUser})`);
      });
    }
  });
});

module.exports = db;
