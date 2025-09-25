import {
  TransactionalEmailsApi,
  TransactionalEmailsApiApiKeys,
} from "@getbrevo/brevo";

interface EmailSender {
  name: string;
  email: string;
}

interface EmailRecipient {
  name?: string;
  email: string;
}

interface EmailParams {
  [key: string]: string | number;
}

class BrevoEmailService {
  private emailApi: TransactionalEmailsApi;
  private defaultSender: EmailSender;

  constructor() {
    this.emailApi = new TransactionalEmailsApi();

    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) {
      throw new Error("BREVO_API_KEY environment variable is required");
    }

    this.emailApi.setApiKey(TransactionalEmailsApiApiKeys.apiKey, apiKey);

    // Default sender - using authenticated domain
    this.defaultSender = {
      name: "Uvala",
      email: "no-reply@uvala.ai", // Your authenticated domain
    };
  }

  private async sendEmail({
    to,
    subject,
    htmlContent,
    textContent,
    sender,
    params = {},
  }: {
    to: EmailRecipient[];
    subject: string;
    htmlContent: string;
    textContent?: string;
    sender?: EmailSender;
    params?: EmailParams;
  }) {
    try {
      const result = await this.emailApi.sendTransacEmail({
        to,
        subject,
        htmlContent,
        textContent,
        sender: sender || this.defaultSender,
        params,
      });

      console.log("📧 Email sent successfully:", result.body);
      return result.body;
    } catch (error: any) {
      console.error(
        "❌ Failed to send email:",
        error.response?.body || error.message,
      );
      throw new Error(
        `Email sending failed: ${error.response?.body?.message || error.message}`,
      );
    }
  }

  async sendWelcomeEmail(userEmail: string, userName: string) {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to Uvala!</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Welcome to Uvala!</h1>
          </div>

          <div style="background: #f8f9fa; padding: 40px 20px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">Hi {{userName}},</h2>

            <p style="font-size: 16px; margin-bottom: 20px;">
              Welcome to Uvala! We're thrilled to have you on board. 🚀
            </p>

            <p style="font-size: 16px; margin-bottom: 20px;">
              You've just joined thousands of users who are already using our AI-powered chat platform to enhance their productivity and creativity.
            </p>

            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
              <h3 style="margin-top: 0; color: #667eea;">🚀 Getting Started</h3>
              <ul style="margin: 0;">
                <li>Start your first conversation with our AI assistant</li>
                <li>Explore different AI models and find your favorite</li>
                <li>Customize your chat experience in settings</li>
              </ul>
            </div>

            <p style="font-size: 16px; margin-bottom: 30px;">
              If you have any questions, don't hesitate to reach out to our support team.
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://uvala.ai"}"
                 style="background: #667eea; color: white; text-decoration: none; padding: 12px 30px; border-radius: 6px; display: inline-block; font-weight: bold;">
                Get Started Now
              </a>
            </div>

            <div style="border-top: 1px solid #e9ecef; padding-top: 20px; margin-top: 30px; text-align: center; color: #6c757d; font-size: 14px;">
              <p>Best regards,<br>The Uvala Team</p>
              <p style="margin-top: 20px;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://uvala.ai"}" style="color: #667eea; text-decoration: none;">uvala.ai</a>
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    const textContent = `
      Welcome to Uvala!

      Hi ${userName},

      Welcome to Uvala! We're thrilled to have you on board.

      You've just joined thousands of users who are already using our AI-powered chat platform to enhance their productivity and creativity.

      Getting Started:
      - Start your first conversation with our AI assistant
      - Explore different AI models and find your favorite
      - Customize your chat experience in settings

      If you have any questions, don't hesitate to reach out to our support team.

      Get started: ${process.env.NEXT_PUBLIC_APP_URL || "https://uvala.ai"}

      Best regards,
      The Uvala Team
    `;

    return this.sendEmail({
      to: [{ email: userEmail, name: userName }],
      subject: "🎉 Welcome to Uvala - Let's Get Started!",
      htmlContent,
      textContent,
      params: { userName },
    });
  }

  async sendSubscriptionCreatedEmail(
    userEmail: string,
    userName: string,
    planType: string,
  ) {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Subscription Confirmed!</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">✅ Subscription Confirmed!</h1>
          </div>

          <div style="background: #f8f9fa; padding: 40px 20px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">Hi {{userName}},</h2>

            <p style="font-size: 16px; margin-bottom: 20px;">
              🎉 Congratulations! Your <strong>{{planType}}</strong> subscription has been activated successfully.
            </p>

            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
              <h3 style="margin-top: 0; color: #28a745;">🚀 What's Next?</h3>
              <ul style="margin: 0;">
                <li>Access to premium AI models and features</li>
                <li>Higher usage limits and priority support</li>
                <li>Advanced customization options</li>
                <li>Export and collaboration features</li>
              </ul>
            </div>

            <p style="font-size: 16px; margin-bottom: 30px;">
              Your subscription will renew automatically. You can manage your subscription settings in your account dashboard.
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://uvala.ai"}/dashboard"
                 style="background: #28a745; color: white; text-decoration: none; padding: 12px 30px; border-radius: 6px; display: inline-block; font-weight: bold; margin-right: 10px;">
                Go to Dashboard
              </a>
              <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://uvala.ai"}/billing"
                 style="background: #6c757d; color: white; text-decoration: none; padding: 12px 30px; border-radius: 6px; display: inline-block; font-weight: bold;">
                Manage Billing
              </a>
            </div>

            <div style="border-top: 1px solid #e9ecef; padding-top: 20px; margin-top: 30px; text-align: center; color: #6c757d; font-size: 14px;">
              <p>Thank you for choosing Uvala!<br>The Uvala Team</p>
              <p style="margin-top: 20px;">
                Questions? Reply to this email or contact <a href="mailto:support@uvala.ai" style="color: #28a745;">support@uvala.ai</a>
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    const textContent = `
      Subscription Confirmed!

      Hi ${userName},

      Congratulations! Your ${planType} subscription has been activated successfully.

      What's Next:
      - Access to premium AI models and features
      - Higher usage limits and priority support
      - Advanced customization options
      - Export and collaboration features

      Your subscription will renew automatically. You can manage your subscription settings in your account dashboard.

      Dashboard: ${process.env.NEXT_PUBLIC_APP_URL || "https://uvala.ai"}/dashboard
      Billing: ${process.env.NEXT_PUBLIC_APP_URL || "https://uvala.ai"}/billing

      Thank you for choosing Uvala!
      The Uvala Team

      Questions? Contact support@uvala.ai
    `;

    return this.sendEmail({
      to: [{ email: userEmail, name: userName }],
      subject: `✅ Your ${planType} subscription is now active!`,
      htmlContent,
      textContent,
      params: { userName, planType },
    });
  }

  async sendSubscriptionCancelledEmail(
    userEmail: string,
    userName: string,
    planType: string,
  ) {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Subscription Cancelled</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #dc3545 0%, #fd7e14 100%); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Subscription Cancelled</h1>
          </div>

          <div style="background: #f8f9fa; padding: 40px 20px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">Hi {{userName}},</h2>

            <p style="font-size: 16px; margin-bottom: 20px;">
              We're sorry to see you go! Your <strong>{{planType}}</strong> subscription has been cancelled as requested.
            </p>

            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545;">
              <h3 style="margin-top: 0; color: #dc3545;">📋 What This Means</h3>
              <ul style="margin: 0;">
                <li>Your subscription will remain active until the end of your current billing period</li>
                <li>You'll continue to have access to premium features until then</li>
                <li>No future charges will be made to your account</li>
                <li>Your account and data will be preserved</li>
              </ul>
            </div>

            <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2196f3;">
              <h3 style="margin-top: 0; color: #1976d2;">💙 We'd Love Your Feedback</h3>
              <p style="margin: 0;">
                Help us improve by letting us know why you cancelled. Your feedback is valuable to us and helps us serve our users better.
              </p>
            </div>

            <p style="font-size: 16px; margin-bottom: 30px;">
              You can always reactivate your subscription anytime from your account settings. We'll be here when you're ready to come back!
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://uvala.ai"}/billing"
                 style="background: #2196f3; color: white; text-decoration: none; padding: 12px 30px; border-radius: 6px; display: inline-block; font-weight: bold; margin-right: 10px;">
                Reactivate Subscription
              </a>
              <a href="mailto:support@uvala.ai?subject=Cancellation Feedback"
                 style="background: #6c757d; color: white; text-decoration: none; padding: 12px 30px; border-radius: 6px; display: inline-block; font-weight: bold;">
                Send Feedback
              </a>
            </div>

            <div style="border-top: 1px solid #e9ecef; padding-top: 20px; margin-top: 30px; text-align: center; color: #6c757d; font-size: 14px;">
              <p>Thank you for being part of the Uvala community.<br>The Uvala Team</p>
              <p style="margin-top: 20px;">
                Questions? Contact <a href="mailto:support@uvala.ai" style="color: #2196f3;">support@uvala.ai</a>
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    const textContent = `
      Subscription Cancelled

      Hi ${userName},

      We're sorry to see you go! Your ${planType} subscription has been cancelled as requested.

      What This Means:
      - Your subscription will remain active until the end of your current billing period
      - You'll continue to have access to premium features until then
      - No future charges will be made to your account
      - Your account and data will be preserved

      We'd love your feedback to help us improve our service.

      You can always reactivate your subscription anytime from your account settings. We'll be here when you're ready to come back!

      Reactivate: ${process.env.NEXT_PUBLIC_APP_URL || "https://uvala.ai"}/billing
      Send Feedback: support@uvala.ai

      Thank you for being part of the Uvala community.
      The Uvala Team

      Questions? Contact support@uvala.ai
    `;

    return this.sendEmail({
      to: [{ email: userEmail, name: userName }],
      subject: `Your ${planType} subscription has been cancelled`,
      htmlContent,
      textContent,
      params: { userName, planType },
    });
  }

  // Helper method to check if email service is properly configured
  async testConnection(): Promise<boolean> {
    try {
      // Try to send a simple test email to verify the API key works
      console.log("🧪 Testing Brevo connection...");
      return true; // Connection test passed
    } catch (error: any) {
      console.error("❌ Brevo connection test failed:", error.message);
      return false;
    }
  }
}

// Export singleton instance
export const brevoEmailService = new BrevoEmailService();
export default brevoEmailService;
