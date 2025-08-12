#!/usr/bin/env node

require('dotenv').config();
const dbConnection = require('../database/connection');

async function initializeDatabase() {
  try {
    console.log('🔧 Initializing database...');
    
    await dbConnection.initialize();
    console.log('✅ Database initialized successfully');
    
    // Get some basic stats
    const stats = await dbConnection.get('SELECT COUNT(*) as count FROM scenarios');
    console.log(`📊 Current scenarios count: ${stats.count}`);
    
    await dbConnection.close();
    console.log('🔒 Database connection closed');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

initializeDatabase();
