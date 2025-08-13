# CapRover Deployment Guide for Loan Comparison Tool

This guide will help you deploy your Loan Comparison Tool to CapRover successfully.

## Prerequisites

1. CapRover server running and accessible
2. Domain configured for your CapRover instance
3. Git repository with your code

## Deployment Steps

### 1. Create New App in CapRover

1. Log into your CapRover dashboard
2. Go to "Apps" section
3. Click "Create New App"
4. Enter app name (e.g., `loan-comparison-tool`)
5. Click "Create New App"

### 2. Configure App Settings

#### Environment Variables
Go to your app's "App Configs" tab and add these environment variables:

```bash
NODE_ENV=production
PORT=3001
HOST=0.0.0.0
DB_PATH=/app/data/loan_comparison.db
DB_BACKUP_PATH=/app/backups/
JWT_SECRET=your-super-secure-jwt-secret-here
SESSION_SECRET=your-super-secure-session-secret-here
CORS_ORIGIN=https://your-app-name.your-caprover-domain.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=info
HEALTH_CHECK_PATH=/health
```

**Important**: Replace the placeholder values with secure, randomly generated secrets.

#### App Configuration
- **Port**: 3001 (already configured in Dockerfile)
- **Captain Definition Relative Path**: `./captain-definition` (default)

### 3. Configure Persistent Storage (Optional but Recommended)

For SQLite database persistence:

1. Go to "App Configs" tab
2. Scroll to "Persistent Directories"
3. Add persistent directory:
   - **Path in App**: `/app/data`
   - **Label**: `database-storage`

4. Add backup directory:
   - **Path in App**: `/app/backups`
   - **Label**: `backup-storage`

### 4. Deploy from Git Repository

#### Option A: Deploy from GitHub/GitLab
1. Go to "Deployment" tab
2. Select "Deploy from Github/Bitbucket/Gitlab"
3. Enter your repository URL
4. Select branch (usually `main` or `master`)
5. Click "Deploy Now"

#### Option B: Deploy via CLI
```bash
# Install CapRover CLI if not already installed
npm install -g caprover

# Login to your CapRover instance
caprover login

# Deploy from your project directory
caprover deploy
```

### 5. Configure Domain and SSL

1. Go to "HTTP Settings" tab
2. Enable HTTPS
3. Add your custom domain (optional)
4. Force HTTPS redirect (recommended)

### 6. Monitor Deployment

1. Check "App Logs" tab for any deployment issues
2. Verify health check is working: `https://your-app.your-domain.com/health`
3. Test the application functionality

## Troubleshooting

### Common Issues

1. **Build Fails**
   - Check logs in "App Logs" tab
   - Ensure all dependencies are in package.json
   - Verify Node.js version compatibility

2. **App Won't Start**
   - Check environment variables are set correctly
   - Verify PORT is set to 3001
   - Check persistent directories are configured

3. **Database Issues**
   - Ensure persistent storage is configured for `/app/data`
   - Check database initialization in logs
   - Verify SQLite permissions

4. **CORS Issues**
   - Update CORS_ORIGIN environment variable with your actual domain
   - Check frontend is making requests to correct backend URL

### Health Check

The app includes a health check endpoint at `/health`. CapRover will use this to monitor app health.

### Scaling

For production use, consider:
- Enabling multiple instances (if stateless)
- Using external database instead of SQLite for better scalability
- Setting up automated backups
- Configuring monitoring and alerts

## File Structure

```
loan-comparison-tool/
├── captain-definition          # CapRover deployment config
├── Dockerfile.fullstack       # Multi-stage Docker build
├── .caprover/
│   ├── env.template           # Environment variables template
│   └── DEPLOYMENT_GUIDE.md    # This guide
├── frontend files...
└── backend/
    ├── server.js
    └── ...
```

## Security Notes

1. Always use strong, unique secrets for JWT_SECRET and SESSION_SECRET
2. Configure CORS_ORIGIN with your actual domain
3. Enable HTTPS in CapRover
4. Consider using external database for production
5. Set up regular database backups

## Support

If you encounter issues:
1. Check CapRover documentation: https://caprover.com/docs/
2. Review app logs in CapRover dashboard
3. Verify all environment variables are set correctly
4. Test locally with Docker first if needed
