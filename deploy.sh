#!/bin/bash

# NxsBotDeployDash Deployment Script for Ubuntu/Debian
# Run with: curl -sSL https://raw.githubusercontent.com/nexos20lv/NxsBotDeployDash/main/deploy.sh | bash

REPO_URL="https://github.com/nexos20lv/NxsBotDeployDash.git"
INSTALL_DIR="/opt/NxsBotDeployDash"

echo "Starting deployment of NxsBotDeployDash..."

# Prompt for Admin Credentials
echo ""
echo "=== Admin Account Setup ==="
read -p "Enter Admin Username [admin]: " ADMIN_USER < /dev/tty
ADMIN_USER=${ADMIN_USER:-admin}
read -p "Enter Admin Password [admin]: " ADMIN_PASS < /dev/tty
ADMIN_PASS=${ADMIN_PASS:-admin}
echo "==========================="
echo ""

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

# Write .env file with admin credentials
echo "ADMIN_USERNAME=$ADMIN_USER" > .env
echo "ADMIN_PASSWORD=$ADMIN_PASS" >> .env

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
echo "Your admin credentials are:"
echo "Username: $ADMIN_USER"
echo "Password: $ADMIN_PASS"
