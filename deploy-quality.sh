#!/bin/bash

# deploy-quality.sh

echo "🚀 Deploying to QUALITY..."

# Step 0: Copy QUALITY-specific config files
cp xs-security-quality.json xs-security.json
cp approuter/xs-app-quality.json approuter/xs-app.json

# Step 1: Build React and copy to approuter
cd app
npm run build
rm -rf ../approuter/build
cp -r build ../approuter/build
cd ..

# Step 2: Target QUALITY CF space
cf target -o "Merit_Polymers Pvt Ltd._MeritPolymersSubdomain1" -s QUALITY

# Step 3: Build MTA (no extension file used)
rm -rf mta_archives
mbt build -t mta_archives

# Step 4: Deploy the MTAR
cf deploy mta_archives/migo-print-dev_1.0.0.mtar -f
