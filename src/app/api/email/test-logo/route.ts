import { NextRequest, NextResponse } from "next/server";
import { brevoEmailService } from "@/lib/email/brevo";

export async function POST(request: NextRequest) {
  try {
    const { email, name, type = "welcome" } = await request.json();

    if (!email || !name) {
      return NextResponse.json(
        { error: "Email and name are required" },
        { status: 400 },
      );
    }

    let result;

    switch (type) {
      case "welcome":
        result = await brevoEmailService.sendWelcomeEmail(email, name);
        break;
      case "subscription":
        result = await brevoEmailService.sendSubscriptionCreatedEmail(
          email,
          name,
          "Pro Plan",
        );
        break;
      case "cancellation":
        result = await brevoEmailService.sendSubscriptionCancelledEmail(
          email,
          name,
          "Pro Plan",
        );
        break;
      default:
        return NextResponse.json(
          {
            error:
              "Invalid email type. Use: welcome, subscription, or cancellation",
          },
          { status: 400 },
        );
    }

    return NextResponse.json({
      success: true,
      message: `${type} email sent successfully to ${email}`,
      result,
    });
  } catch (error: any) {
    console.error("Failed to send test email:", error);
    return NextResponse.json(
      { error: "Failed to send email", details: error.message },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Email test endpoint",
    usage: {
      method: "POST",
      body: {
        email: "test@example.com",
        name: "Usuario Test",
        type: "welcome | subscription | cancellation",
      },
    },
    example_curl: `curl -X POST http://localhost:3001/api/email/test-logo \\
  -H "Content-Type: application/json" \\
  -d '{"email":"tu@email.com","name":"Tu Nombre","type":"welcome"}'`,
  });
}
