import { NextRequest, NextResponse } from 'next/server'

// Simple test endpoint for cron services - NO AUTHENTICATION REQUIRED
async function handleRequest(request: NextRequest) {
  try {
    const now = new Date()
    const userAgent = request.headers.get('user-agent') || ''
    const authHeader = request.headers.get('authorization')
    
    return NextResponse.json({
      success: true,
      message: 'Cron test endpoint working perfectly!',
      timestamp: now.toISOString(),
      method: request.method,
      userAgent: userAgent,
      authorization: authHeader ? `Present: ${authHeader.substring(0, 20)}...` : 'Missing',
      headers: Object.fromEntries(request.headers.entries()),
      nextExecution: 'Ready for main processor'
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Test endpoint failed' },
      { status: 500 }
    )
  }
}

// Export both GET and POST handlers
export async function GET(request: NextRequest) {
  return handleRequest(request)
}

export async function POST(request: NextRequest) {
  return handleRequest(request)
}