#!/usr/bin/env node

require('dotenv').config();
const dbConnection = require('../database/connection');
const fs = require('fs');
const path = require('path');

async function backupDatabase() {
  try {
    console.log('💾 Starting database backup...');
    
    await dbConnection.initialize();
    
    // Create backup directory if it doesn't exist
    const backupDir = process.env.DB_BACKUP_PATH || './backups';
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // Generate backup filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `loan_comparison_backup_${timestamp}.db`);
    
    // Perform backup
    await dbConnection.backup(backupPath);
    
    // Get file size for confirmation
    const stats = fs.statSync(backupPath);
    const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
    
    console.log(`✅ Database backup completed successfully`);
    console.log(`📁 Backup location: ${backupPath}`);
    console.log(`📊 Backup size: ${fileSizeInMB} MB`);
    
    await dbConnection.close();
    console.log('🔒 Database connection closed');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Database backup failed:', error);
    process.exit(1);
  }
}

backupDatabase();
