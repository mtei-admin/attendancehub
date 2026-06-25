import nodemailer from "nodemailer";
import { Resend } from "resend";

export type SendMailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: {
    filename: string;
    content: string;
    contentType?: string;
  }[];
};

function getFromAddress(): string {
  const from = process.env.SMTP_FROM?.trim() || process.env.RESEND_FROM?.trim();
  if (!from) {
    throw new Error("Set SMTP_FROM (or RESEND_FROM) in environment variables.");
  }
  return from;
}

function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export function isSmtpConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST?.trim() &&
      (process.env.SMTP_FROM?.trim() || process.env.RESEND_FROM?.trim()),
  );
}

export function isMailConfigured(): boolean {
  return isResendConfigured() || isSmtpConfigured();
}

async function sendViaResend(input: SendMailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: getFromAddress(),
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
    attachments: input.attachments?.map((attachment) => ({
      filename: attachment.filename,
      content: Buffer.from(attachment.content, "utf-8"),
    })),
  });

  if (error) {
    throw new Error(error.message);
  }
}

function getSmtpConfig() {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS ?? "";
  const secureEnv = process.env.SMTP_SECURE?.trim().toLowerCase();
  const secure =
    secureEnv === "true" ? true : secureEnv === "false" ? false : port === 465;

  if (!host) {
    throw new Error("SMTP is not configured. Set SMTP_HOST in environment variables.");
  }

  return {
    host,
    port,
    secure,
    requireTLS: !secure && port === 587,
    auth: user ? { user, pass } : undefined,
    from: getFromAddress(),
  };
}

async function sendViaSmtp(input: SendMailInput): Promise<void> {
  const config = getSmtpConfig();
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    requireTLS: config.requireTLS,
    auth: config.auth,
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 20_000,
  });

  await transporter.sendMail({
    from: config.from,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
    attachments: input.attachments?.map((attachment) => ({
      filename: attachment.filename,
      content: attachment.content,
      contentType: attachment.contentType ?? "text/csv; charset=utf-8",
    })),
  });
}

export async function sendMail(input: SendMailInput): Promise<void> {
  if (isResendConfigured()) {
    await sendViaResend(input);
    return;
  }

  await sendViaSmtp(input);
}
