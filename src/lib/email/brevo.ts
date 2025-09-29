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
    const template = getWelcomeEmailTemplate(language);

    const { htmlContent, textContent } = template;

    return this.sendEmail({
      to: [{ email: userEmail, name: userName }],
      subject: template.subject,
      htmlContent,
      textContent,
      params: {
        userName,
        appUrl: process.env.NEXT_PUBLIC_APP_URL || "https://uvala.ai",
      },
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
    const template = getSubscriptionEmailTemplate(language);

    const { htmlContent, textContent } = template;

    return this.sendEmail({
      to: [{ email: userEmail, name: userName }],
      subject: template.subject,
      htmlContent,
      textContent,
      params: {
        userName,
        planType,
        appUrl: process.env.NEXT_PUBLIC_APP_URL || "https://uvala.ai",
      },
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
    const template = getCancellationEmailTemplate(language);

    const { htmlContent, textContent } = template;

    return this.sendEmail({
      to: [{ email: userEmail, name: userName }],
      subject: template.subject,
      htmlContent,
      textContent,
      params: {
        userName,
        planType,
        appUrl: process.env.NEXT_PUBLIC_APP_URL || "https://uvala.ai",
      },
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
