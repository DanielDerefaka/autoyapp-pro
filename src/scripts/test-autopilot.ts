#!/usr/bin/env tsx

/**
 * Test script for autopilot functionality
 * Run with: npx tsx src/scripts/test-autopilot.ts
 */

const APP_URL = process.env.APP_URL || 'http://localhost:3000'
const CRON_SECRET = process.env.CRON_SECRET || 'test-secret'

async function testAutopilotEndpoint(endpoint: string, name: string) {
  console.log(`\n🧪 Testing ${name}...`)
  
  try {
    const response = await fetch(`${APP_URL}/api/cron/${endpoint}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`,
        'Content-Type': 'application/json'
      }
    })

    const data = await response.json()
    
    if (response.ok) {
      console.log(`✅ ${name} test passed`)
      console.log(`📊 Response:`, JSON.stringify(data, null, 2))
    } else {
      console.log(`❌ ${name} test failed:`, response.status)
      console.log(`📊 Error:`, JSON.stringify(data, null, 2))
    }
  } catch (error) {
    console.log(`❌ ${name} test error:`, error)
  }
}

async function testAutopilotSettings() {
  console.log(`\n🧪 Testing Autopilot Settings API...`)
  
  try {
    const response = await fetch(`${APP_URL}/api/autopilot/settings`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const data = await response.json()
    
    if (response.ok) {
      console.log(`✅ Autopilot Settings API test passed`)
      console.log(`📊 Default settings:`, JSON.stringify(data.settings, null, 2))
    } else {
      console.log(`❌ Autopilot Settings API test failed:`, response.status)
      console.log(`📊 Error:`, JSON.stringify(data, null, 2))
    }
  } catch (error) {
    console.log(`❌ Autopilot Settings API test error:`, error)
  }
}

async function main() {
  console.log('🚀 Starting Autopilot Test Suite')
  console.log(`📍 App URL: ${APP_URL}`)
  console.log(`🔑 Using CRON_SECRET: ${CRON_SECRET ? 'Set' : 'Not set'}`)

  // Test individual endpoints
  await testAutopilotSettings()
  await testAutopilotEndpoint('autopilot', 'Autopilot Engine')
  await testAutopilotEndpoint('process-queue', 'Queue Processor')

  console.log('\n✅ Autopilot test suite completed!')
  console.log('\n📝 Next steps:')
  console.log('1. Ensure you have target users configured')
  console.log('2. Enable autopilot in settings')
  console.log('3. Set up cron jobs to run every 15 minutes')
  console.log('4. Monitor the autopilot dashboard for activity')
}

main().catch(console.error)