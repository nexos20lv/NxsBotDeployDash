require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const pm2Manager = require('./pm2-manager');
const db = require('./db');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());

// Load routes
const authRoutes = require('./routes/auth');
const botsRoutes = require('./routes/bots');
const path = require('path');
// API Routes
app.use('/api/auth', authRoutes.router);
app.use('/api/bots', botsRoutes);

// GitHub Webhook Route
const { exec } = require('child_process');
app.post('/api/webhooks/github/:id', (req, res) => {
  const botId = req.params.id;
  const db = require('./db');
  db.get("SELECT * FROM bots WHERE id = ?", [botId], (err, bot) => {
    if (err || !bot) return res.status(404).send('Bot not found');
    
    // Check if directory exists
    const fs = require('fs');
    if (!fs.existsSync(bot.directory)) return res.status(400).send('Bot directory not found');
    
    exec('git pull', { cwd: bot.directory }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Git pull error: ${error}`);
        return res.status(500).send('Failed to pull from GitHub');
      }
      pm2Manager.restartBot(botId).then(() => {
        res.send('Deploy triggered and bot restarted');
      }).catch(e => res.status(500).send(e.message));
    });
  });
});

// Serve static frontend
app.use(express.static(path.join(__dirname, '../client/dist')));
app.use((req, res, next) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// WebSocket for real-time logs
wss.on('connection', (ws, req) => {
    console.log('Client connected to WebSocket');
    
    // In a real app, you'd extract token from req.url or headers and verify it here
    
    let subscribedBot = null;
    let logInterval;
    
    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            if (data.action === 'subscribe_logs' && data.botId) {
                subscribedBot = data.botId;
                
                // Clear any existing interval
                if (logInterval) clearInterval(logInterval);
                
                // Send initial data
                const logs = await pm2Manager.getBotLogs(subscribedBot);
                ws.send(JSON.stringify({ type: 'logs', data: logs }));
                const metrics = await pm2Manager.getBotMetrics(subscribedBot);
                ws.send(JSON.stringify({ type: 'metrics', data: metrics }));
                
                logInterval = setInterval(async () => {
                    try {
                        const logs = await pm2Manager.getBotLogs(subscribedBot, 50);
                        ws.send(JSON.stringify({ type: 'logs', data: logs }));
                        const metrics = await pm2Manager.getBotMetrics(subscribedBot);
                        ws.send(JSON.stringify({ type: 'metrics', data: metrics }));
                    } catch(e) {
                        // ignore errors
                    }
                }, 2000); // Poll every 2 seconds
            } else if (data.action === 'update_panel' && data.token) {
                const jwt = require('jsonwebtoken');
                const JWT_SECRET = process.env.JWT_SECRET || 'nxs_bot_deploy_super_secret';
                jwt.verify(data.token, JWT_SECRET, (err, user) => {
                    if (err || user.role !== 'admin') return ws.send(JSON.stringify({ type: 'update_logs', data: 'Unauthorized\n' }));
                    
                    const { spawn } = require('child_process');
                    const path = require('path');
                    const updateScript = path.join(__dirname, '..', 'update.sh');
                    
                    const updateProcess = spawn('bash', [updateScript]);
                    
                    updateProcess.stdout.on('data', (d) => ws.send(JSON.stringify({ type: 'update_logs', data: d.toString() })));
                    updateProcess.stderr.on('data', (d) => ws.send(JSON.stringify({ type: 'update_logs', data: d.toString() })));
                    updateProcess.on('close', (code) => ws.send(JSON.stringify({ type: 'update_logs', data: `\nUpdate process exited with code ${code}\nPanel will restart if successful.` })));
                });
            }
        } catch(e) {
            console.error("WS error", e);
        }
    });

    ws.on('close', () => {
        if (logInterval) clearInterval(logInterval);
        console.log('Client disconnected');
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
