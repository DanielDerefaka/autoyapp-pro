import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Get detailed debug info about the autopilot system
    const users = await prisma.user.findMany({
      where: {
        autopilotSettings: {
          isEnabled: true
        }
      },
      include: {
        autopilotSettings: true,
        xAccounts: true,
        targetUsers: {
          include: {
            tweets: {
              where: {
                publishedAt: {
                  gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
                }
              },
              orderBy: { publishedAt: 'desc' },
              take: 10
            }
          }
        },
        replyQueue: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    })

    // Get usage stats for users
    const debugInfo = await Promise.all(users.map(async (user) => {
      const now = new Date()
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const startOfHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours())

      const [dailyReplies, hourlyReplies] = await Promise.all([
        prisma.replyQueue.count({
          where: {
            userId: user.id,
            createdAt: { gte: startOfDay },
            status: { in: ['sent', 'pending'] }
          }
        }),
        prisma.replyQueue.count({
          where: {
            userId: user.id,
            createdAt: { gte: startOfHour },
            status: { in: ['sent', 'pending'] }
          }
        })
      ])

      // Check if user has eligible tweets
      const maxAge = new Date(Date.now() - (user.autopilotSettings?.maxTweetAge || 1440) * 60 * 1000)
      const eligibleTweets = await prisma.tweet.count({
        where: {
          targetUser: {
            userId: user.id,
            isActive: true
          },
          publishedAt: { gte: maxAge },
          isDeleted: false,
          NOT: {
            replies: {
              some: {
                status: { in: ['sent', 'pending'] }
              }
            }
          }
        }
      })

      // Check time constraints
      const currentDay = now.getDay() === 0 ? 7 : now.getDay()
      const currentTime = now.toTimeString().slice(0, 5)
      const [startTime, endTime] = (user.autopilotSettings?.enabledHours || "09:00-17:00").split('-')
      const enabledDays = JSON.parse(user.autopilotSettings?.enabledDays || "[1,2,3,4,5]")

      return {
        userId: user.id,
        email: user.email,
        autopilotSettings: user.autopilotSettings,
        xAccounts: user.xAccounts.map(acc => ({
          id: acc.id,
          username: acc.username,
          isActive: acc.isActive
        })),
        targetUsers: user.targetUsers.map(target => ({
          username: target.targetUsername,
          isActive: target.isActive,
          recentTweets: target.tweets.length,
          lastScraped: target.lastScraped
        })),
        recentReplies: user.replyQueue,
        usage: {
          dailyReplies,
          hourlyReplies,
          maxDaily: user.autopilotSettings?.maxRepliesPerDay,
          maxHourly: user.autopilotSettings?.maxRepliesPerHour
        },
        eligibleTweets,
        timeConstraints: {
          currentDay,
          currentTime,
          enabledDays,
          enabledHours: user.autopilotSettings?.enabledHours,
          isTimeActive: enabledDays.includes(currentDay) && currentTime >= startTime && currentTime <= endTime
        }
      }
    }))

    return NextResponse.json({
      totalUsers: users.length,
      debugInfo
    })

  } catch (error) {
    console.error('Error in autopilot debug:', error)
    return NextResponse.json(
      { error: 'Failed to get debug info' },
      { status: 500 }
    )
  }
}