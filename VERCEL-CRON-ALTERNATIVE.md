# Vercel Free Plan Cron Alternative

## Problem
Vercel free plan doesn't support cron jobs, which are needed for:
- Processing scheduled posts/tweets
- Scraping target users' tweets
- Processing reply queues
- Cleanup tasks

## Alternative Solutions

### 1. External Cron Service (Recommended)
Use a free external service to trigger your API endpoints:

**Options:**
- **UptimeRobot** (Free): Can ping URLs every 5 minutes
- **Cron-job.org** (Free): Schedule HTTP requests
- **EasyCron** (Free): 20 cron jobs for free
- **Google Cloud Scheduler** (Free tier available)

**Implementation:**
```bash
# Example: UptimeRobot hitting your API endpoint
# Monitor URL: https://your-app.vercel.app/api/cron/process-scheduled?key=your_secret_key
# Interval: Every 5 minutes
```

### 2. Client-Side Polling (Secondary)
Use the Next.js app itself to poll and process tasks:

```typescript
// In your main app component
useEffect(() => {
  const interval = setInterval(async () => {
    try {
      await fetch('/api/cron/process-scheduled', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET}`
        }
      });
    } catch (error) {
      console.error('Cron job failed:', error);
    }
  }, 5 * 60 * 1000); // Every 5 minutes

  return () => clearInterval(interval);
}, []);
```

### 3. GitHub Actions (For CI/CD integration)
Use GitHub Actions to trigger your endpoints:

```yaml
# .github/workflows/cron.yml
name: Scheduled Tasks
on:
  schedule:
    - cron: '*/5 * * * *' # Every 5 minutes
  workflow_dispatch:

jobs:
  run-scheduled-tasks:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Scheduled Processing
        run: |
          curl -X POST "${{ secrets.APP_URL }}/api/cron/process-scheduled" \
               -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
               -H "Content-Type: application/json"
```

### 4. Serverless Functions with Queues
Use BullMQ with Redis for job scheduling and trigger processing via:
- Manual triggers from the UI
- Webhook-based triggers
- API-based scheduling

## Recommended Implementation

For this project, I recommend **Option 1 (External Cron Service)** combined with **Option 4 (Queue-based)**:

1. **Setup UptimeRobot** to ping `/api/cron/heartbeat` every 5 minutes
2. **Use BullMQ** to schedule and process jobs
3. **Add manual triggers** in the UI for immediate processing
4. **Implement fallback polling** in the client for critical tasks

### API Endpoints to Create:
```typescript
// /api/cron/heartbeat - Main cron trigger
// /api/cron/process-scheduled - Process scheduled content
// /api/cron/scrape-tweets - Scrape target users
// /api/cron/process-queue - Process reply queue
// /api/cron/cleanup - Cleanup old data
```

### Security:
- Use secret key authentication for cron endpoints
- Rate limiting on cron endpoints
- Logging and monitoring of cron job execution

This approach ensures reliability even on Vercel's free plan while maintaining the automation features.