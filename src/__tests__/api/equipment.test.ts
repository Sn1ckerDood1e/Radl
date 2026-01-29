/**
 * Equipment API Route RBAC Tests
 *
 * Integration tests for /api/equipment endpoint RBAC enforcement.
 * Tests verify:
 * - RBAC-03: COACH can create equipment for their club
 * - RBAC-04: ATHLETE cannot create equipment (403)
 *
 * These tests mock getAuthContext to simulate different user roles
 * and verify the API route correctly enforces permissions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/equipment/route';

// Mock getAuthContext to control auth context in tests
vi.mock('@/lib/auth/get-auth-context', () => ({
  getAuthContext: vi.fn(),
}));

// Mock Prisma to avoid database calls
vi.mock('@/lib/prisma', () => ({
  prisma: {
    equipment: {
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
const TEST_USER_ID = '44444444-4444-4444-8444-444444444444';

// Valid equipment payload for POST requests
const validEquipmentPayload = {
  type: 'SHELL',
  name: 'Hudson 8+',
  manufacturer: 'Hudson',
  serialNumber: 'HUD-001',
  yearAcquired: 2024,
  purchasePrice: 45000,
  notes: 'Primary racing shell',
  boatClass: 'EIGHT_8_PLUS',
  weightCategory: 'HEAVYWEIGHT',
};

/**
 * Helper to create a mock NextRequest with JSON body
 */
function createMockRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/equipment', {
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

describe('RBAC Enforcement: /api/equipment POST', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // =========================================================================
  // RBAC-03: COACH can create equipment
  // =========================================================================

  describe('RBAC-03: COACH permissions', () => {
    it('COACH can create equipment for their club (not 403)', async () => {
      // Setup COACH auth context
      setupAuthContext(['COACH']);

      // Mock equipment creation
      mockPrisma.equipment.create.mockResolvedValue({
        id: 'equip-new-123',
        teamId: TEST_CLUB_ID,
        type: 'SHELL',
        name: 'Hudson 8+',
        manufacturer: 'Hudson',
        serialNumber: 'HUD-001',
        yearAcquired: 2024,
        purchasePrice: 45000,
        status: 'ACTIVE',
        notes: 'Primary racing shell',
        boatClass: 'EIGHT_8_PLUS',
        weightCategory: 'HEAVYWEIGHT',
        manualUnavailable: false,
        manualUnavailableNote: null,
        lastInspected: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request = createMockRequest(validEquipmentPayload);
      const response = await POST(request);

      // Should succeed (201 Created)
      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.equipment).toBeDefined();
      expect(data.equipment.name).toBe('Hudson 8+');
      expect(data.equipment.type).toBe('SHELL');
    });

    it('COACH can create equipment when also has CLUB_ADMIN role', async () => {
      // Dual role: CLUB_ADMIN + COACH
      setupAuthContext(['CLUB_ADMIN', 'COACH']);

      mockPrisma.equipment.create.mockResolvedValue({
        id: 'equip-new-456',
        teamId: TEST_CLUB_ID,
        type: 'OAR',
        name: 'Concept2 Oars',
        manufacturer: 'Concept2',
        serialNumber: 'C2-001',
        yearAcquired: 2024,
        purchasePrice: 2500,
        status: 'ACTIVE',
        notes: null,
        boatClass: null,
        weightCategory: null,
        manualUnavailable: false,
        manualUnavailableNote: null,
        lastInspected: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const oarPayload = {
        type: 'OAR',
        name: 'Concept2 Oars',
        manufacturer: 'Concept2',
        serialNumber: 'C2-001',
        yearAcquired: 2024,
        purchasePrice: 2500,
      };

      const request = createMockRequest(oarPayload);
      const response = await POST(request);

      expect(response.status).toBe(201);
    });
  });

  // =========================================================================
  // RBAC-04: ATHLETE cannot create equipment
  // =========================================================================

  describe('RBAC-04: ATHLETE restrictions', () => {
    it('ATHLETE cannot create equipment (returns 403)', async () => {
      // Setup ATHLETE auth context
      setupAuthContext(['ATHLETE']);

      const request = createMockRequest(validEquipmentPayload);
      const response = await POST(request);

      // Should be forbidden
      expect(response.status).toBe(403);

      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.error).toContain('permission');
    });

    it('PARENT cannot create equipment (returns 403)', async () => {
      // Setup PARENT auth context
      setupAuthContext(['PARENT']);

      const request = createMockRequest(validEquipmentPayload);
      const response = await POST(request);

      expect(response.status).toBe(403);

      const data = await response.json();
      expect(data.error).toBeDefined();
    });
  });

  // =========================================================================
  // No role inheritance
  // =========================================================================

  describe('No role inheritance verification', () => {
    it('CLUB_ADMIN without COACH role cannot create equipment (returns 403)', async () => {
      // CLUB_ADMIN only - no COACH role
      setupAuthContext(['CLUB_ADMIN']);

      const request = createMockRequest(validEquipmentPayload);
      const response = await POST(request);

      // Should be forbidden - CLUB_ADMIN does not inherit COACH permissions
      expect(response.status).toBe(403);

      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it('FACILITY_ADMIN without COACH role cannot create equipment (returns 403)', async () => {
      // FACILITY_ADMIN only - no COACH role
      setupAuthContext(['FACILITY_ADMIN']);

      const request = createMockRequest(validEquipmentPayload);
      const response = await POST(request);

      expect(response.status).toBe(403);
    });
  });

  // =========================================================================
  // Authentication checks
  // =========================================================================

  describe('Authentication requirements', () => {
    it('returns 401 for unauthenticated request', async () => {
      setupUnauthorizedContext();

      const request = createMockRequest(validEquipmentPayload);
      const response = await POST(request);

      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });
  });
});
