#!/bin/bash

# 🚀 Quality/QA Deployment Script for Kopran Material Issue Note Print
# This script automates the build and deployment process to Cloud Foundry

set -e  # Exit on error

echo "================================"
echo "🚀 Starting Quality Deployment"
echo "================================"

# 🚀 Step 1: Build React App
echo ""
echo "📦 Step 1: Building React App..."
cd app
npm install
npm run build
cd ..

# 🔄 Step 2: Replace Approuter Build
echo ""
echo "🔄 Step 2: Copying build to approuter..."
rm -rf approuter/build
cp -r app/build approuter/build

# ❌ Step 3: Clean previous deployment (commented out - uncomment if needed)
# echo ""
# echo "❌ Step 3: Cleaning previous deployment..."
# cf undeploy invoicing-capm-quality -f --delete-services

# 🧹 Step 4: Clean archive folder
echo ""
echo "🧹 Step 4: Cleaning archive folder..."
rm -rf mta_archives

# 🛡️ Step 5: Apply quality-specific configurations
echo ""
echo "🛡️ Step 5: Applying quality-specific configurations..."
cp xs-security-quality.json xs-security.json
cp approuter/xs-app-quality.json approuter/xs-app.json

# 🏗️ Step 6: Rebuild MTA
echo ""
echo "🏗️ Step 6: Building MTA archive..."
mbt build -t mta_archives -m mta-qa.yaml

# ☁️ Step 7: Deploy MTAR
echo ""
echo "☁️ Step 7: Deploying to Cloud Foundry..."
cf deploy mta_archives/invoicing-capm_1.0.0.mtar -f

# 🧹 Step 8: Clean node_modules
echo ""
echo "🧹 Step 8: Cleaning node_modules..."
find . -name "node_modules" -type d -prune -exec rm -rf {} +

echo ""
echo "================================"
echo "✅ Quality Deployment Complete!"
echo "================================"
