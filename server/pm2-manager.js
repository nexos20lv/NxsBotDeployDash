const pm2 = require('pm2');
const path = require('path');

class PM2Manager {
  constructor() {
    this.connected = false;
  }

  connect() {
    return new Promise((resolve, reject) => {
      pm2.connect((err) => {
        if (err) {
          console.error(err);
          reject(err);
        } else {
          this.connected = true;
          resolve();
        }
      });
    });
  }

  disconnect() {
    pm2.disconnect();
    this.connected = false;
  }

  async startBot(bot) {
    if (!this.connected) await this.connect();
    return new Promise((resolve, reject) => {
      let script = bot.main_file;
      let args = [];
      let interpreter = undefined;

      if (bot.type === 'python') {
        interpreter = 'python'; // or python3 depending on system
      }

      pm2.start({
        name: `bot_${bot.id}`,
        script: path.join(bot.directory, script),
        cwd: bot.directory,
        interpreter: interpreter,
        autorestart: true,
        log_date_format: "YYYY-MM-DD HH:mm:ss Z"
      }, (err, apps) => {
        if (err) return reject(err);
        resolve(apps);
      });
    });
  }

  async stopBot(botId) {
    if (!this.connected) await this.connect();
    return new Promise((resolve, reject) => {
      pm2.stop(`bot_${botId}`, (err, apps) => {
        if (err) return reject(err);
        resolve(apps);
      });
    });
  }

  async restartBot(botId) {
    if (!this.connected) await this.connect();
    return new Promise((resolve, reject) => {
      pm2.restart(`bot_${botId}`, (err, apps) => {
        if (err) return reject(err);
        resolve(apps);
      });
    });
  }

  async deleteBot(botId) {
    if (!this.connected) await this.connect();
    return new Promise((resolve, reject) => {
      pm2.delete(`bot_${botId}`, (err, apps) => {
        if (err) return reject(err);
        resolve(apps);
      });
    });
  }

  async listBots() {
    if (!this.connected) await this.connect();
    return new Promise((resolve, reject) => {
      pm2.list((err, processDescriptionList) => {
        if (err) return reject(err);
        resolve(processDescriptionList);
      });
    });
  }

  async getBotMetrics(botId) {
    if (!this.connected) await this.connect();
    return new Promise((resolve, reject) => {
      pm2.describe(`bot_${botId}`, (err, description) => {
        if (err) return reject(err);
        if (!description || description.length === 0) return resolve({ cpu: 0, memory: 0 });

        const proc = description[0];
        const memoryMB = proc.monit ? (proc.monit.memory / 1024 / 1024).toFixed(2) : 0;
        const cpuPercent = proc.monit ? proc.monit.cpu : 0;

        resolve({
          cpu: cpuPercent,
          memory: memoryMB,
          status: proc.pm2_env.status
        });
      });
    });
  }
  
  async getBotLogs(botId, lines = 100) {
    if (!this.connected) await this.connect();
    // Getting logs via API requires parsing the log file, or using pm2.describe to get the log path
    return new Promise((resolve, reject) => {
        pm2.describe(`bot_${botId}`, (err, description) => {
            if (err) return reject(err);
            if (description.length === 0) return resolve({ out: "", err: "" });
            
            const processData = description[0];
            const out_path = processData.pm2_env.pm_out_log_path;
            const err_path = processData.pm2_env.pm_err_log_path;
            
            const fs = require('fs');
            // This is a simple read, for large files a proper tail should be implemented
            let outLogs = "";
            let errLogs = "";
            try {
                if(fs.existsSync(out_path)) outLogs = fs.readFileSync(out_path, 'utf8').split('\n').slice(-lines).join('\n');
                if(fs.existsSync(err_path)) errLogs = fs.readFileSync(err_path, 'utf8').split('\n').slice(-lines).join('\n');
            } catch (e) {
                console.error("Error reading logs", e);
            }
            resolve({ out: outLogs, err: errLogs });
        });
    });
  }
  async flushLogs(botId) {
    if (!this.connected) await this.connect();
    return new Promise((resolve, reject) => {
      pm2.flush(`bot_${botId}`, (err, apps) => {
        if (err) return reject(err);
        resolve(apps);
      });
    });
  }
}

module.exports = new PM2Manager();
