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
      FOREIGN KEY(owner_id) REFERENCES users(id)
    )
  `);
  
  // Create default admin if not exists
  const bcrypt = require('bcrypt');
  db.get("SELECT id FROM users WHERE username = 'admin'", (err, row) => {
    if (!row) {
      bcrypt.hash('admin', 10, (err, hash) => {
        if (err) return console.error(err);
        db.run("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", ['admin', hash, 'admin']);
        console.log("Default admin created (admin/admin)");
      });
    }
  });
});

module.exports = db;
