import { NextRequest, NextResponse } from 'next/server'

/**
 * Performance test endpoint to measure API response times and optimizations
 */
export async function GET(request: NextRequest) {
  const startTime = performance.now()
  
  try {
    // Simulate different response scenarios
    const { searchParams } = new URL(request.url)
    const scenario = searchParams.get('scenario') || 'fast'
    const size = parseInt(searchParams.get('size') || '1000')
    
    // Generate test data of varying sizes
    const generateTestData = (itemCount: number) => {
      const items = []
      for (let i = 0; i < itemCount; i++) {
        items.push({
          id: `item-${i}`,
          title: `Test Item ${i}`,
          description: 'This is a test item for performance testing. '.repeat(5),
          timestamp: new Date().toISOString(),
          metadata: {
            category: i % 5 === 0 ? 'important' : 'normal',
            priority: Math.floor(Math.random() * 10),
            tags: ['test', 'performance', 'data'],
            nested: {
              level1: {
                level2: {
                  level3: `Deep nested data ${i}`
                }
              }
            }
          }
        })
      }
      return items
    }
    
    let responseData = {}
    let delay = 0
    
    switch (scenario) {
      case 'fast':
        // Fast response with minimal data
        responseData = {
          message: 'Fast response',
          data: generateTestData(Math.min(size, 10)),
          optimized: true
        }
        delay = 0
        break
        
      case 'medium':
        // Medium response with moderate data
        responseData = {
          message: 'Medium response',
          data: generateTestData(Math.min(size, 100)),
          pagination: {
            page: 1,
            limit: 100,
            totalCount: size,
            hasMore: size > 100
          }
        }
        delay = 500
        break
        
      case 'slow':
        // Slow response with large data
        responseData = {
          message: 'Slow response',
          data: generateTestData(Math.min(size, 1000)),
          analytics: {
            processingTime: '2.5s',
            complexity: 'high',
            cacheHit: false
          }
        }
        delay = 2500
        break
        
      case 'timeout':
        // Simulate a timeout scenario
        delay = 12000 // Longer than typical timeout
        responseData = { message: 'This should timeout' }
        break
        
      case 'error':
        // Simulate an error
        await new Promise(resolve => setTimeout(resolve, 100))
        return NextResponse.json(
          { 
            error: 'Simulated error for testing',
            errorCode: 'TEST_ERROR',
            timestamp: new Date().toISOString()
          },
          { status: 500 }
        )
        
      default:
        responseData = { message: 'Default response', data: [] }
    }
    
    // Add artificial delay if specified
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay))
    }
    
    const endTime = performance.now()
    const duration = endTime - startTime
    
    // Add performance metadata to response
    const response = {
      ...responseData,
      performance: {
        scenario,
        requestedSize: size,
        actualSize: responseData.data?.length || 0,
        serverDuration: `${duration.toFixed(2)}ms`,
        timestamp: new Date().toISOString(),
        recommendations: getPerformanceRecommendations(duration, size)
      }
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    const endTime = performance.now()
    const duration = endTime - startTime
    
    console.error('Performance test error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Performance test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        performance: {
          serverDuration: `${duration.toFixed(2)}ms`,
          failed: true
        },
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

function getPerformanceRecommendations(duration: number, dataSize: number) {
  const recommendations = []
  
  if (duration > 3000) {
    recommendations.push('Consider implementing pagination for large datasets')
    recommendations.push('Add caching layers for frequently requested data')
  }
  
  if (duration > 1000) {
    recommendations.push('Optimize database queries')
    recommendations.push('Consider using CDN for static content')
  }
  
  if (dataSize > 500) {
    recommendations.push('Implement virtual scrolling for large lists')
    recommendations.push('Consider lazy loading for non-critical data')
  }
  
  if (duration < 500 && dataSize < 100) {
    recommendations.push('Excellent performance! Consider increasing cache time')
  }
  
  return recommendations
}

// POST endpoint for performance testing with data
export async function POST(request: NextRequest) {
  const startTime = performance.now()
  
  try {
    const body = await request.json()
    const { testType, dataSize, simulateProcessing } = body
    
    // Simulate data processing
    if (simulateProcessing) {
      const processingTime = Math.min(dataSize * 0.1, 2000) // Max 2 seconds
      await new Promise(resolve => setTimeout(resolve, processingTime))
    }
    
    const endTime = performance.now()
    const duration = endTime - startTime
    
    return NextResponse.json({
      success: true,
      testType,
      receivedDataSize: JSON.stringify(body).length,
      performance: {
        serverDuration: `${duration.toFixed(2)}ms`,
        processingTime: simulateProcessing ? `${(duration - 50).toFixed(2)}ms` : '0ms',
        timestamp: new Date().toISOString()
      },
      recommendations: getPerformanceRecommendations(duration, dataSize || 0)
    })
    
  } catch (error) {
    const endTime = performance.now()
    const duration = endTime - startTime
    
    return NextResponse.json(
      {
        success: false,
        error: 'POST performance test failed',
        performance: {
          serverDuration: `${duration.toFixed(2)}ms`,
          failed: true
        }
      },
      { status: 500 }
    )
  }
}