/**
 * Practices API Route RBAC Tests
 *
 * Integration tests for /api/practices endpoint RBAC enforcement.
 * Tests verify:
 * - RBAC-03: COACH can create practices for their club
 * - RBAC-04: ATHLETE cannot create practices (403)
 * - No role inheritance: CLUB_ADMIN without COACH cannot create practices (403)
 *
 * These tests mock getAuthContext to simulate different user roles
 * and verify the API route correctly enforces permissions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/practices/route';

// Mock getAuthContext to control auth context in tests
vi.mock('@/lib/auth/get-auth-context', () => ({
  getAuthContext: vi.fn(),
}));

// Mock Prisma to avoid database calls
vi.mock('@/lib/prisma', () => ({
  prisma: {
    season: {
      findFirst: vi.fn(),
    },
    practice: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { getAuthContext } from '@/lib/auth/get-auth-context';
import { prisma } from '@/lib/prisma';
import { defineAbilityFor } from '@/lib/permissions/ability';

// Type helpers for mocks
const mockGetAuthContext = vi.mocked(getAuthContext);
const mockPrisma = vi.mocked(prisma);

// Test data - valid UUIDs for Zod validation
const TEST_CLUB_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_CLUB_ID = '22222222-2222-4222-8222-222222222222';
const TEST_SEASON_ID = '33333333-3333-4333-8333-333333333333';
const TEST_USER_ID = '44444444-4444-4444-8444-444444444444';

// Valid practice payload for POST requests
const validPracticePayload = {
  seasonId: TEST_SEASON_ID,
  name: 'Morning Practice',
  date: '2026-02-01T08:00:00.000Z',
  startTime: '2026-02-01T08:00:00.000Z',
  endTime: '2026-02-01T10:00:00.000Z',
  notes: 'Focus on technique',
  blocks: [
    { type: 'WATER', durationMinutes: 60, notes: 'On-water rowing' },
    { type: 'LAND', durationMinutes: 30, notes: 'Stretching' },
  ],
};

/**
 * Helper to create a mock NextRequest with JSON body
 */
function createMockRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/practices', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Helper to setup auth context mock with specific role
 */
function setupAuthContext(
  roles: ('FACILITY_ADMIN' | 'CLUB_ADMIN' | 'COACH' | 'ATHLETE' | 'PARENT')[],
  clubId: string = TEST_CLUB_ID
) {
  const ability = defineAbilityFor({
    userId: TEST_USER_ID,
    clubId,
    roles,
    viewMode: 'club',
  });

  mockGetAuthContext.mockResolvedValue({
    success: true,
    context: {
      userId: TEST_USER_ID,
      clubId,
      roles,
      ability,
    },
  });
}

/**
 * Helper to setup unauthorized auth context
 */
function setupUnauthorizedContext() {
  mockGetAuthContext.mockResolvedValue({
    success: false,
    error: 'Unauthorized',
    status: 401,
  });
}

