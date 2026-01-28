import { NextResponse } from "next/server";
import { Resend } from "resend";

// Test endpoint to verify Resend API is working
// DELETE THIS FILE IN PRODUCTION

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");

  if (!email) {
    return NextResponse.json(
      { error: "Email parameter required: /api/test-email?email=you@example.com" },
      { status: 400 }
    );
  }

  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error: "RESEND_API_KEY not configured",
        configured: false,
        env_check: {
          RESEND_API_KEY: !!process.env.RESEND_API_KEY,
        },
      },
      { status: 500 }
    );
  }

  try {
    const resend = new Resend(apiKey);

    const { data, error } = await resend.emails.send({
      from: "be.vocl <noreply@be.vocl.app>",
      to: email,
      subject: "Test Email from be.vocl",
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h1 style="color: #5B9A8B;">Test Email</h1>
          <p>If you're seeing this, the Resend API is working correctly!</p>
          <p>Timestamp: ${new Date().toISOString()}</p>
        </div>
      `,
    });

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          details: error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: data?.id,
      message: `Test email sent to ${email}`,
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
