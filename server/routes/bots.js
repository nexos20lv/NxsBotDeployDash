const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('../db');
const multer = require('multer');
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

  const ftp_password = crypto.randomBytes(5).toString('hex');

  db.run("INSERT INTO bots (name, type, start_command, main_file, owner_id, directory, status, ftp_password) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", 
    [name, type, start_command, main_file, owner_id, '', 'offline', ftp_password], 
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      
      const botId = this.lastID;
      const botDir = path.join(BOTS_BASE_DIR, `bot_${botId}`);
      fs.mkdirSync(botDir, { recursive: true });
      
      // Update the directory
      db.run("UPDATE bots SET directory = ? WHERE id = ?", [botDir, botId]);
      
      res.json({ id: botId, name, type, directory: botDir, ftp_password });
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

// --- ADVANCED FILE MANAGER ---

// Helper to ensure path is inside bot directory
const resolveSafePath = (baseDir, reqPath) => {
  const targetPath = path.normalize(path.join(baseDir, reqPath || ''));
  if (!targetPath.startsWith(path.normalize(baseDir))) {
    throw new Error('Invalid path traversal attempt');
  }
  return targetPath;
};

// List files in a specific directory
router.get('/:id/fs/list', authenticateToken, (req, res) => {
  db.get("SELECT * FROM bots WHERE id = ?", [req.params.id], (err, bot) => {
      if (err || !bot) return res.status(404).json({ error: 'Bot not found' });
      if (req.user.role !== 'admin' && bot.owner_id !== req.user.id) return res.sendStatus(403);
      
      try {
        const targetDir = resolveSafePath(bot.directory, req.query.path || '');
        if (!fs.existsSync(targetDir)) return res.json([]);
        
        const files = fs.readdirSync(targetDir, { withFileTypes: true }).map(dirent => ({
          name: dirent.name,
          isDirectory: dirent.isDirectory()
        })).sort((a, b) => {
          if (a.isDirectory === b.isDirectory) return a.name.localeCompare(b.name);
          return a.isDirectory ? -1 : 1;
        });
        
        res.json(files);
      } catch (e) {
        res.status(400).json({ error: e.message });
      }
  });
});

// Setup Multer for file uploads (storing temporarily in memory or directly to destination)
const upload = multer({ dest: '/tmp/' });

// Upload a file to the bot's directory
router.post('/:id/fs/upload', authenticateToken, upload.single('file'), (req, res) => {
  const { id } = req.params;
  const targetPath = req.body.path || '';

  if (!req.file) return res.status(400).json({ error: "No file uploaded." });

  db.get("SELECT * FROM bots WHERE id = ?", [id], (err, bot) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!bot) return res.status(404).json({ error: "Bot not found" });
    if (bot.owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: "Access denied" });
    }

    const destDir = path.join(bot.directory, targetPath);
    
    // Prevent directory traversal
    if (!destDir.startsWith(bot.directory)) {
      fs.unlinkSync(req.file.path);
      return res.status(403).json({ error: "Invalid path" });
    }

    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    const destFile = path.join(destDir, req.file.originalname);
    
    fs.rename(req.file.path, destFile, (err) => {
      if (err) {
        fs.unlinkSync(req.file.path);
        return res.status(500).json({ error: "Failed to save file." });
      }
      res.json({ message: "File uploaded successfully." });
    });
  });
});

// Read file content
router.get('/:id/fs/read', authenticateToken, (req, res) => {
  db.get("SELECT * FROM bots WHERE id = ?", [req.params.id], (err, bot) => {
      if (err || !bot) return res.status(404).json({ error: 'Bot not found' });
      if (req.user.role !== 'admin' && bot.owner_id !== req.user.id) return res.sendStatus(403);
      
      try {
        const targetFile = resolveSafePath(bot.directory, req.query.path);
        if (!fs.existsSync(targetFile)) return res.status(404).json({ error: 'File not found' });
        const content = fs.readFileSync(targetFile, 'utf8');
        res.json({ content });
      } catch (e) {
        res.status(400).json({ error: e.message });
      }
  });
});