describe('RBAC Enforcement: /api/practices POST', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // =========================================================================
  // RBAC-03: COACH can create practices
  // =========================================================================

  describe('RBAC-03: COACH permissions', () => {
    it('COACH can create practice for their club (not 403)', async () => {
      // Setup COACH auth context
      setupAuthContext(['COACH']);

      // Mock season lookup to return valid season
      mockPrisma.season.findFirst.mockResolvedValue({
        id: TEST_SEASON_ID,
        teamId: TEST_CLUB_ID,
        name: 'Spring 2026',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-06-30'),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Mock practice creation
      mockPrisma.practice.create.mockResolvedValue({
        id: 'practice-new-123',
        teamId: TEST_CLUB_ID,
        seasonId: TEST_SEASON_ID,
        name: 'Morning Practice',
        date: new Date('2026-02-01'),
        startTime: new Date('2026-02-01T08:00:00.000Z'),
        endTime: new Date('2026-02-01T10:00:00.000Z'),
        notes: 'Focus on technique',
        status: 'DRAFT',
        createdAt: new Date(),
        updatedAt: new Date(),
        blocks: [
          { id: 'block-1', position: 0, type: 'WATER', durationMinutes: 60, category: null, notes: 'On-water rowing' },
          { id: 'block-2', position: 1, type: 'LAND', durationMinutes: 30, category: null, notes: 'Stretching' },
        ],
      });

      const request = createMockRequest(validPracticePayload);
      const response = await POST(request);

      // Should succeed (201 Created)
      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.practice).toBeDefined();
      expect(data.practice.name).toBe('Morning Practice');
      expect(data.practice.teamId).toBe(TEST_CLUB_ID);
    });

    it('COACH can create practice when also has CLUB_ADMIN role', async () => {
      // Dual role: CLUB_ADMIN + COACH
      setupAuthContext(['CLUB_ADMIN', 'COACH']);

      mockPrisma.season.findFirst.mockResolvedValue({
        id: TEST_SEASON_ID,
        teamId: TEST_CLUB_ID,
        name: 'Spring 2026',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-06-30'),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockPrisma.practice.create.mockResolvedValue({
        id: 'practice-new-456',
        teamId: TEST_CLUB_ID,
        seasonId: TEST_SEASON_ID,
        name: 'Morning Practice',
        date: new Date('2026-02-01'),
        startTime: new Date('2026-02-01T08:00:00.000Z'),
        endTime: new Date('2026-02-01T10:00:00.000Z'),
        notes: 'Focus on technique',
        status: 'DRAFT',
        createdAt: new Date(),
        updatedAt: new Date(),
        blocks: [],
      });

      const request = createMockRequest(validPracticePayload);
      const response = await POST(request);

      expect(response.status).toBe(201);
    });
  });

  // =========================================================================
  // RBAC-04: ATHLETE cannot create practices
  // =========================================================================

  describe('RBAC-04: ATHLETE restrictions', () => {
    it('ATHLETE cannot create practice (returns 403)', async () => {
      // Setup ATHLETE auth context
      setupAuthContext(['ATHLETE']);

      const request = createMockRequest(validPracticePayload);
      const response = await POST(request);

      // Should be forbidden
      expect(response.status).toBe(403);

      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.error).toContain('permission');
    });

    it('PARENT cannot create practice (returns 403)', async () => {
      // Setup PARENT auth context
      setupAuthContext(['PARENT']);

      const request = createMockRequest(validPracticePayload);
      const response = await POST(request);

      expect(response.status).toBe(403);

      const data = await response.json();
      expect(data.error).toBeDefined();
    });
  });

  // =========================================================================
  // No role inheritance: CLUB_ADMIN without COACH cannot create
  // =========================================================================

  describe('No role inheritance verification', () => {
    it('CLUB_ADMIN without COACH role cannot create practice (returns 403)', async () => {
      // CLUB_ADMIN only - no COACH role
      setupAuthContext(['CLUB_ADMIN']);

      const request = createMockRequest(validPracticePayload);
      const response = await POST(request);

      // Should be forbidden - CLUB_ADMIN does not inherit COACH permissions
      expect(response.status).toBe(403);

      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.error).toContain('permission');
    });

    it('FACILITY_ADMIN without COACH role cannot create practice (returns 403)', async () => {
      // FACILITY_ADMIN only - no COACH role
      setupAuthContext(['FACILITY_ADMIN']);

      const request = createMockRequest(validPracticePayload);
      const response = await POST(request);

      expect(response.status).toBe(403);

      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it('FACILITY_ADMIN with COACH role can create practice', async () => {
      // Dual role grants creation permission
      setupAuthContext(['FACILITY_ADMIN', 'COACH']);

      mockPrisma.season.findFirst.mockResolvedValue({
        id: TEST_SEASON_ID,
        teamId: TEST_CLUB_ID,
        name: 'Spring 2026',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-06-30'),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockPrisma.practice.create.mockResolvedValue({
        id: 'practice-new-789',
        teamId: TEST_CLUB_ID,
        seasonId: TEST_SEASON_ID,
        name: 'Morning Practice',
        date: new Date('2026-02-01'),
        startTime: new Date('2026-02-01T08:00:00.000Z'),
        endTime: new Date('2026-02-01T10:00:00.000Z'),
        notes: 'Focus on technique',
        status: 'DRAFT',
        createdAt: new Date(),
        updatedAt: new Date(),
        blocks: [],
      });

      const request = createMockRequest(validPracticePayload);
      const response = await POST(request);

      expect(response.status).toBe(201);
    });
  });

  // =========================================================================
  // Authentication checks
  // =========================================================================

  describe('Authentication requirements', () => {
    it('returns 401 for unauthenticated request', async () => {
      setupUnauthorizedContext();

      const request = createMockRequest(validPracticePayload);
      const response = await POST(request);

      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('returns 403 when no club selected', async () => {
      mockGetAuthContext.mockResolvedValue({
        success: false,
        error: 'No club selected',
        status: 403,
      });

      const request = createMockRequest(validPracticePayload);
      const response = await POST(request);

      expect(response.status).toBe(403);

      const data = await response.json();
      expect(data.error).toBe('No club selected');
    });
  });

  // =========================================================================
  // Edge cases
  // =========================================================================

  describe('Edge cases', () => {
    it('empty roles array cannot create practice (returns 403)', async () => {
      // User with no roles at all
      const ability = defineAbilityFor({
        userId: TEST_USER_ID,
        clubId: TEST_CLUB_ID,
        roles: [],
        viewMode: 'club',
      });

      mockGetAuthContext.mockResolvedValue({
        success: true,
        context: {
          userId: TEST_USER_ID,
          clubId: TEST_CLUB_ID,
          roles: [],
          ability,
        },
      });

      const request = createMockRequest(validPracticePayload);
      const response = await POST(request);

      expect(response.status).toBe(403);
    });
  });
});
