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

app.use('/api/auth', authRoutes.router);
app.use('/api/bots', botsRoutes);

// Serve static frontend
app.use(express.static(path.join(__dirname, '../client/dist')));
app.use((req, res, next) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// WebSocket for real-time logs
wss.on('connection', (ws, req) => {
    console.log('Client connected to WebSocket');
    
    // In a real app, you'd extract token from req.url or headers and verify it here
    
    let logInterval;
    
    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            if (data.action === 'subscribe_logs' && data.botId) {
                // Clear any existing interval
                if (logInterval) clearInterval(logInterval);
                
                logInterval = setInterval(async () => {
                    try {
                        const logs = await pm2Manager.getBotLogs(data.botId, 50); // Get last 50 lines
                        ws.send(JSON.stringify({ type: 'logs', data: logs }));
                    } catch(e) {
                        // ignore errors if bot is offline or no logs yet
                    }
                }, 2000); // Poll every 2 seconds
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
    console.log(`Server running on port ${PORT}`);
});
