# 🤖 AutoYapp Pro Autopilot Setup Guide

## Overview

The AutoYapp Pro autopilot system provides fully automated AI-powered engagement with X (Twitter) ToS compliance. This guide walks you through setting up and configuring the autopilot functionality.

## 🔧 System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Autopilot      │    │  Tweet Monitor  │    │  Reply Queue    │
│  Engine         │───►│  & Analysis     │───►│  Processor      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Safety         │    │  AI Reply       │    │  X API          │
│  Monitor        │    │  Generator      │    │  Integration    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Setup Steps

### 1. Database Setup

Ensure your database is synced with the latest schema:

```bash
npx prisma db push
npx prisma generate
```

### 2. Environment Variables

Add these required environment variables to your `.env.local`:

```bash
# Autopilot Configuration
CRON_SECRET="your_secure_cron_secret_here"
ENABLE_AUTOPILOT="true"

# OpenAI (for AI reply generation)
OPENAI_API_KEY="your_openai_api_key"

# Email Notifications (optional)
RESEND_API_KEY="your_resend_api_key"

# X API (required for posting replies)
X_API_KEY="your_x_api_key"
X_API_SECRET="your_x_api_secret"
X_BEARER_TOKEN="your_x_bearer_token"
```

### 3. Cron Job Configuration

Set up the following cron jobs for full automation:

#### Vercel Cron (Recommended)

Create `vercel.json` in your project root:

```json
{
  "crons": [
    {
      "path": "/api/cron/autopilot",
      "schedule": "*/15 * * * *"
    },
    {
      "path": "/api/cron/process-queue", 
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/cron/autopilot-monitor",
      "schedule": "*/30 * * * *"
    },
    {
      "path": "/api/cron/scrape-tweets",
      "schedule": "*/10 * * * *"
    }
  ]
}
```

#### External Cron Service

If using an external cron service, schedule these endpoints:

```bash
# Every 15 minutes - Autopilot processing
curl -X POST "https://your-app.vercel.app/api/cron/autopilot" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Every 5 minutes - Process reply queue
curl -X POST "https://your-app.vercel.app/api/cron/process-queue" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Every 30 minutes - Safety monitoring
curl -X POST "https://your-app.vercel.app/api/cron/autopilot-monitor" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Every 10 minutes - Tweet scraping
curl -X POST "https://your-app.vercel.app/api/cron/scrape-tweets" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## ⚙️ Configuration

### 1. Autopilot Settings

Navigate to **Settings → Autopilot** to configure:

#### Rate Limits & Compliance
- **Max Replies Per Day**: 30 (recommended, max 50)
- **Max Replies Per Hour**: 5 (recommended, max 10)
- **Min Delay Between Replies**: 6 minutes (minimum 5 minutes)
- **Min Delay to Same User**: 30 minutes (minimum 10 minutes)

#### Active Hours & Days
- **Active Hours**: "09:00-17:00" (business hours)
- **Active Days**: [1,2,3,4,5] (Monday-Friday)

#### Tweet Filtering
- **Target Sentiment**: All, Positive, Neutral, or Negative
- **Max Tweet Age**: 24 hours (1440 minutes)
- **Skip Retweets**: ✅ (recommended)
- **Skip Replies**: ✅ (recommended)

#### Safety Settings
- **Auto-pause if blocked**: ✅ (recommended)
- **Auto-pause if rate limited**: ✅ (recommended)
- **Email notifications**: ✅ (recommended)

### 2. Reply Style Configuration

Navigate to **Settings → Reply Styles** to configure:

- **Tone**: Professional, Casual, Enthusiastic, or Thoughtful
- **Personality**: Supportive, Analytical, Creative, or Direct
- **Length**: Short (50-80), Medium (80-150), or Long (150-280 chars)
- **Engagement Level**: Low, Medium, or High
- **Topics of Interest**: Add relevant topics
- **Topics to Avoid**: Add topics to skip

### 3. Target Users

Add target users to monitor:

1. Navigate to **Target Users**
2. Add users individually or via CSV import
3. Ensure targets are **active** and **verified**

## 🔄 Workflow

### 1. Tweet Discovery
- System monitors target users every 10 minutes
- New tweets are analyzed for sentiment and relevance
- Eligible tweets are queued for processing

### 2. AI Reply Generation
- OpenAI GPT-4o generates contextual replies
- Reply style preferences are applied
- Content is validated for compliance

### 3. Reply Scheduling
- Replies are scheduled with random delays
- Rate limits and timing constraints are enforced
- Queue processes replies every 5 minutes

### 4. Safety Monitoring
- System monitors for blocks, rate limits, and compliance
- Auto-pause on safety violations
- Email alerts for critical issues

## 📊 Monitoring

### 1. Autopilot Dashboard

Monitor autopilot activity at `/autopilot`:

- **Status**: Active/Paused with next run time
- **Today's Stats**: Replies sent, targets monitored, tweets processed
- **Queue Status**: Pending, scheduled, and failed replies
- **Recent Activity**: Live activity feed

### 2. Compliance Monitoring

The system automatically tracks:

- **Rate Limit Compliance**: Daily and hourly usage
- **Timing Compliance**: Delay enforcement
- **Content Quality**: Reply relevance and safety
- **Account Health**: Block detection and error rates

## 🚨 Safety Features

### 1. X ToS Compliance

- Conservative rate limits (max 50 replies/day)
- Minimum delays between replies (6+ minutes)
- No identical content across accounts
- Respect for user blocking and rate limits

### 2. Auto-Pause Triggers

Autopilot automatically pauses on:

- Daily or hourly rate limit exceeded
- Block or suspension detected
- High failure rate (>50% in 24 hours)
- Low compliance score (<50%)

### 3. Emergency Controls

- **Emergency Pause**: Immediate autopilot shutdown
- **Manual Override**: Individual reply approval
- **Queue Management**: Cancel or reschedule replies

## 🧪 Testing

### 1. Test Autopilot Components

```bash
# Test autopilot settings API
curl "http://localhost:3002/api/autopilot/settings"

