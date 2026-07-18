#!/bin/bash

# NxsBotDeployDash Deployment Script for Ubuntu/Debian
# Run with: curl -sSL https://raw.githubusercontent.com/nexos20lv/NxsBotDeployDash/main/deploy.sh | bash

REPO_URL="https://github.com/nexos20lv/NxsBotDeployDash.git"
INSTALL_DIR="/opt/NxsBotDeployDash"

echo "Starting deployment of NxsBotDeployDash..."

# 1. Update and install prerequisites
sudo apt update && sudo apt install -y curl build-essential python3 sqlite3 git

# 2. Install Node.js (v20)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Install global PM2
sudo npm install -g pm2

# 4. Clone Repository
echo "Cloning repository..."
if [ -d "$INSTALL_DIR" ]; then
  echo "Directory $INSTALL_DIR already exists. Updating..."
  cd "$INSTALL_DIR"
  sudo git pull
else
  sudo git clone "$REPO_URL" "$INSTALL_DIR"
  cd "$INSTALL_DIR"
fi

# Fix permissions
sudo chown -R $USER:$USER "$INSTALL_DIR"

# 5. Setup Backend
echo "Setting up backend..."
cd server
npm install
cd ..

# 6. Setup and Build Frontend
echo "Setting up frontend..."
cd client
npm install
npm run build
cd ..

# 7. Start the backend daemon
echo "Starting backend daemon..."
cd server
pm2 start index.js --name "NxsBotDeploy-Daemon"
pm2 save
pm2 startup

echo "Deployment complete! Backend is running on PM2."
echo "Default credentials: admin / admin"
