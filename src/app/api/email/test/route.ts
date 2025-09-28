import { NextRequest, NextResponse } from "next/server";
import { brevoEmailService } from "@/lib/email/brevo";

export async function POST(request: NextRequest) {
  try {
    const { to, subject, htmlContent, textContent } = await request.json();

    if (!to || !subject || !htmlContent) {
      return NextResponse.json(
        { error: "Missing required fields: to, subject, htmlContent" },
        { status: 400 },
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 },
      );
    }

    // Replace template variables with test data
    const testData = {
      userName: "Test User",
      planType: "Premium Plan",
      appUrl: process.env.NEXT_PUBLIC_APP_URL || "https://uvala.com",
    };

    let processedHtml = htmlContent;
    let processedText = textContent || "";
    let processedSubject = subject;

    // Replace variables in content
    Object.entries(testData).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      processedHtml = processedHtml.replace(
        new RegExp(placeholder, "g"),
        value,
      );
      processedText = processedText.replace(
        new RegExp(placeholder, "g"),
        value,
      );
      processedSubject = processedSubject.replace(
        new RegExp(placeholder, "g"),
        value,
      );
    });

    // Send test email using Brevo service
    const result = await brevoEmailService["sendEmail"]({
      to: [{ email: to, name: "Test User" }],
      subject: `[TEST] ${processedSubject}`,
      htmlContent: processedHtml,
      textContent: processedText,
      params: testData,
    });

    return NextResponse.json({
      success: true,
      message: "Test email sent successfully",
      messageId: result.messageId,
    });
  } catch (error: any) {
    console.error("Failed to send test email:", error);

    return NextResponse.json(
      {
        error: "Failed to send test email",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
