/**
 * Test script for Brevo email service
 * Run this with: npx tsx src/lib/email/test-brevo.ts
 */

import { brevoEmailService } from "./brevo";

async function testBrevoService() {
  console.log("🧪 Testing Brevo Email Service...");

  // Test environment variables
  if (
    !process.env.BREVO_API_KEY ||
    process.env.BREVO_API_KEY === "your-brevo-api-key-here"
  ) {
    console.error("❌ BREVO_API_KEY not configured in .env.local");
    console.log("📝 Please update BREVO_API_KEY in your .env.local file");
    return;
  }

  try {
    // Test connection
    console.log("🔌 Testing Brevo connection...");
    const isConnected = await brevoEmailService.testConnection();

    if (isConnected) {
      console.log("✅ Brevo connection test passed");
    } else {
      console.log("❌ Brevo connection test failed");
      return;
    }

    // Test welcome email (uncomment to send actual test email)
    /*
    console.log('📧 Testing welcome email...');
    await brevoEmailService.sendWelcomeEmail(
      'test@example.com', // Replace with your email for testing
      'Test User'
    );
    console.log('✅ Welcome email sent successfully');
    */

    console.log("🎉 All tests passed! Brevo is ready to use.");
    console.log(
      "📝 To send test emails, update the test email address in this file and uncomment the test.",
    );
  } catch (error: any) {
    console.error("❌ Brevo test failed:", error.message);

    if (error.message.includes("API key")) {
      console.log("💡 Check your Brevo API key in .env.local");
    } else if (error.message.includes("sender")) {
      console.log("💡 Make sure your sender email domain is verified in Brevo");
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  testBrevoService()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Test script error:", error);
      process.exit(1);
    });
}

export { testBrevoService };
