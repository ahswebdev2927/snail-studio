import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { systemSettings } from "@/db/schema";
import { sendMail } from "@/services/email/email.service";
import { z } from "zod";
import { rateLimitRequest } from "@/lib/security/rate-limit";

const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(1, "Message is required"),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 3 messages per 5 minutes
    const limitResult = await rateLimitRequest(request, "contact", 3, 5 * 60 * 1000);
    if (!limitResult.success) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil(limitResult.reset / 1000).toString(),
          },
        }
      );
    }

    const body = await request.json();
    
    // Validate request body
    const parseResult = contactSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, errors: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, email, subject, message } = parseResult.data;

    // Fetch store email from system settings database table
    const settings = await db.select().from(systemSettings);
    const settingsMap = settings.reduce((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {} as Record<string, string>);

    const storeEmail = settingsMap["store_email"];
    
    // Resolve email recipient: configured store contact email, SMTP sender, or fallback
    const recipient = storeEmail || process.env.SMTP_USER || "hello@snailstudio.in";

    // Send the email using Nodemailer config
    const mailResult = await sendMail({
      to: recipient,
      subject: `[Contact Form] ${subject} — from ${name}`,
      html: `
        <div style="font-family: sans-serif; padding: 25px; color: #000000; max-width: 600px; margin: 0 auto; border: 1px solid #CBB3B5; border-radius: 16px; background-color: #F8F4F4;">
          <h2 style="font-family: serif; color: #AC5429; border-bottom: 1px solid #CBB3B5; padding-bottom: 12px; margin-top: 0; font-size: 22px; font-weight: normal; tracking-wide;">
            New Contact Form Inquiry
          </h2>
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; width: 100px; color: #4A4A4A;">Customer Name:</td>
              <td style="padding: 8px 0; color: #000000;">${name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #4A4A4A;">Customer Email:</td>
              <td style="padding: 8px 0;"><a href="mailto:${email}" style="color: #AC5429; text-decoration: underline;">${email}</a></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #4A4A4A;">Subject Line:</td>
              <td style="padding: 8px 0; color: #000000; font-weight: 500;">${subject}</td>
            </tr>
          </table>
          <div style="margin-top: 24px; padding: 20px; background-color: #F3D7D2; border-radius: 12px; border-left: 4px solid #AC5429;">
            <p style="margin: 0; font-size: 13px; font-weight: bold; color: #AC5429; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em;">Message Details:</p>
            <p style="margin: 0; font-size: 13px; line-height: 1.6; white-space: pre-wrap; color: #000000;">${message}</p>
          </div>
          <div style="font-size: 10px; color: #4A4A4A; margin-top: 32px; border-t: 1px solid #CBB3B5; padding-top: 12px; text-align: center; font-style: italic;">
            This transactional notification was sent automatically from Snail Studio Storefront.
          </div>
        </div>
      `,
      templateName: "storefront_contact_submission"
    });

    if (!mailResult.success) {
      console.error("Failed to send contact email:", mailResult.error);
      return NextResponse.json(
        { success: false, error: "Failed to send email inquiry." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, logId: mailResult.logId });
  } catch (error) {
    console.error("Error in contact API route:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
