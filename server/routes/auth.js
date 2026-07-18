const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'nxs_bot_deploy_super_secret';

// Login route
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    bcrypt.compare(password, user.password, (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!result) return res.status(401).json({ error: 'Invalid credentials' });

      const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
      res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
    });
  });
});

// Middleware to authenticate JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Middleware to check admin role
const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  next();
};

// Get current user profile
router.get('/me', authenticateToken, (req, res) => {
  res.json(req.user);
});

// Admin: Get all users
router.get('/users', authenticateToken, isAdmin, (req, res) => {
  db.all("SELECT id, username, role FROM users", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Admin: Create user
router.post('/users', authenticateToken, isAdmin, (req, res) => {
  const { username, password, role } = req.body;
  bcrypt.hash(password, 10, (err, hash) => {
    if (err) return res.status(500).json({ error: err.message });
    db.run("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", [username, hash, role || 'user'], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, username, role });
    });
  });
});

// Admin: Delete user
router.delete('/users/:id', authenticateToken, isAdmin, (req, res) => {
  const id = req.params.id;
  db.run("DELETE FROM users WHERE id = ?", [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "User deleted" });
  });
});

// Admin: Trigger Auto-Update
const { exec } = require('child_process');
const path = require('path');

router.post('/update', authenticateToken, isAdmin, (req, res) => {
  const updateScript = path.join(__dirname, '..', '..', 'update.sh');
  
  // We send the response immediately because the script will restart the server
  res.json({ message: "Update started. The panel will restart shortly." });
  
  exec(`bash ${updateScript}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Update error: ${error}`);
      return;
    }
    console.log(`Update output: ${stdout}`);
  });
});

module.exports = {
  router,
  authenticateToken,
  isAdmin
};
