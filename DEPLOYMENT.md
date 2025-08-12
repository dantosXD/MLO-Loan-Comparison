# 🚀 Deployment Guide - Loan Comparison Tool

Complete deployment guide for the full-stack Loan Comparison Tool with both frontend and backend.

## 📋 Overview

The application is now configured for multiple deployment options:
- **CapRover** (Recommended for VPS)
- **Docker Compose** (Local/VPS)
- **Manual VPS Deployment**

## 🐳 CapRover Deployment (Recommended)

### Prerequisites
- CapRover server running on your VPS
- Domain configured with CapRover
- CapRover CLI installed: `npm install -g caprover`

### Quick Deploy
```bash
# 1. Make deployment script executable
chmod +x deploy-caprover.sh

# 2. Set your CapRover details
export CAPROVER_URL="https://captain.your-domain.com"
export CAPROVER_PASSWORD="your-password"

# 3. Deploy
./deploy-caprover.sh
```

### Manual CapRover Steps
```bash
# 1. Login to CapRover
caprover login

# 2. Create the app
caprover apps:create --appName="loan-comparison-tool"

# 3. Deploy
caprover deploy --caproverApp="loan-comparison-tool"

# 4. Enable HTTPS
caprover apps:ssl --appName="loan-comparison-tool" --enableSsl
```

### CapRover Configuration
The deployment includes:
- **Full-stack container** (Frontend + Backend)
- **SQLite database** with persistent volumes
- **Automatic HTTPS** via Let's Encrypt
- **Health checks** and auto-restart
- **Environment variables** auto-configured

## 🐋 Docker Compose Deployment

### For VPS or Local Development
```bash
# 1. Build and start
docker-compose up -d

# 2. Check status
docker-compose ps

# 3. View logs
docker-compose logs -f

# 4. Stop
docker-compose down
```

### Production Docker Compose
```bash
# For production with custom settings
docker-compose -f docker-compose.yml up -d
```

## 🔧 Manual VPS Deployment

### Prerequisites
```bash
# Install Node.js 22+
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
npm install -g pm2
```

### Deployment Steps
```bash
# 1. Clone and setup
git clone <your-repo>
cd loan-comparison-tool

# 2. Install dependencies
npm install
cd backend && npm install && cd ..

# 3. Build frontend
npm run build

# 4. Setup backend environment
cd backend
cp env.example .env
# Edit .env with your settings

# 5. Initialize database
npm run init-db

# 6. Start with PM2
pm2 start server.js --name "loan-comparison-api"
pm2 save
pm2 startup
```

## 🌐 Nginx Configuration

### For Manual VPS Deployment
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    # SSL Configuration (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Proxy to Node.js backend
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Static file caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://localhost:3001;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## 🔒 Security Configuration

### Environment Variables
```bash
# Production environment variables
NODE_ENV=production
PORT=3001
DB_PATH=/app/data/loan_comparison.db
DB_BACKUP_PATH=/app/backups/
JWT_SECRET=your-secure-random-secret
BCRYPT_ROUNDS=12
CORS_ORIGIN=https://your-domain.com
```

### Database Security
- SQLite database with restricted file permissions
- Regular automated backups
- Audit logging for compliance
- Input validation and sanitization

### Network Security
- HTTPS enforcement
- CORS protection
- Rate limiting (100 requests/15min)
- Security headers via Helmet.js

## 📊 Monitoring & Maintenance

### Health Checks
```bash
# Check application health
curl https://your-domain.com/health

# Check API status
curl https://your-domain.com/api/scenarios
```

### Backup Management
```bash
# Manual backup (if using manual deployment)
cd backend && npm run backup-db

# Automated backup (add to crontab)
0 2 * * * cd /path/to/backend && npm run backup-db
```

### Log Management
```bash
# CapRover logs
caprover logs --appName="loan-comparison-tool"

# Docker Compose logs
docker-compose logs -f

# PM2 logs
pm2 logs loan-comparison-api
```

## 🚨 Troubleshooting

### Common Issues

**CapRover deployment fails**
```bash
# Check CapRover logs
caprover logs --appName="loan-comparison-tool" --lines=100

# Verify Dockerfile builds locally
docker build -f Dockerfile.fullstack -t loan-test .
```

**Database connection issues**
```bash
# Check database file permissions
ls -la /app/data/

# Verify database initialization
docker exec -it container_name node backend/scripts/init-database.js
```

**Frontend not loading**
```bash
# Check if frontend files are served
curl https://your-domain.com/
curl https://your-domain.com/api/scenarios
```

**CORS errors**
- Verify CORS_ORIGIN matches your domain exactly
- Check that HTTPS is properly configured
- Ensure frontend is making requests to correct API URL

### Performance Optimization

**Database Performance**
- SQLite WAL mode enabled by default
- Indexes on frequently queried columns
- Regular VACUUM operations

**Frontend Performance**
- Static file caching (1 year)
- Gzip compression enabled
- Minified production build

## 📈 Scaling Considerations

### When to Migrate to PostgreSQL
- Multiple concurrent users (>10)
- Large dataset (>10,000 scenarios)
- Need for advanced queries
- Multi-server deployment

### Migration Path
1. Export all data using existing export functionality
2. Set up PostgreSQL database
3. Update backend connection configuration
4. Import data to PostgreSQL
5. Update environment variables
6. Redeploy

## 🎯 Deployment Checklist

### Pre-Deployment
- [ ] Environment variables configured
- [ ] Domain/subdomain configured
- [ ] SSL certificate ready (CapRover handles this)
- [ ] Backup strategy planned

### Post-Deployment
- [ ] Health check passes
- [ ] Frontend loads correctly
- [ ] API endpoints respond
- [ ] Database operations work
- [ ] HTTPS redirect works
- [ ] Backup system tested

### Ongoing Maintenance
- [ ] Monitor disk space for database growth
- [ ] Regular backup verification
- [ ] Security updates applied
- [ ] Performance monitoring
- [ ] Log rotation configured

## 📞 Support

For deployment issues:
1. Check the troubleshooting section
2. Verify all prerequisites are met
3. Review application logs
4. Test individual components (frontend, backend, database)

## 🎉 Success!

Once deployed, your Loan Comparison Tool will be available at:
- **Main App**: `https://your-domain.com`
- **Health Check**: `https://your-domain.com/health`
- **API**: `https://your-domain.com/api`

The application includes:
- ✅ Secure HTTPS deployment
- ✅ Persistent SQLite database
- ✅ Automatic backups
- ✅ Health monitoring
- ✅ Production-ready security
- ✅ Scalable architecture