# Test autopilot engine (development only)
curl -H "Authorization: Bearer your_cron_secret" \
  "http://localhost:3002/api/cron/autopilot"

# Test queue processor
curl -H "Authorization: Bearer your_cron_secret" \
  "http://localhost:3002/api/cron/process-queue"

# Test safety monitor
curl -H "Authorization: Bearer your_cron_secret" \
  "http://localhost:3002/api/cron/autopilot-monitor"
```

### 2. Run Test Script

```bash
npx tsx src/scripts/test-autopilot.ts
```

## 📈 Best Practices

### 1. Initial Setup

1. Start with **conservative settings** (20 replies/day, 6-hour windows)
2. Monitor for 1 week before increasing limits
3. Use **professional tone** and **supportive personality**
4. Focus on **high-quality targets** with good engagement

### 2. Content Strategy

1. Configure **reply styles** to match your brand voice
2. Use **topic filters** to focus on relevant conversations
3. Set **custom instructions** for specific use cases
4. Monitor **reply quality** and adjust AI prompts

### 3. Compliance Maintenance

1. Review **compliance scores** weekly
2. Monitor **safety alerts** and adjust settings
3. Keep **rate limits conservative** (below X ToS limits)
4. Regularly check **account health** indicators

### 4. Performance Optimization

1. **A/B test** different reply styles
2. Track **engagement rates** on autopilot replies
3. Optimize **target selection** based on response rates
4. Adjust **timing** based on audience activity

## 🔧 Troubleshooting

### Common Issues

1. **Autopilot Not Running**
   - Check cron job configuration
   - Verify `CRON_SECRET` environment variable
   - Ensure autopilot is enabled in settings

2. **No Replies Being Sent**
   - Check X API credentials
   - Verify target users have recent tweets
   - Review queue for failed replies

3. **High Failure Rate**
   - Check X API rate limits
   - Verify account is not blocked/suspended
   - Review reply content for compliance

4. **Safety Alerts**
   - Review compliance score factors
   - Adjust rate limits if necessary
   - Check account health status

### Debug Commands

```bash
# Check queue status
curl "http://localhost:3002/api/cron/process-queue"

# Check autopilot status  
curl "http://localhost:3002/api/cron/autopilot"

# Check safety monitoring
curl "http://localhost:3002/api/cron/autopilot-monitor"
```

## 📞 Support

For additional support:

1. Check the **Autopilot Dashboard** for real-time status
2. Review **Compliance Logs** for detailed error information
3. Monitor **Email Notifications** for critical alerts
4. Consult the **Analytics Dashboard** for performance insights

---

**⚠️ Important**: Always comply with X Terms of Service and use autopilot responsibly. Start with conservative settings and gradually optimize based on performance and compliance metrics.