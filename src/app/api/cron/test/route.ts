import { NextRequest, NextResponse } from 'next/server'

// Simple test endpoint for cron services
async function handleRequest(request: NextRequest) {
  try {
    const now = new Date()
    
    return NextResponse.json({
      success: true,
      message: 'Cron test endpoint working',
      timestamp: now.toISOString(),
      method: request.method,
      userAgent: request.headers.get('user-agent'),
      authorization: request.headers.get('authorization') ? 'Present' : 'Missing'
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