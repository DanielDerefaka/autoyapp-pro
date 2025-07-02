import { NextResponse } from 'next/server'
import { xApiClient } from '@/lib/x-api'

export async function GET() {
  try {
    // Test basic X API connectivity
    const testConfig = {
      hasApiKey: !!process.env.X_API_KEY,
      hasApiSecret: !!process.env.X_API_SECRET,
      hasBearerToken: !!process.env.X_BEARER_TOKEN,
      hasClientId: !!process.env.X_CLIENT_ID,
      hasClientSecret: !!process.env.X_CLIENT_SECRET,
    }
    
    return NextResponse.json({
      status: 'X API Configuration Test',
      config: testConfig,
      ready: Object.values(testConfig).every(Boolean),
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'X API test failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}