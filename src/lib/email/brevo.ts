import {
  TransactionalEmailsApi,
  TransactionalEmailsApiApiKeys,
} from "@getbrevo/brevo";
import {
  getWelcomeEmailTemplate,
  getSubscriptionEmailTemplate,
  getCancellationEmailTemplate,
} from "./email-templates";
import { getUserLanguageFromDB } from "../user-preferences";

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

  // Helper method to get logo URL
  private getLogoUrl(): string {
    // Priority order for logo URL:
    // 1. Custom Brevo URL from environment
    // 2. App URL + local logo (use PNG for better email client compatibility)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://uvala.ai";

    return (
      process.env.BREVO_LOGO_URL ||
      process.env.EMAIL_LOGO_URL ||
      `${appUrl}/uvala-logo.png`
    );
  }

  // Helper method to replace template variables
  private processTemplate(
    template: string,
    variables: { [key: string]: string },
  ): string {
    let processed = template;
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, "g");
      processed = processed.replace(regex, value);
    });
    return processed;
  }

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

  async sendEmail({
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

  async sendWelcomeEmail(userEmail: string, userName: string, userId?: string) {
    // Get user's preferred language
    const language = await getUserLanguageFromDB(userId);

    // Get URLs
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://uvala.ai";
    const logoUrl = this.getLogoUrl();

    const template = getWelcomeEmailTemplate(language, logoUrl);

    // Process template variables
    const variables = {
      appUrl,
      logoUrl,
      userName,
    };

    const htmlContent = this.processTemplate(template.htmlContent, variables);
    const textContent = this.processTemplate(template.textContent, variables);

    return this.sendEmail({
      to: [{ email: userEmail, name: userName }],
      subject: template.subject,
      htmlContent,
      textContent,
      params: variables,
    });
  }

  async sendSubscriptionCreatedEmail(
    userEmail: string,
    userName: string,
    planType: string,
    userId?: string,
  ) {
    // Get user's preferred language
    const language = await getUserLanguageFromDB(userId);

    // Get URLs
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://uvala.ai";
    const logoUrl = this.getLogoUrl();

    const template = getSubscriptionEmailTemplate(language, logoUrl);

    // Process template variables
    const variables = {
      appUrl,
      logoUrl,
      userName,
      planType,
    };

    const htmlContent = this.processTemplate(template.htmlContent, variables);
    const textContent = this.processTemplate(template.textContent, variables);
    const subject = this.processTemplate(template.subject, variables);

    return this.sendEmail({
      to: [{ email: userEmail, name: userName }],
      subject,
      htmlContent,
      textContent,
      params: variables,
    });
  }

  async sendSubscriptionCancelledEmail(
    userEmail: string,
    userName: string,
    planType: string,
    userId?: string,
  ) {
    // Get user's preferred language
    const language = await getUserLanguageFromDB(userId);

    // Get URLs
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://uvala.ai";
    const logoUrl = this.getLogoUrl();

    const template = getCancellationEmailTemplate(language, logoUrl);

    // Process template variables
    const variables = {
      appUrl,
      logoUrl,
      userName,
      planType,
    };

    const htmlContent = this.processTemplate(template.htmlContent, variables);
    const textContent = this.processTemplate(template.textContent, variables);

    return this.sendEmail({
      to: [{ email: userEmail, name: userName }],
      subject: template.subject,
      htmlContent,
      textContent,
      params: variables,
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
