/**
 * Formats a Date object for use in an HTML date input.
 * Returns YYYY-MM-DD format.
 */
export function formatDateForInput(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Formats a Date object for use in an HTML time input.
 * Returns HH:MM format.
 */
export function formatTimeForInput(date: Date): string {
  return date.toTimeString().slice(0, 5);
}

/**
 * Combines a date string (YYYY-MM-DD) and time string (HH:MM) into ISO datetime.
 * Used when preparing form data for API submission.
 */
export function combineDateAndTime(dateStr: string, timeStr: string): string {
  const date = new Date(dateStr + 'T' + timeStr + ':00');
  return date.toISOString();
}
