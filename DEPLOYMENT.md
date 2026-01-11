# Deployment Scripts Documentation

## Overview

This project includes three deployment scripts for different environments:

- **Development**: `deploy-dev.sh`
- **Quality/QA**: `deploy-qa.sh`
- **Production**: `deploy-prod.sh`

## Prerequisites

1. Node.js and npm installed
2. Cloud Foundry CLI (`cf`) installed
3. MTA Build Tool (`mbt`) installed
4. Logged into Cloud Foundry: `cf login`

## Environment Setup

### Development (dev)

- **MTA File**: `mta-dev.yaml`
- **Security Config**: `xs-security-dev.json`
- **App Router Config**: `approuter/xs-app-dev.json`
- **Credentials**: Development credentials in mta-dev.yaml

### Quality/QA (qa)

- **MTA File**: `mta-qa.yaml`
- **Security Config**: `xs-security-quality.json`
- **App Router Config**: `approuter/xs-app-quality.json`
- **Credentials**: Quality credentials in mta-qa.yaml

### Production (prod)

- **MTA File**: `mta-prod.yaml`
- **Security Config**: `xs-security-production.json`
- **App Router Config**: `approuter/xs-app-production.json`
- **Credentials**: Production credentials in mta-prod.yaml

## Running Deployments

### Development Deployment

```bash
chmod +x deploy-dev.sh
./deploy-dev.sh
```

### Quality Deployment

```bash
chmod +x deploy-qa.sh
./deploy-qa.sh
```

### Production Deployment

```bash
chmod +x deploy-prod.sh
./deploy-prod.sh
```

## What Each Script Does

1. **Builds React App** - Compiles the React application
2. **Copies Build to AppRouter** - Updates the approuter with the new build
3. **Cleans Archive** - Removes old MTA archives
4. **Applies Environment-Specific Configs** - Copies the correct security and routing files
5. **Builds MTA** - Packages the application using the appropriate mta file
6. **Deploys to Cloud Foundry** - Pushes the application to CF
7. **Cleans Up** - Removes node_modules and resets git state

## Important Notes

- Each script uses its corresponding environment configuration
- The scripts include cleanup steps to remove old deployments (commented out by default)
- Ensure you're logged into the correct CF space before running deployment scripts
- Production deployments require extra caution - review changes before deploying

## Git Branches

- `main` - Production branch
- `development` - Development environment branch
- `quality` - QA/Testing branch
- `production` - Production release branch

## Manual Deployment (if needed)

If you prefer manual control, follow these steps:

```bash
# 1. Build React app
cd app
npm install
npm run build
cd ..

# 2. Copy build to approuter
cp -r app/build approuter/build

# 3. Clean archives
rm -rf mta_archives

# 4. Copy environment-specific configs (choose one)
cp xs-security-dev.json xs-security.json
cp approuter/xs-app-dev.json approuter/xs-app.json

# 5. Build MTA (choose appropriate file)
mbt build -t mta_archives -m mta-dev.yaml

# 6. Deploy
cf deploy mta_archives/invoicing-capm_1.0.0.mtar -f
```
