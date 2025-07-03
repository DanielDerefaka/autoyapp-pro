#!/usr/bin/env node

const cron = require('node-cron');
const fetch = require('node-fetch');

// Load environment variables
require('dotenv').config();

const CRON_SECRET = process.env.CRON_SECRET;
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

console.log('🚀 Starting cron job runner...');

// Run every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  console.log('⏰ Running scheduled tweets cron job...');
  
  try {
    const response = await fetch(`${APP_URL}/api/cron/process-scheduled-tweets`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Cron job completed successfully:', result);
    } else {
      console.error('❌ Cron job failed:', response.status, await response.text());
    }
  } catch (error) {
    console.error('❌ Error running cron job:', error);
  }
});

console.log('📅 Cron job scheduled to run every 5 minutes');