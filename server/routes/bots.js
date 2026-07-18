const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('../db');
const multer = require('multer');
const yauzl = require('yauzl');
const fse = require('fs-extra');
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

// Upload a single file to the bot's directory
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

    try {
      const destDir = resolveSafePath(bot.directory, targetPath);
      if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
      
      const destFile = path.join(destDir, req.file.originalname);
      fs.renameSync(req.file.path, destFile);
      res.json({ message: "File uploaded successfully." });
    } catch (e) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      res.status(400).json({ error: e.message });
    }
  });
});

// Upload multiple files (e.g. for folders)
router.post('/:id/fs/upload-folder', authenticateToken, upload.array('files'), (req, res) => {
  const { id } = req.params;
  const targetPath = req.body.path || '';
  // paths is a JSON string array of relative paths corresponding to the files array
  const relativePaths = req.body.paths ? JSON.parse(req.body.paths) : [];

  if (!req.files || req.files.length === 0) return res.status(400).json({ error: "No files uploaded." });

  db.get("SELECT * FROM bots WHERE id = ?", [id], (err, bot) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!bot) return res.status(404).json({ error: "Bot not found" });
    if (bot.owner_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: "Access denied" });

    try {
      req.files.forEach((file, index) => {
        const relPath = relativePaths[index] || file.originalname;
        const destFile = resolveSafePath(bot.directory, path.join(targetPath, relPath));
        const destDir = path.dirname(destFile);
        
        if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
        fs.renameSync(file.path, destFile);
      });
      res.json({ message: "Folder uploaded successfully." });
    } catch (e) {
      req.files.forEach(f => { if(fs.existsSync(f.path)) fs.unlinkSync(f.path); });
      res.status(400).json({ error: e.message });
    }
  });
});

// Create File
router.post('/:id/fs/create-file', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { path: targetPath, name } = req.body;
  if (!name) return res.status(400).json({ error: "File name required" });

  db.get("SELECT * FROM bots WHERE id = ?", [id], (err, bot) => {
    if (err || !bot) return res.status(404).json({ error: "Bot not found" });
    if (bot.owner_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: "Access denied" });

    try {
      const destFile = resolveSafePath(bot.directory, path.join(targetPath || '', name));
      if (fs.existsSync(destFile)) return res.status(400).json({ error: "File already exists" });
      fs.writeFileSync(destFile, '');
      res.json({ message: "File created" });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });
});

// Create Folder
router.post('/:id/fs/create-folder', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { path: targetPath, name } = req.body;
  if (!name) return res.status(400).json({ error: "Folder name required" });

  db.get("SELECT * FROM bots WHERE id = ?", [id], (err, bot) => {
    if (err || !bot) return res.status(404).json({ error: "Bot not found" });
    if (bot.owner_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: "Access denied" });

    try {
      const destFolder = resolveSafePath(bot.directory, path.join(targetPath || '', name));
      if (fs.existsSync(destFolder)) return res.status(400).json({ error: "Folder already exists" });
      fs.mkdirSync(destFolder, { recursive: true });
      res.json({ message: "Folder created" });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });
});

// Upload and Unzip (with zip bomb protection)
router.post('/:id/fs/unzip', authenticateToken, upload.single('file'), (req, res) => {
  const { id } = req.params;
  const targetPath = req.body.path || '';

  if (!req.file || !req.file.originalname.endsWith('.zip')) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: "Please upload a valid .zip file." });
  }

  db.get("SELECT * FROM bots WHERE id = ?", [id], (err, bot) => {
    if (err || !bot) return res.status(404).json({ error: "Bot not found" });
    if (bot.owner_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: "Access denied" });

    try {
      const destDir = resolveSafePath(bot.directory, targetPath);
      let totalSize = 0;
      let fileCount = 0;
      const MAX_SIZE = 500 * 1024 * 1024; // 500 MB
      const MAX_FILES = 10000;

      yauzl.open(req.file.path, { lazyEntries: true }, (err, zipfile) => {
        if (err) {
          fs.unlinkSync(req.file.path);
          return res.status(400).json({ error: "Invalid ZIP file." });
        }

        zipfile.readEntry();
        zipfile.on("entry", (entry) => {
          fileCount++;
          if (fileCount > MAX_FILES) {
            zipfile.close();
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: "ZIP file contains too many files (max 10,000)." });
          }

          if (/\/$/.test(entry.fileName)) {
            // Directory entry
            const targetFolder = resolveSafePath(destDir, entry.fileName);
            fse.ensureDirSync(targetFolder);
            zipfile.readEntry();
          } else {
            // File entry
            totalSize += entry.uncompressedSize;
            if (totalSize > MAX_SIZE) {
              zipfile.close();
              fs.unlinkSync(req.file.path);
              return res.status(400).json({ error: "ZIP extracted size exceeds limit (500MB)." });
            }

            zipfile.openReadStream(entry, (err, readStream) => {
              if (err) { zipfile.close(); return; }
              const targetFile = resolveSafePath(destDir, entry.fileName);
              fse.ensureDirSync(path.dirname(targetFile));
              const writeStream = fs.createWriteStream(targetFile);
              readStream.pipe(writeStream);
              writeStream.on("close", () => {
                zipfile.readEntry();
              });
            });
          }
        });

        zipfile.on("end", () => {
          fs.unlinkSync(req.file.path);
          res.json({ message: "ZIP extracted successfully." });
        });

        zipfile.on("error", (err) => {
          if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        });
      });

    } catch (e) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      res.status(400).json({ error: e.message });
    }
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
