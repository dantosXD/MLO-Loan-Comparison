#!/bin/bash

# CapRover Deployment Script for Loan Comparison Tool
# This script automates the deployment of both frontend and backend to CapRover

set -e

# Configuration
APP_NAME="loan-comparison-tool"
CAPROVER_URL="${CAPROVER_URL:-https://captain.your-domain.com}"
CAPROVER_PASSWORD="${CAPROVER_PASSWORD}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting CapRover deployment for Loan Comparison Tool${NC}"

# Check if CapRover CLI is installed
if ! command -v caprover &> /dev/null; then
    echo -e "${RED}❌ CapRover CLI not found. Installing...${NC}"
    npm install -g caprover
fi

# Login to CapRover (if not already logged in)
echo -e "${YELLOW}🔐 Logging into CapRover...${NC}"
if [ -n "$CAPROVER_PASSWORD" ]; then
    caprover login --caproverUrl="$CAPROVER_URL" --caproverPassword="$CAPROVER_PASSWORD"
else
    caprover login --caproverUrl="$CAPROVER_URL"
fi

# Create app if it doesn't exist
echo -e "${YELLOW}📱 Creating/updating app: $APP_NAME${NC}"
caprover deploy --caproverApp="$APP_NAME" || {
    echo -e "${YELLOW}App doesn't exist, creating...${NC}"
    caprover apps:create --appName="$APP_NAME"
}

# Set environment variables
echo -e "${YELLOW}⚙️ Setting environment variables...${NC}"
caprover apps:env --appName="$APP_NAME" --envFile=".caprover/env"

# Enable HTTPS
echo -e "${YELLOW}🔒 Enabling HTTPS...${NC}"
caprover apps:ssl --appName="$APP_NAME" --enableSsl

# Deploy the application
echo -e "${YELLOW}🚢 Deploying application...${NC}"
caprover deploy --caproverApp="$APP_NAME"

# Wait for deployment to complete
echo -e "${YELLOW}⏳ Waiting for deployment to complete...${NC}"
sleep 30

# Check health
APP_URL="https://$APP_NAME.your-domain.com"
echo -e "${YELLOW}🏥 Checking application health...${NC}"
if curl -f "$APP_URL/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Deployment successful!${NC}"
    echo -e "${GREEN}🌐 Application URL: $APP_URL${NC}"
    echo -e "${GREEN}📊 Health Check: $APP_URL/health${NC}"
    echo -e "${GREEN}📡 API Base: $APP_URL/api${NC}"
else
    echo -e "${RED}❌ Health check failed. Please check the logs.${NC}"
    caprover logs --appName="$APP_NAME" --lines=50
    exit 1
fi

echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
