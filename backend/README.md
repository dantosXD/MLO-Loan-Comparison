# Loan Comparison Tool - Backend API

A secure, production-ready Node.js backend with SQLite database for the MLO Loan Comparison Tool.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Environment Setup

```bash
# Copy environment template
cp env.example .env

# Edit .env with your settings
# PORT=3001
# NODE_ENV=development
# DB_PATH=./data/loan_comparison.db
```

### 3. Initialize Database

```bash
npm run init-db
```

### 4. Start Development Server

```bash
npm run dev
```

The API will be available at `http://localhost:3001`

## 📡 API Endpoints

### Health Check
- `GET /health` - Server health status

### Scenarios
- `GET /api/scenarios` - Get all scenarios
- `GET /api/scenarios/:name` - Get specific scenario
- `POST /api/scenarios` - Create/update scenario
- `PUT /api/scenarios/:name` - Update specific scenario
- `DELETE /api/scenarios/:name` - Delete scenario
- `POST /api/scenarios/export` - Export all scenarios
- `POST /api/scenarios/import` - Import scenarios
- `POST /api/scenarios/current-state` - Save current working state
- `GET /api/scenarios/current-state` - Load current working state
- `GET /api/scenarios/stats` - Get scenario statistics

## 🗄️ Database

### SQLite Database
- **Location**: `./data/loan_comparison.db`
- **Backup Location**: `./backups/`
- **Schema**: PostgreSQL-compatible for easy migration

### Database Commands
```bash
# Initialize/reset database
npm run init-db

# Create backup
npm run backup-db
```

## 🔧 Production Deployment

### 1. Environment Variables
```bash
NODE_ENV=production
PORT=3001
DB_PATH=/var/lib/loan-comparison/loan_comparison.db
DB_BACKUP_PATH=/var/backups/loan-comparison/
CORS_ORIGIN=https://yourdomain.com
```

### 2. Process Management (PM2)
```bash
# Install PM2 globally
npm install -g pm2

# Start application
pm2 start server.js --name "loan-comparison-api"

# Save PM2 configuration
pm2 save
pm2 startup
```

### 3. Nginx Reverse Proxy
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Serve frontend static files
    location / {
        root /path/to/frontend/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

## 🔒 Security Features

- **Helmet.js** - Security headers
- **CORS** - Cross-origin resource sharing
- **Rate Limiting** - API request throttling
- **Input Validation** - Request data validation
- **Audit Logging** - Database change tracking
- **Graceful Shutdown** - Clean process termination

## 📊 Database Schema

### Tables
- **users** - User accounts (future multi-user support)
- **scenarios** - Loan comparison scenarios
- **clients** - Client information (future feature)
- **audit_log** - Change tracking for compliance

### Migration Ready
The SQLite schema is designed to be PostgreSQL-compatible for easy migration when scaling to multi-user.

## 🔄 Migration to PostgreSQL

When ready to scale:

1. **Install PostgreSQL dependencies**
   ```bash
   npm install pg
   ```

2. **Update connection.js** to use PostgreSQL
3. **Run migration script** (will be provided)
4. **Update environment variables**

The API interface remains unchanged - zero frontend modifications needed.

## 📈 Monitoring & Maintenance

### Health Monitoring
- `GET /health` - Returns server status
- Check database connectivity
- Monitor disk space for SQLite file

### Backup Strategy
```bash
# Daily automated backup (add to crontab)
0 2 * * * cd /path/to/backend && npm run backup-db

# Weekly backup rotation
# Keep 4 weeks of backups, delete older ones
```

### Log Management
- Application logs via console
- Consider adding file logging for production
- Monitor error rates and performance

## 🛠️ Development

### Project Structure
```
backend/
├── database/
│   ├── connection.js     # Database connection & utilities
│   └── schema.sql        # Database schema
├── routes/
│   └── scenarios.js      # API route handlers
├── services/
│   └── scenarioService.js # Business logic
├── scripts/
│   ├── init-database.js  # Database initialization
│   └── backup-database.js # Backup utility
├── server.js             # Main Express server
└── package.json          # Dependencies & scripts
```

### Adding New Features
1. Add database schema changes to `schema.sql`
2. Create service methods in appropriate service file
3. Add API routes in `routes/` directory
4. Update frontend storage manager if needed

## 🚨 Troubleshooting

### Common Issues

**Database locked error**
```bash
# Check for zombie processes
ps aux | grep node
kill -9 <process_id>

# Restart server
npm run dev
```

**CORS errors**
- Check `CORS_ORIGIN` in `.env`
- Ensure frontend URL matches exactly

**Port already in use**
```bash
# Find process using port 3001
lsof -i :3001
kill -9 <process_id>
```

## 📞 Support

For issues or questions:
1. Check the troubleshooting section
2. Review server logs
3. Verify database connectivity
4. Check environment configuration
