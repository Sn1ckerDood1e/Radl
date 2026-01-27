/**
 * TypeScript types for Regatta Central API responses.
 * Based on RC API v4 documentation.
 */

// OAuth token response
export interface RCTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number; // seconds
  token_type: string;
}

// Regatta list item
export interface RCRegatta {
  id: string;
  name: string;
  location?: string;
  startDate: number; // Unix timestamp ms
  endDate?: number;
  status: string;
}

// Event (race type) at regatta
export interface RCEvent {
  eventId: string;
  uuid: string;
  sequence: number;
  label: string;
  title: string;
  code: string;
  gender?: string;
  athleteClass?: string;
  equipment?: string;
  sweep?: boolean;
  coxed?: boolean;
  status: string;
}

// Team's entry (registration) for an event
export interface RCTeamEntry {
  entryId: string;
  eventId: string;
  eventTitle: string;
  eventCode: string;
  raceTime?: number; // Unix timestamp ms
  heat?: string;
  lane?: number;
  status: string;
}

// Club/team info
export interface RCClub {
  clubId: string;
  name: string;
  abbreviation?: string;
  country?: string;
}

// API response wrappers
export interface RCRegattasResponse {
  regattas: RCRegatta[];
}

export interface RCEventsResponse {
  events: RCEvent[];
}

export interface RCTeamEntriesResponse {
  entries: RCTeamEntry[];
}

export interface RCClubResponse {
  club: RCClub;
}

// ============================================
// Public Regatta Types (for RC Public API)
// ============================================

/**
 * Regatta status from RC API.
 * Maps RC status values to display-friendly states.
 */
export type RCRegattaStatus =
  | 'UPCOMING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

/**
 * Registration status for public regatta display.
 * Indicates whether teams can register for the regatta.
 */
export type RCRegistrationStatus =
  | 'OPEN'
  | 'CLOSED'
  | 'WAITLIST'
  | 'NOT_AVAILABLE';

/**
 * Public regatta display type (extended from API response).
 * Used for displaying upcoming regattas from RC public API.
 * Distinct from RCRegatta which is for team-specific authenticated data.
 */
export interface RCPublicRegatta {
  id: string;
  name: string;
  location: string | null;
  venue: string | null;
  startDate: Date;           // Converted from Unix timestamp
  endDate: Date | null;      // Converted from Unix timestamp
  status: RCRegattaStatus;
  registrationStatus: RCRegistrationStatus;
  rcUrl: string;             // Deep link to RC regatta page
  region: string;            // ISO 3166-1 alpha-2 country code
}

/**
 * API response for upcoming regattas (server-side transformed).
 * Includes cache metadata for stale-while-revalidate pattern.
 */
export interface RCUpcomingRegattasResponse {
  regattas: RCPublicRegatta[];
  cachedAt: string;          // ISO timestamp of when data was cached
  staleAfter: string;        // ISO timestamp when cache becomes stale
}
