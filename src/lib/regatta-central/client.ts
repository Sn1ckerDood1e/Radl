/**
 * Regatta Central API client with automatic token refresh.
 * Handles OAuth2 password grant flow and encrypted token storage.
 */

import { prisma } from '@/lib/prisma';
import { encryptToken, decryptToken } from './encryption';
import type { RCTokenResponse, RCRegattasResponse, RCTeamEntriesResponse } from './types';

const RC_BASE_URL = 'https://api.regattacentral.com';
const RC_API_URL = `${RC_BASE_URL}/v4.0`;

const RC_CLIENT_ID = process.env.RC_CLIENT_ID;
const RC_CLIENT_SECRET = process.env.RC_CLIENT_SECRET;

export class RegattaCentralClient {
  private teamId: string;

  constructor(teamId: string) {
    this.teamId = teamId;
  }

  /**
   * Get the team's RC connection from database.
   */
  private async getConnection() {
    const conn = await prisma.regattaCentralConnection.findUnique({
      where: { teamId: this.teamId },
    });

    if (!conn) {
      throw new Error('Regatta Central not connected for this team');
    }

    return conn;
  }

  /**
   * Refresh the OAuth token if it's expiring soon (within 10 minutes).
   */
  private async refreshTokenIfNeeded() {
    const conn = await this.getConnection();
    const tenMinutesFromNow = Date.now() + 10 * 60 * 1000;

    if (conn.expiresAt.getTime() > tenMinutesFromNow) {
      return; // Token still valid
    }

    if (!RC_CLIENT_ID || !RC_CLIENT_SECRET) {
      throw new Error('Regatta Central API credentials not configured');
    }

    const refreshToken = decryptToken(conn.refreshToken);

    const response = await fetch(`${RC_BASE_URL}/oauth2/api/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: RC_CLIENT_ID,
        client_secret: RC_CLIENT_SECRET,
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('RC token refresh failed:', error);
      throw new Error('Failed to refresh Regatta Central token. Please reconnect.');
    }

    const data: RCTokenResponse = await response.json();

    await prisma.regattaCentralConnection.update({
      where: { teamId: this.teamId },
      data: {
        encryptedToken: encryptToken(data.access_token),
        refreshToken: encryptToken(data.refresh_token),
        expiresAt: new Date(Date.now() + data.expires_in * 1000),
      },
    });
  }

  /**
   * Make an authenticated request to the RC API.
   */
  async fetch<T>(endpoint: string): Promise<T> {
    await this.refreshTokenIfNeeded();

    const conn = await this.getConnection();
    const token = decryptToken(conn.encryptedToken);

    const response = await fetch(`${RC_API_URL}${endpoint}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Regatta Central authentication failed. Please reconnect.');
      }
      throw new Error(`RC API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get the team's RC club ID.
   */
  async getClubId(): Promise<string> {
    const conn = await this.getConnection();
    return conn.rcClubId;
  }

  /**
   * Get upcoming regattas (country defaults to US).
   */
  async getUpcomingRegattas(country = 'US'): Promise<RCRegattasResponse> {
    return this.fetch(`/regattas/${country}/upcoming`);
  }

  /**
   * Get team's entries for a specific regatta.
   */
  async getTeamEntries(regattaId: string): Promise<RCTeamEntriesResponse> {
    const clubId = await this.getClubId();
    return this.fetch(`/regattas/${regattaId}/club/${clubId}/events`);
  }

  /**
   * Get regatta details.
   */
  async getRegattaDetails(regattaId: string): Promise<{ regatta: { id: string; name: string; location?: string; startDate: number; endDate?: number } }> {
    return this.fetch(`/regattas/${regattaId}`);
  }
}

/**
 * Authenticate with RC and store encrypted tokens.
 * Used for initial connection only.
 */
export async function connectRegattaCentral(
  teamId: string,
  username: string,
  password: string,
  rcClubId: string
): Promise<void> {
  if (!RC_CLIENT_ID || !RC_CLIENT_SECRET) {
    throw new Error('Regatta Central API credentials not configured');
  }

  // Request access token using password grant
  const response = await fetch(`${RC_BASE_URL}/oauth2/api/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'password',
      client_id: RC_CLIENT_ID,
      client_secret: RC_CLIENT_SECRET,
      username,
      password,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('RC OAuth failed:', error);

    if (response.status === 401 || response.status === 400) {
      throw new Error('Invalid Regatta Central credentials');
    }
    throw new Error('Failed to connect to Regatta Central');
  }

  const data: RCTokenResponse = await response.json();

  // Upsert connection with encrypted tokens
  await prisma.regattaCentralConnection.upsert({
    where: { teamId },
    create: {
      teamId,
      rcClubId,
      encryptedToken: encryptToken(data.access_token),
      refreshToken: encryptToken(data.refresh_token),
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    },
    update: {
      rcClubId,
      encryptedToken: encryptToken(data.access_token),
      refreshToken: encryptToken(data.refresh_token),
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      lastSyncAt: null,
    },
  });
}

/**
 * Disconnect RC by removing stored tokens.
 */
export async function disconnectRegattaCentral(teamId: string): Promise<void> {
  await prisma.regattaCentralConnection.delete({
    where: { teamId },
  }).catch(() => {
    // Ignore if not found
  });
}

/**
 * Check if team has RC connected.
 */
export async function isRegattaCentralConnected(teamId: string): Promise<boolean> {
  const conn = await prisma.regattaCentralConnection.findUnique({
    where: { teamId },
  });
  return !!conn;
}
