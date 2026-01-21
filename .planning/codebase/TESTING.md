# Testing Patterns

**Analysis Date:** 2026-01-20

## Test Framework

**Status:** Not detected

**No test framework configured:**
- No Jest configuration found (`jest.config.*` not present)
- No Vitest configuration found (`vitest.config.*` not present)
- No test dependency in `package.json`: Jest, Vitest, or Mocha not listed
- No `.test.*` or `.spec.*` files found in codebase
- Only `@types/` packages for Node and React present

**Current State:**
- 0% test coverage
- No test infrastructure in place
- All code validation relies on TypeScript static analysis and manual testing

## Run Commands

Not applicable - no test runner configured.

## Recommended Testing Structure (For Future Implementation)

Based on codebase patterns, recommended structure if testing is added:

**Test File Organization:**
```
src/
├── lib/
│   ├── validations/
│   │   ├── equipment.ts
│   │   └── equipment.test.ts          # Co-located with schema
│   ├── utils/
│   │   ├── slug.ts
│   │   └── slug.test.ts               # Co-located with utility
│   └── supabase/
│       ├── server.ts
│       └── server.test.ts             # Co-located with module
└── app/
    └── api/
        ├── invitations/
        │   ├── route.ts
        │   └── route.test.ts           # Co-located with route
        └── equipment/
            ├── route.ts
            └── route.test.ts           # Co-located with route

tests/
├── fixtures/                           # Shared test data
│   ├── equipment.fixtures.ts
│   ├── invitations.fixtures.ts
│   └── users.fixtures.ts
└── integration/                        # Integration tests
    ├── equipment-api.test.ts
    └── invitations-api.test.ts
```

## Test Structure

**Recommended test suite pattern (based on Zod/Next.js patterns in codebase):**

```typescript
import { createEquipmentSchema } from '@/lib/validations/equipment';
import { describe, it, expect } from 'vitest';

describe('Equipment Validation', () => {
  describe('createEquipmentSchema', () => {
    it('should validate valid equipment data', () => {
      const validData = {
        type: 'SHELL',
        name: 'Racing Shell',
        boatClass: 'SINGLE_1X',
      };

      const result = createEquipmentSchema.safeParse(validData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
    });

    it('should reject invalid equipment type', () => {
      const invalidData = {
        type: 'INVALID',
        name: 'Racing Shell',
      };

      const result = createEquipmentSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });

    it('should require boatClass for SHELL type', () => {
      const invalidShell = {
        type: 'SHELL',
        name: 'Racing Shell',
        // boatClass missing
      };

      const result = createEquipmentSchema.safeParse(invalidShell);

      expect(result.success).toBe(false);
      expect(result.error?.flatten().fieldErrors.boatClass).toBeDefined();
    });
  });
});
```

## Mocking

**Recommended Framework:** Vitest with built-in mocking (no external mock library needed)

**Patterns for API Route Testing:**

```typescript
import { GET } from '@/app/api/invitations/route';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/server');
vi.mock('@/lib/prisma');

describe('GET /api/invitations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return invitations for authenticated coach', async () => {
    const mockUser = { id: 'user-123', email: 'coach@example.com' };

    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: {
              access_token: 'valid-jwt-token',
            },
          },
        }),
      },
    });

    vi.mocked(prisma.invitation.findMany).mockResolvedValue([
      {
        id: 'inv-1',
        email: 'athlete@example.com',
        role: 'ATHLETE',
        status: 'PENDING',
      },
    ]);

    const request = new NextRequest('http://localhost:3000/api/invitations');
    const response = await GET(request);

    expect(response.status).toBe(200);
  });

  it('should reject unauthorized requests', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: 'Unauthorized',
        }),
      },
    });

    const request = new NextRequest('http://localhost:3000/api/invitations');
    const response = await GET(request);

    expect(response.status).toBe(401);
  });
});
```

## What to Mock

**Always mock:**
- `createClient()` - Supabase client (auth, session)
- `prisma` - Database client and all model operations
- External API calls (fetch requests to `/api/*` endpoints)

**What NOT to Mock:**
- Zod validation schemas - test actual validation logic
- Utility functions like `generateSlug()` - unit test in isolation
- TypeScript type guards and helpers - test behavior

## Fixtures and Factories

**Recommended test data location:**
- `tests/fixtures/` directory for shared test data

**Example fixture pattern:**

