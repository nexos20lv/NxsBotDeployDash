#!/bin/bash

# NxsBotDeployDash Auto-Update Script
echo "Starting update process..."

# 1. Pull latest changes
git pull origin main

# 2. Update Backend Dependencies
echo "Updating backend..."
cd server
npm install
cd ..

# 3. Update Frontend
echo "Updating frontend..."
cd client
npm install
npm run build
cd ..

# 4. Restart Daemon
echo "Restarting daemon..."
pm2 restart NxsBotDeploy-Daemon

echo "Update complete!"
