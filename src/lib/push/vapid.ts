// VAPID keys for Web Push Protocol

export const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
export const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';
export const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@radl.sol';

/**
 * Check if VAPID keys are configured.
 * Returns false if keys are missing (push notifications disabled).
 */
export function isVapidConfigured(): boolean {
  return !!(vapidPublicKey && vapidPrivateKey);
}