```typescript
// tests/fixtures/equipment.fixtures.ts
export const validEquipmentData = {
  type: 'SHELL' as const,
  name: 'Racing Shell',
  manufacturer: 'Empacher',
  serialNumber: 'EMP-2024-001',
  yearAcquired: 2024,
  boatClass: 'SINGLE_1X' as const,
  weightCategory: 'LIGHTWEIGHT' as const,
};

export const validAthlete = {
  id: 'athlete-123',
  displayName: 'John Rower',
  sidePreference: 'PORT' as const,
  canBow: true,
  canCox: false,
};

export function createMockEquipment(overrides = {}) {
  return { ...validEquipmentData, ...overrides };
}

export function createMockAthlete(overrides = {}) {
  return { ...validAthlete, ...overrides };
}
```

## Coverage

**Requirements:** Not enforced (no coverage tool configured)

**Recommended minimum coverage targets (if implementing):**
- Validation schemas: 100% - critical for data integrity
- API route handlers: 80% - core business logic
- Utility functions: 100% - foundational
- React components: 60% - lower priority, behavior tested via integration tests
- Overall project: 70% minimum

**View Coverage (Recommended Vitest setup):**
```bash
vitest --coverage
vitest --coverage --reporter=html
```

## Test Types

**Unit Tests:**
- **Scope:** Individual functions, schemas, utilities
- **Approach:** Test in isolation using mocks
- **Examples:**
  - Validation schemas: test valid/invalid inputs
  - Utility functions: `generateSlug()`, `isPublicRoute()`
  - Error handling: verify correct status codes and messages

**Integration Tests:**
- **Scope:** API routes with mocked database, full request/response cycle
- **Approach:** Mock Prisma and Supabase; verify end-to-end behavior
- **Examples:**
  - GET /api/invitations - verify auth, team association, response format
  - POST /api/equipment - verify validation, role checks, creation
  - DELETE /api/invitations/[id] - verify permissions and state changes

**E2E Tests:**
- **Framework:** Not implemented (would use Playwright/Cypress if added)
- **When to add:** After integration tests stabilize; focus on critical user flows

## Common Patterns

**Async Testing (with Vitest):**
```typescript
it('should fetch data asynchronously', async () => {
  const data = await someAsyncFunction();
  expect(data).toBeDefined();
});

// Using vi.waitFor for polling
it('should eventually complete', async () => {
  await vi.waitFor(() => {
    expect(state.isLoaded).toBe(true);
  });
});
```

**Error Testing:**
```typescript
it('should throw on invalid input', () => {
  expect(() => {
    invalidFunction();
  }).toThrow('Expected error message');
});

// For async errors
it('should reject on API failure', async () => {
  await expect(apiCall()).rejects.toThrow('API Error');
});

// For Zod validation
it('should return validation error', () => {
  const result = schema.safeParse(invalidData);
  expect(result.success).toBe(false);
  expect(result.error?.flatten()).toBeDefined();
});
```

**Request/Response Testing (Next.js API routes):**
```typescript
it('should handle POST request', async () => {
  const request = new NextRequest('http://localhost:3000/api/endpoint', {
    method: 'POST',
    body: JSON.stringify({ key: 'value' }),
  });

  const response = await POST(request);
  const data = await response.json();

  expect(response.status).toBe(201);
  expect(data.success).toBe(true);
});
```

## Critical Test Areas (Priority Order)

Given current test coverage gap:

1. **Validation Schemas** (`src/lib/validations/`)
   - All Zod schemas must be tested for all valid/invalid cases
   - Files: `equipment.ts`, `invitation.ts`, `athlete.ts`, `auth.ts`, `damage-report.ts`, `team.ts`
   - Impact: High - validation is critical security boundary

2. **Authorization Logic** (`src/app/api/*/route.ts`)
   - Test role-based access control (COACH vs ATHLETE vs PARENT)
   - Test team isolation (users only see their team's data)
   - Impact: High - security critical

3. **Data Creation & Updates** (POST/PATCH/DELETE routes)
   - Test state changes (invitation status, equipment status)
   - Test error cases (duplicates, missing data)
   - Impact: High

4. **Utility Functions** (`src/lib/utils/`, `src/lib/auth/`)
   - `generateSlug()`, `isPublicRoute()`
   - Impact: Medium

5. **React Components** (forms, cards)
   - Focus on form submission, error display, state changes
   - Impact: Medium-Low

---

*Testing analysis: 2026-01-20*
