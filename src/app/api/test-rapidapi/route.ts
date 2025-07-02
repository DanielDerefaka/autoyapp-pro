import { NextResponse } from 'next/server'
import { rapidApiTwitterClient } from '@/lib/rapidapi-twitter'

export async function GET() {
  try {
    console.log('🧪 Testing RapidAPI connection...')
    
    const testResult = await rapidApiTwitterClient.testConnection()
    
    if (testResult.success) {
      // If connection works, try to get some tweets
      console.log('✅ Connection successful, testing tweet fetching...')
      
      try {
        const tweetsResult = await rapidApiTwitterClient.getMultipleUsersTweets(['elonmusk'], 3)
        
        return NextResponse.json({
          success: true,
          connection: testResult,
          sampleData: {
            usersTested: 1,
            tweetsFound: tweetsResult[0]?.tweets?.length || 0,
            sampleTweet: tweetsResult[0]?.tweets?.[0]?.content?.substring(0, 100) || 'No tweets found'
          },
          configuration: {
            rapidApiEnabled: process.env.ENABLE_RAPIDAPI === 'true',
            hasApiKey: !!process.env.RAPIDAPI_KEY,
            apiKeyPreview: process.env.RAPIDAPI_KEY ? `${process.env.RAPIDAPI_KEY.substring(0, 8)}...` : 'Not set'
          }
        })
      } catch (tweetError) {
        return NextResponse.json({
          success: false,
          connection: testResult,
          error: `Connection OK but tweet fetching failed: ${tweetError instanceof Error ? tweetError.message : 'Unknown error'}`,
          configuration: {
            rapidApiEnabled: process.env.ENABLE_RAPIDAPI === 'true',
            hasApiKey: !!process.env.RAPIDAPI_KEY,
            apiKeyPreview: process.env.RAPIDAPI_KEY ? `${process.env.RAPIDAPI_KEY.substring(0, 8)}...` : 'Not set'
          }
        })
      }
    } else {
      return NextResponse.json({
        success: false,
        connection: testResult,
        configuration: {
          rapidApiEnabled: process.env.ENABLE_RAPIDAPI === 'true',
          hasApiKey: !!process.env.RAPIDAPI_KEY,
          apiKeyPreview: process.env.RAPIDAPI_KEY ? `${process.env.RAPIDAPI_KEY.substring(0, 8)}...` : 'Not set'
        }
      }, { status: 400 })
    }
  } catch (error) {
    console.error('❌ RapidAPI test failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      configuration: {
        rapidApiEnabled: process.env.ENABLE_RAPIDAPI === 'true',
        hasApiKey: !!process.env.RAPIDAPI_KEY,
        apiKeyPreview: process.env.RAPIDAPI_KEY ? `${process.env.RAPIDAPI_KEY.substring(0, 8)}...` : 'Not set'
      }
    }, { status: 500 })
  }
}