// src/lib/email/client.ts
import { Resend } from 'resend';

// Singleton Resend client - created lazily when API key available
let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
  if (resendClient) return resendClient;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('Email disabled: RESEND_API_KEY not set');
    return null;
  }

  resendClient = new Resend(apiKey);
  return resendClient;
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}

/**
 * Send an email via Resend
 * Returns success: true if sent, success: false if disabled or failed
 * Gracefully degrades when API key not configured
 */
export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
  const client = getResendClient();

  if (!client) {
    return { success: false, error: 'Email not configured' };
  }

  try {
    // Use onboarding domain for now, switch to custom domain in production
    const fromAddress = process.env.RESEND_FROM_ADDRESS || 'Radl <onboarding@resend.dev>';

    const { error } = await client.emails.send({
      from: fromAddress,
      to: options.to,
      subject: options.subject,
      html: options.html,
      replyTo: options.replyTo,
    });

    if (error) {
      console.error('Resend error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Email send error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
