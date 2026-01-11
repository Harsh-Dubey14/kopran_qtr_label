#!/bin/bash

# deploy.sh

TARGET_ENV=${1:-dev}

if [[ "$TARGET_ENV" != "dev" && "$TARGET_ENV" != "quality" && "$TARGET_ENV" != "prod" ]]; then
  echo "❌ Invalid environment. Use: dev, quality, or prod"
  exit 1
fi

echo "🚀 Deploying to $TARGET_ENV..."

# Step 0: Copy correct config files
cp xs-security-$TARGET_ENV.json xs-security.json
cp approuter/xs-app-$TARGET_ENV.json approuter/xs-app.json

# Step 1: Build React and copy to approuter
cd app
npm run build
rm -rf ../approuter/build
cp -r build ../approuter/build
cd ..

# Step 2: Target correct CF space
cf target -o "Merit_Polymers Pvt Ltd._MeritPolymersSubdomain1" -s ${TARGET_ENV^^}

# Step 3: Build MTA (no -e if no mtaext used)
rm -rf mta_archives
mbt build -t mta_archives

# Step 4: Deploy
cf deploy mta_archives/migo-print-dev_1.0.0.mtar -f
