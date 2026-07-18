const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const db = require('../db');
const { authenticateToken } = require('./auth');
const pm2Manager = require('../pm2-manager');

// Base directory for all bots
const BOTS_BASE_DIR = path.join(__dirname, '..', '..', 'bots_data');
if (!fs.existsSync(BOTS_BASE_DIR)) {
  fs.mkdirSync(BOTS_BASE_DIR, { recursive: true });
}

// Get all bots for the current user (or all bots if admin)
router.get('/', authenticateToken, (req, res) => {
  let query = "SELECT * FROM bots WHERE owner_id = ?";
  let params = [req.user.id];
  
  if (req.user.role === 'admin') {
    query = "SELECT bots.*, users.username as owner_name FROM bots LEFT JOIN users ON bots.owner_id = users.id";
    params = [];
  }

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Create a new bot
router.post('/', authenticateToken, (req, res) => {
  const { name, type, start_command, main_file, assigned_owner_id } = req.body;
  
  // If admin, they can specify the owner. Otherwise, it's the current user.
  let owner_id = req.user.id;
  if (req.user.role === 'admin' && assigned_owner_id) {
      owner_id = assigned_owner_id;
  } else if (req.user.role !== 'admin') {
      // If we want only admins to create bots, we should block users here.
      // But let's allow users to create bots if no admin strict mode is set, or block them if the user specifically wants "admin panel to create hostings".
      return res.status(403).json({ error: "Only admins can create new bot hostings." });
  }

  db.run("INSERT INTO bots (name, type, start_command, main_file, owner_id, directory, status) VALUES (?, ?, ?, ?, ?, ?, ?)", 
    [name, type, start_command, main_file, owner_id, '', 'offline'], 
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      
      const botId = this.lastID;
      const botDir = path.join(BOTS_BASE_DIR, `bot_${botId}`);
      fs.mkdirSync(botDir, { recursive: true });
      
      // Update the directory
      db.run("UPDATE bots SET directory = ? WHERE id = ?", [botDir, botId]);
      
      res.json({ id: botId, name, type, directory: botDir });
  });
});

// Start a bot
router.post('/:id/start', authenticateToken, (req, res) => {
  db.get("SELECT * FROM bots WHERE id = ?", [req.params.id], async (err, bot) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!bot) return res.status(404).json({ error: 'Bot not found' });
    if (req.user.role !== 'admin' && bot.owner_id !== req.user.id) return res.sendStatus(403);

    try {
      await pm2Manager.startBot(bot);
      db.run("UPDATE bots SET status = 'online' WHERE id = ?", [bot.id]);
      res.json({ message: 'Bot started successfully' });
    } catch (e) {
      res.status(500).json({ error: e.message || 'Failed to start bot' });
    }
  });
});

// Stop a bot
router.post('/:id/stop', authenticateToken, (req, res) => {
  db.get("SELECT * FROM bots WHERE id = ?", [req.params.id], async (err, bot) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!bot) return res.status(404).json({ error: 'Bot not found' });
    if (req.user.role !== 'admin' && bot.owner_id !== req.user.id) return res.sendStatus(403);

    try {
      await pm2Manager.stopBot(bot.id);
      db.run("UPDATE bots SET status = 'offline' WHERE id = ?", [bot.id]);
      res.json({ message: 'Bot stopped successfully' });
    } catch (e) {
      res.status(500).json({ error: e.message || 'Failed to stop bot' });
    }
  });
});

// Restart a bot
router.post('/:id/restart', authenticateToken, (req, res) => {
    db.get("SELECT * FROM bots WHERE id = ?", [req.params.id], async (err, bot) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!bot) return res.status(404).json({ error: 'Bot not found' });
      if (req.user.role !== 'admin' && bot.owner_id !== req.user.id) return res.sendStatus(403);
  
      try {
        await pm2Manager.restartBot(bot.id);
        res.json({ message: 'Bot restarted successfully' });
      } catch (e) {
        res.status(500).json({ error: e.message || 'Failed to restart bot' });
      }
    });
});

// Get bot logs
router.get('/:id/logs', authenticateToken, (req, res) => {
    db.get("SELECT * FROM bots WHERE id = ?", [req.params.id], async (err, bot) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!bot) return res.status(404).json({ error: 'Bot not found' });
      if (req.user.role !== 'admin' && bot.owner_id !== req.user.id) return res.sendStatus(403);
  
      try {
        const logs = await pm2Manager.getBotLogs(bot.id);
        res.json(logs);
      } catch (e) {
        res.status(500).json({ error: e.message || 'Failed to get logs' });
      }
    });
});

// Upload files to bot directory (simplified for now)
const multer = require('multer');
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        db.get("SELECT directory FROM bots WHERE id = ?", [req.params.id], (err, bot) => {
            if (err || !bot) return cb(new Error("Bot not found"));
            cb(null, bot.directory);
        });
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});
const upload = multer({ storage: storage });

router.post('/:id/upload', authenticateToken, upload.array('files'), (req, res) => {
    res.json({ message: "Files uploaded successfully" });
});

// File list
router.get('/:id/files', authenticateToken, (req, res) => {
    db.get("SELECT * FROM bots WHERE id = ?", [req.params.id], (err, bot) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!bot) return res.status(404).json({ error: 'Bot not found' });
        if (req.user.role !== 'admin' && bot.owner_id !== req.user.id) return res.sendStatus(403);
        
        fs.readdir(bot.directory, (err, files) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(files);
        });
    });
});


module.exports = router;
