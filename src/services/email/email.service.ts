import { db } from "@/db";
import { emailLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSystemSettingsMap } from "@/services/settings";
import nodemailer from "nodemailer";
import { nanoid } from "nanoid";
import { logger } from "@/lib/logger/logger";

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
}

/**
 * Loads the SMTP configuration from system settings in the database,
 * falling back to application environment variables.
 */
export async function getSmtpConfig(): Promise<SmtpConfig | null> {
  try {
    const configMap = await getSystemSettingsMap();

    const host = configMap["smtp_host"] || process.env.SMTP_HOST || "";
    const portStr = configMap["smtp_port"] || process.env.SMTP_PORT || "465";
    const user = configMap["smtp_user"] || process.env.SMTP_USER || "";
    const pass = configMap["smtp_password"] || process.env.SMTP_PASSWORD || "";

    if (!host || !user) {
      return null;
    }

    return {
      host,
      port: parseInt(portStr, 10) || 465,
      user,
      pass,
    };
  } catch (error) {
    console.error("Failed to load SMTP config from DB, checking environment:", error);
    
    const host = process.env.SMTP_HOST || "";
    const portStr = process.env.SMTP_PORT || "465";
    const user = process.env.SMTP_USER || "";
    const pass = process.env.SMTP_PASSWORD || "";

    if (!host || !user) {
      return null;
    }

    return {
      host,
      port: parseInt(portStr, 10) || 465,
      user,
      pass,
    };
  }
}

/**
 * Verifies a temporary or custom SMTP configuration by connecting to the host.
 */
export async function verifySmtpConnection(config: SmtpConfig): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: {
        user: config.user,
        pass: config.pass,
      },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
    });

    await transporter.verify();
    return { success: true };
  } catch (error: any) {
    console.error("SMTP verification failed:", error);
    return { success: false, error: error.message || String(error) };
  }
}

interface SendMailParams {
  to: string;
  subject: string;
  html: string;
  templateName: string;
}

/**
 * Sends a transactional email, logging the delivery attempt to the audit trail.
 * Falls back to terminal logging if SMTP is unconfigured.
 */
export async function sendMail(params: SendMailParams, loggerInstance?: any): Promise<{ success: boolean; error?: string; logId: string }> {
  const logId = `eml_${nanoid(12)}`;
  const timestamp = new Date();
  const reqLogger = loggerInstance || logger;

  try {
    const config = await getSmtpConfig();

    if (!config) {
      reqLogger.warn({
        logId,
        recipient: params.to,
        subject: params.subject,
        templateName: params.templateName,
        type: "smtp_bypass"
      }, `[SMTP BYPASS] Outgoing Email Triggered (${logId})`);

      await db.insert(emailLogs).values({
        id: logId,
        recipient: params.to,
        subject: params.subject,
        templateName: params.templateName,
        status: "success",
        errorMessage: "Bypassed via console logger (mock dev mode)",
        sentAt: timestamp,
      });

      return { success: true, logId };
    }

    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: {
        user: config.user,
        pass: config.pass,
      },
      connectionTimeout: 10000,
    });

    // Send the email
    await transporter.sendMail({
      from: `"Snail Studio" <${config.user}>`,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });

    // Log success
    await db.insert(emailLogs).values({
      id: logId,
      recipient: params.to,
      subject: params.subject,
      templateName: params.templateName,
      status: "success",
      sentAt: timestamp,
    });

    return { success: true, logId };

  } catch (error: any) {
    reqLogger.error({ err: error, logId, type: "email_send_failed" }, `Email delivery failed for log ${logId}: ${error.message}`);

    try {
      await db.insert(emailLogs).values({
        id: logId,
        recipient: params.to,
        subject: params.subject,
        templateName: params.templateName,
        status: "failed",
        errorMessage: error.message || String(error),
        sentAt: timestamp,
      });
    } catch (dbError) {
      reqLogger.error({ err: dbError }, "Failed to write email error logs to database");
    }

    // Trigger admin system notification for SMTP failure
    try {
      const { triggerAdminNotification } = await import("../notifications/notification-service");
      await triggerAdminNotification({
        category: "system",
        title: "SMTP Mailer Failure",
        message: `Failed to deliver email to ${params.to}. Subject: ${params.subject}.\nError: ${error.message || String(error)}`,
        priority: "high",
        data: {
          action: "smtp_failure",
          entityType: "email_log",
          entityId: logId,
        }
      });
    } catch (notifErr) {
      reqLogger.error({ err: notifErr }, "Failed to trigger SMTP failure notification");
    }

    return { success: false, error: error.message || String(error), logId };
  }
}
