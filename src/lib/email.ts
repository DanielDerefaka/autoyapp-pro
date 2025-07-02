import { Resend } from 'resend'
import { render } from '@react-email/render'

const resend = new Resend(process.env.RESEND_API_KEY)

export interface EmailData {
  to: string
  subject: string
  html: string
  from?: string
}

export interface NotificationPreferences {
  dailyDigest: boolean
  complianceAlerts: boolean
  successNotifications: boolean
  errorAlerts: boolean
  weeklyReports: boolean
}

export class EmailService {
  private static defaultFrom = 'AutoYapp Pro <noreply@leadoai.com>'

  static async sendEmail(data: EmailData): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      if (!process.env.RESEND_API_KEY) {
        console.warn('Resend API key not configured')
        return { success: false, error: 'Email service not configured' }
      }

      const result = await resend.emails.send({
        from: data.from || this.defaultFrom,
        to: data.to,
        subject: data.subject,
        html: data.html,
      })

      if (result.error) {
        console.error('Resend error:', result.error)
        return { success: false, error: result.error.message }
      }

      return { success: true, id: result.data?.id }
    } catch (error) {
      console.error('Email service error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  // Welcome email when user signs up
  static async sendWelcomeEmail(userEmail: string, userName?: string): Promise<boolean> {
    const html = this.generateWelcomeEmail(userName)
    
    const result = await this.sendEmail({
      to: userEmail,
      subject: 'Welcome to AutoYapp Pro! 🚀',
      html,
    })

    return result.success
  }

  // Daily activity digest
  static async sendDailyDigest(
    userEmail: string, 
    stats: any
  ): Promise<boolean> {
    const html = this.generateDailyDigest(stats)
    
    const result = await this.sendEmail({
      to: userEmail,
      subject: `Daily Report: ${stats.repliesSent} replies sent`,
      html,
    })

    return result.success
  }

  // Compliance alert
  static async sendComplianceAlert(
    userEmail: string,
    alert: any
  ): Promise<boolean> {
    const html = this.generateComplianceAlert(alert)
    
    const result = await this.sendEmail({
      to: userEmail,
      subject: `🚨 ${alert.severity.toUpperCase()} Alert: ${alert.type.replace('_', ' ')}`,
      html,
    })

    return result.success
  }

  // Weekly performance report
  static async sendWeeklyReport(
    userEmail: string,
    report: any
  ): Promise<boolean> {
    const html = this.generateWeeklyReport(report)
    
    const result = await this.sendEmail({
      to: userEmail,
      subject: `📊 Weekly Report: ${report.totalReplies} replies sent`,
      html,
    })

    return result.success
  }

  // Success notification for high-performing replies
  static async sendSuccessNotification(
    userEmail: string,
    success: any
  ): Promise<boolean> {
    const html = this.generateSuccessNotification(success)
    
    const result = await this.sendEmail({
      to: userEmail,
      subject: `🎉 Your reply to @${success.targetUser} is performing well!`,
      html,
    })

    return result.success
  }

  // Email Templates
  private static generateWelcomeEmail(userName?: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to AutoYapp Pro</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
            <h1 style="margin: 0; font-size: 28px;">🚀 Welcome to AutoYapp Pro!</h1>
            <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">AI-powered X engagement automation</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
            <h2 style="color: #2c3e50; margin-top: 0;">Hi ${userName || 'there'}! 👋</h2>
            <p>Thanks for joining AutoYapp Pro! You're now ready to supercharge your X (Twitter) engagement with AI-powered automation.</p>
            
            <h3 style="color: #2c3e50;">🎯 Next Steps:</h3>
            <ul style="line-height: 1.8;">
              <li><strong>Connect your X account</strong> - Link your Twitter for automation</li>
              <li><strong>Add target users</strong> - Choose accounts to engage with</li>
              <li><strong>Configure AI settings</strong> - Set your reply tone and preferences</li>
              <li><strong>Watch the magic happen</strong> - Monitor your engagement growth</li>
            </ul>
          </div>

          <div style="background: #e8f5e8; border-left: 4px solid #27ae60; padding: 20px; margin-bottom: 25px;">
            <h3 style="color: #27ae60; margin-top: 0;">💡 Pro Tip</h3>
            <p style="margin-bottom: 0;">Start with 3-5 target users in your niche for best results. Quality over quantity!</p>
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.APP_URL}/dashboard" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Get Started Now</a>
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 14px;">
            <p>Need help? Reply to this email or visit our <a href="${process.env.APP_URL}/help" style="color: #667eea;">help center</a>.</p>
            <p>© 2024 AutoYapp Pro. All rights reserved.</p>
          </div>
        </body>
      </html>
    `
  }

  private static generateDailyDigest(stats: any): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Daily Activity Report</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
            <h1 style="margin: 0; font-size: 24px;">📊 Daily Activity Report</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          
          <div style="display: flex; gap: 15px; margin-bottom: 30px;">
            <div style="flex: 1; background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center;">
              <h3 style="margin: 0; color: #4facfe; font-size: 32px;">${stats.repliesSent}</h3>
              <p style="margin: 5px 0 0 0; color: #666;">Replies Sent</p>
            </div>
            <div style="flex: 1; background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center;">
              <h3 style="margin: 0; color: #27ae60; font-size: 32px;">${stats.engagementReceived}</h3>
              <p style="margin: 5px 0 0 0; color: #666;">Engagement Received</p>
            </div>
          </div>

          <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 20px; margin-bottom: 25px;">
            <h3 style="color: #856404; margin-top: 0;">🎯 Top Target Today</h3>
            <p style="margin-bottom: 0;"><strong>@${stats.topTarget}</strong> - Great engagement!</p>
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.APP_URL}/analytics" style="background: #4facfe; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Full Analytics</a>
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 14px;">
            <p>© 2024 AutoYapp Pro. <a href="${process.env.APP_URL}/settings" style="color: #4facfe;">Manage email preferences</a></p>
          </div>
        </body>
      </html>
    `
  }

  private static generateComplianceAlert(alert: any): string {
    const colorMap = {
      low: '#17a2b8',
      medium: '#ffc107', 
      high: '#dc3545'
    }
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Compliance Alert</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: ${colorMap[alert.severity]}; color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
            <h1 style="margin: 0; font-size: 24px;">🚨 ${alert.severity.toUpperCase()} Alert</h1>
            <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">${alert.type.replace('_', ' ').toUpperCase()}</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
            <h2 style="color: #2c3e50; margin-top: 0;">Alert Details</h2>
            <p style="font-size: 16px;">${alert.message}</p>
            
            ${alert.actionRequired ? `
              <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin-top: 20px;">
                <h3 style="color: #856404; margin-top: 0;">⚡ Action Required</h3>
                <p style="margin-bottom: 0;">${alert.actionRequired}</p>
              </div>
            ` : ''}
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.APP_URL}/settings" style="background: ${colorMap[alert.severity]}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Review Settings</a>
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 14px;">
            <p>This is an automated alert from AutoYapp Pro compliance monitoring.</p>
            <p>© 2024 AutoYapp Pro. All rights reserved.</p>
          </div>
        </body>
      </html>
    `
  }

  private static generateWeeklyReport(report: any): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Weekly Performance Report</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
            <h1 style="margin: 0; font-size: 24px;">📈 Weekly Performance Report</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Week ending ${new Date().toLocaleDateString()}</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
            <h2 style="color: #2c3e50; margin-top: 0;">📊 Key Metrics</h2>
            
            <div style="display: flex; gap: 15px; margin-bottom: 20px;">
              <div style="flex: 1; text-align: center;">
                <h3 style="margin: 0; color: #667eea; font-size: 28px;">${report.totalReplies}</h3>
                <p style="margin: 5px 0 0 0; color: #666;">Total Replies</p>
              </div>
              <div style="flex: 1; text-align: center;">
                <h3 style="margin: 0; color: ${report.weekOverWeekChange >= 0 ? '#27ae60' : '#e74c3c'}; font-size: 28px;">${report.weekOverWeekChange >= 0 ? '+' : ''}${report.weekOverWeekChange}%</h3>
                <p style="margin: 5px 0 0 0; color: #666;">vs Last Week</p>
              </div>
            </div>
          </div>

          <div style="background: #e8f5e8; border-left: 4px solid #27ae60; padding: 20px; margin-bottom: 25px;">
            <h3 style="color: #27ae60; margin-top: 0;">🏆 Top Performing Replies</h3>
            ${report.topPerformingReplies.map((reply: any, index: number) => `
              <div style="margin-bottom: ${index < report.topPerformingReplies.length - 1 ? '15px' : '0'};">
                <p style="margin: 0; font-weight: bold;">"${reply.content.substring(0, 60)}${reply.content.length > 60 ? '...' : ''}"</p>
                <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">@${reply.target} • ${reply.likes} likes</p>
              </div>
            `).join('')}
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.APP_URL}/analytics" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Detailed Analytics</a>
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 14px;">
            <p>© 2024 AutoYapp Pro. <a href="${process.env.APP_URL}/settings" style="color: #667eea;">Manage email preferences</a></p>
          </div>
        </body>
      </html>
    `
  }

  private static generateSuccessNotification(success: any): string {
    const totalEngagement = success.engagement.likes + success.engagement.retweets + success.engagement.replies
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reply Success Notification</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
            <h1 style="margin: 0; font-size: 24px;">🎉 Great Engagement!</h1>
            <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">Your reply is performing well</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
            <h2 style="color: #2c3e50; margin-top: 0;">Reply to @${success.targetUser}</h2>
            <div style="background: white; padding: 20px; border-left: 4px solid #f5576c; border-radius: 6px; margin-bottom: 20px;">
              <p style="margin: 0; font-style: italic;">"${success.replyContent}"</p>
            </div>
            
            <h3 style="color: #2c3e50;">📈 Engagement Stats</h3>
            <div style="display: flex; gap: 15px;">
              <div style="flex: 1; text-align: center; background: white; padding: 15px; border-radius: 6px;">
                <h4 style="margin: 0; color: #e74c3c;">${success.engagement.likes}</h4>
                <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">❤️ Likes</p>
              </div>
              <div style="flex: 1; text-align: center; background: white; padding: 15px; border-radius: 6px;">
                <h4 style="margin: 0; color: #27ae60;">${success.engagement.retweets}</h4>
                <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">🔄 Retweets</p>
              </div>
              <div style="flex: 1; text-align: center; background: white; padding: 15px; border-radius: 6px;">
                <h4 style="margin: 0; color: #3498db;">${success.engagement.replies}</h4>
                <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">💬 Replies</p>
              </div>
            </div>
          </div>

          <div style="background: #d4edda; border-left: 4px solid #27ae60; padding: 20px; margin-bottom: 25px;">
            <p style="margin: 0;"><strong>🚀 Keep it up!</strong> This type of content resonates well with your audience.</p>
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.APP_URL}/analytics" style="background: #f5576c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Analytics</a>
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 14px;">
            <p>© 2024 AutoYapp Pro. <a href="${process.env.APP_URL}/settings" style="color: #f5576c;">Manage notifications</a></p>
          </div>
        </body>
      </html>
    `
  }
}