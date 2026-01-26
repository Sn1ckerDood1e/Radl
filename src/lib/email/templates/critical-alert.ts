// src/lib/email/templates/critical-alert.ts
import { sendEmail } from '../client';

export interface CriticalAlertData {
  teamName: string;
  equipmentName: string;
  equipmentId: string;
  reporterName: string;
  location: string;
  description: string;
  category?: string;
  photoUrl?: string;
  reportId: string;
}

/**
 * Send critical damage alert email to coaches
 * Called only for CRITICAL severity reports
 */
export async function sendCriticalDamageAlert(
  recipientEmails: string[],
  data: CriticalAlertData
): Promise<{ success: boolean; sent: number }> {
  if (recipientEmails.length === 0) {
    return { success: true, sent: 0 };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://rowops.app';
  const equipmentUrl = `${appUrl}/equipment/${data.equipmentId}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.5; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #dc2626; color: white; padding: 16px 20px; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 18px; font-weight: 600;">
      [CRITICAL] Equipment Damage Report
    </h1>
  </div>

  <div style="border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; padding: 20px;">
    <p style="margin: 0 0 16px;">
      A critical damage report has been submitted for <strong>${escapeHtml(data.teamName)}</strong>.
    </p>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; width: 120px;">Equipment:</td>
        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-weight: 500;">${escapeHtml(data.equipmentName)}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Location:</td>
        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${escapeHtml(data.location)}</td>
      </tr>
      ${data.category ? `
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Category:</td>
        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${escapeHtml(data.category)}</td>
      </tr>
      ` : ''}
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Reported by:</td>
        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${escapeHtml(data.reporterName)}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #6b7280;">Reference:</td>
        <td style="padding: 8px 0; font-family: monospace;">${data.reportId.substring(0, 8).toUpperCase()}</td>
      </tr>
    </table>

    <div style="background-color: #f9fafb; border-radius: 6px; padding: 12px; margin-bottom: 16px;">
      <p style="margin: 0; color: #374151;">${escapeHtml(data.description)}</p>
    </div>

    ${data.photoUrl ? `
    <p style="margin: 0 0 16px;">
      <a href="${escapeHtml(data.photoUrl)}" style="color: #2563eb;">View attached photo</a>
    </p>
    ` : ''}

    <a href="${equipmentUrl}" style="display: inline-block; background-color: #059669; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500;">
      View Equipment Details
    </a>

    <p style="margin: 16px 0 0; font-size: 12px; color: #9ca3af;">
      This equipment should be taken out of service until inspected.
    </p>
  </div>

  <p style="margin: 16px 0 0; font-size: 12px; color: #9ca3af; text-align: center;">
    Sent by RowOps - Equipment Management for Rowing Teams
  </p>
</body>
</html>
  `.trim();

  const result = await sendEmail({
    to: recipientEmails,
    subject: `[CRITICAL] Damage: ${data.equipmentName} - ${data.teamName}`,
    html,
  });

  return {
    success: result.success,
    sent: result.success ? recipientEmails.length : 0,
  };
}

/**
 * Escape HTML special characters to prevent XSS in email content
 */
function escapeHtml(text: string): string {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, (char) => htmlEscapes[char] || char);
}