// Write file content
router.post('/:id/fs/write', authenticateToken, (req, res) => {
  db.get("SELECT * FROM bots WHERE id = ?", [req.params.id], (err, bot) => {
      if (err || !bot) return res.status(404).json({ error: 'Bot not found' });
      if (req.user.role !== 'admin' && bot.owner_id !== req.user.id) return res.sendStatus(403);
      
      try {
        const targetFile = resolveSafePath(bot.directory, req.body.path);
        fs.writeFileSync(targetFile, req.body.content || '', 'utf8');
        res.json({ message: 'File saved successfully' });
      } catch (e) {
        res.status(400).json({ error: e.message });
      }
  });
});

// Delete file or folder
router.post('/:id/fs/delete', authenticateToken, (req, res) => {
  db.get("SELECT * FROM bots WHERE id = ?", [req.params.id], (err, bot) => {
      if (err || !bot) return res.status(404).json({ error: 'Bot not found' });
      if (req.user.role !== 'admin' && bot.owner_id !== req.user.id) return res.sendStatus(403);
      
      try {
        const targetPath = resolveSafePath(bot.directory, req.body.path);
        if (fs.existsSync(targetPath)) {
          fs.rmSync(targetPath, { recursive: true, force: true });
        }
        res.json({ message: 'Deleted successfully' });
      } catch (e) {
        res.status(400).json({ error: e.message });
      }
  });
});

// --- ENV MANAGER ---

// Read .env
router.get('/:id/env', authenticateToken, (req, res) => {
  db.get("SELECT * FROM bots WHERE id = ?", [req.params.id], (err, bot) => {
      if (err || !bot) return res.status(404).json({ error: 'Bot not found' });
      if (req.user.role !== 'admin' && bot.owner_id !== req.user.id) return res.sendStatus(403);
      
      try {
        const envPath = resolveSafePath(bot.directory, '.env');
        let content = '';
        if (fs.existsSync(envPath)) content = fs.readFileSync(envPath, 'utf8');
        res.json({ content });
      } catch (e) {
        res.status(400).json({ error: e.message });
      }
  });
});

// Write .env
router.post('/:id/env', authenticateToken, (req, res) => {
  db.get("SELECT * FROM bots WHERE id = ?", [req.params.id], (err, bot) => {
      if (err || !bot) return res.status(404).json({ error: 'Bot not found' });
      if (req.user.role !== 'admin' && bot.owner_id !== req.user.id) return res.sendStatus(403);
      
      try {
        const envPath = resolveSafePath(bot.directory, '.env');
        fs.writeFileSync(envPath, req.body.content || '', 'utf8');
        res.json({ message: '.env saved successfully' });
      } catch (e) {
        res.status(400).json({ error: e.message });
      }
  });
});

// --- DEPENDENCIES INSTALLER ---
router.post('/:id/install', authenticateToken, (req, res) => {
  db.get("SELECT * FROM bots WHERE id = ?", [req.params.id], (err, bot) => {
      if (err || !bot) return res.status(404).json({ error: 'Bot not found' });
      if (req.user.role !== 'admin' && bot.owner_id !== req.user.id) return res.sendStatus(403);
      
      const { exec } = require('child_process');
      const cmd = bot.type === 'python' ? 'pip install -r requirements.txt' : 'npm install';
      
      exec(cmd, { cwd: bot.directory }, (error, stdout, stderr) => {
        if (error) {
          return res.status(500).json({ error: stderr || error.message });
        }
        res.json({ message: 'Dependencies installed successfully!', output: stdout });
      });
  });
});

// --- BACKUPS ---
const archiver = require('archiver');

router.get('/:id/backups/download', authenticateToken, (req, res) => {
  db.get("SELECT * FROM bots WHERE id = ?", [req.params.id], (err, bot) => {
      if (err || !bot) return res.status(404).json({ error: 'Bot not found' });
      if (req.user.role !== 'admin' && bot.owner_id !== req.user.id) return res.sendStatus(403);
      
      res.attachment(`backup_${bot.name}_${Date.now()}.zip`);
      const archive = archiver('zip', { zlib: { level: 9 } });
      
      archive.on('error', function(err) {
        res.status(500).send({error: err.message});
      });
      
      archive.pipe(res);
      archive.directory(bot.directory, false);
      archive.finalize();
  });
});

module.exports = router;
