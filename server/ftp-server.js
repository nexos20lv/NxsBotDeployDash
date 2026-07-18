const FtpSrv = require('ftp-srv');
const crypto = require('crypto');
const db = require('./db');

const port = 2121;
// Listen on all interfaces
const ftpServer = new FtpSrv({
    url: "ftp://0.0.0.0:" + port,
    anonymous: false,
    pasv_url: process.env.FTP_PASV_URL || undefined, // Useful if behind NAT
    pasv_min: 30000,
    pasv_max: 30010
});

ftpServer.on('login', ({ connection, username, password }, resolve, reject) => {
    // Expected format: bot_1
    if (!username.startsWith('bot_')) {
        return reject(new Error('Invalid username format. Use bot_<ID>'));
    }

    const botIdStr = username.replace('bot_', '');
    const botId = parseInt(botIdStr, 10);

    if (isNaN(botId)) {
        return reject(new Error('Invalid bot ID'));
    }

    db.get("SELECT * FROM bots WHERE id = ?", [botId], (err, bot) => {
        if (err || !bot) {
            return reject(new Error('Bot not found'));
        }

        let ftpPass = bot.ftp_password;
        if (!ftpPass) {
            // Generate one if it was an old bot created before FTP update
            ftpPass = crypto.randomBytes(5).toString('hex');
            db.run("UPDATE bots SET ftp_password = ? WHERE id = ?", [ftpPass, bot.id]);
        }

        if (password === ftpPass) {
            // Success
            resolve({ root: bot.directory });
        } else {
            reject(new Error('Invalid credentials'));
        }
    });
});

ftpServer.on('client-error', ({ connection, context, error }) => {
    // console.error(`FTP Client Error: ${error.message}`);
});

function startFtpServer() {
    ftpServer.listen().then(() => {
        console.log(`FTP Server is running on port ${port} (Passive Ports 30000-30010)`);
    }).catch(err => {
        console.error("Failed to start FTP server:", err);
    });
}

module.exports = startFtpServer;
