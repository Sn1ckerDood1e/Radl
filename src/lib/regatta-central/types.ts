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
