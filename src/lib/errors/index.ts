import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';

/**
 * Generate an 8-character alphanumeric error reference ID.
 * Used for correlating error reports with server logs.
 */
export function generateErrorRef(): string {
  return nanoid(8);
}

/**
 * Standard 401 Unauthorized response.
 * Returns JSON with error message, no reference ID (auth errors are expected).
 */
export function unauthorizedResponse(): NextResponse {
  return NextResponse.json(
    { error: 'Unauthorized' },
    { status: 401 }
  );
}

/**
 * Standard 403 Forbidden response.
 * @param message - Optional custom message, defaults to 'Forbidden'
 */
export function forbiddenResponse(message?: string): NextResponse {
  return NextResponse.json(
    { error: message || 'Forbidden' },
    { status: 403 }
  );
}

/**
 * Standard 404 Not Found response.
 * @param resource - Optional resource name (e.g., 'Equipment', 'Invitation')
 */
export function notFoundResponse(resource?: string): NextResponse {
  const message = resource ? `${resource} not found` : 'Not found';
  return NextResponse.json(
    { error: message },
    { status: 404 }
  );
}

/**
 * Standard 500 Internal Server Error response.
 * Logs error with reference ID for debugging, returns safe message to client.
 *
 * @param error - The caught error (unknown type for catch blocks)
 * @param context - Optional context string for log clarity (e.g., 'equipment:POST')
 */
export function serverErrorResponse(error: unknown, context?: string): NextResponse {
  const ref = generateErrorRef();

  // Log with reference ID for support correlation
  console.error(`[${ref}]${context ? ` ${context}:` : ''} Server error:`, error);

  return NextResponse.json(
    { error: 'An unexpected error occurred', ref },
    { status: 500 }
  );
}
