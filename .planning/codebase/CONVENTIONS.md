# Coding Conventions

**Analysis Date:** 2026-01-20

## Naming Patterns

**Files:**
- kebab-case for component and utility files: `invite-member-form.tsx`, `equipment-card.tsx`, `team-code.ts`
- camelCase for index/entry files in same directory
- API routes follow Next.js convention: `route.ts`, `[id]/route.ts`, `[id]/[reportId]/route.ts`

**Functions:**
- camelCase for all function declarations and exports
- Helper functions prefixed with descriptor: `getClaimsWithFallback`, `generateSlug`, `isPublicRoute`
- Arrow functions used consistently in React components
- Async handler functions named after HTTP method: `export async function GET()`, `export async function POST()`, `export async function DELETE()`, `export async function PATCH()`

**Variables:**
- camelCase for all variables and constants
- Boolean variables prefixed with `is`, `has`, `can`: `isCoach`, `isSelf`, `isSubmitting`, `canBow`, `canCox`
- Event handlers prefixed with `on`: `onSubmit`, `onSuccess`, `onChange`
- Error/state variables descriptive: `submitError`, `loadingAthletes`, `selectedRole`

**Types:**
- PascalCase for interface and type names: `EquipmentCardProps`, `CustomJwtPayload`, `CreateInvitationInput`
- Props interfaces suffixed with `Props`: `InviteMemberFormProps`, `EquipmentFormProps`
- Schema types suffixed with `Input` or `Output`: `CreateInvitationInput`, `CreateEquipmentFormInput`, `UpdateEquipmentInput`
- Enums use UPPERCASE: `SHELL`, `ATHLETE`, `PENDING`, `ACTIVE`, `RETIRED`

## Code Style

**Formatting:**
- Single quotes for strings throughout codebase (JavaScript/TypeScript)
- 2-space indentation (inferred from eslint-config-next)
- Semicolons required at end of statements
- Multiline objects/functions properly indented with closing brace on same indent level as opening statement

**Linting:**
- ESLint 9 with eslint-config-next (core-web-vitals and typescript presets)
- Config: `eslint.config.mjs`
- Rules: Enforces Next.js best practices and web vitals
- No Prettier config found; uses ESLint defaults

**Example code style:**
```typescript
const supabase = await createClient();
const { data: { user }, error: authError } = await supabase.auth.getUser();

if (authError || !user) {
  return NextResponse.json(
    { error: 'Unauthorized' },
    { status: 401 }
  );
}
```

## Import Organization

**Order:**
1. External framework/library imports (React, Next.js): `import { useState, useEffect } from 'react';`, `import { NextRequest, NextResponse } from 'next/server';`
2. Type imports when needed: `import type { Metadata } from "next";`
3. Absolute imports using path aliases: `import { createClient } from '@/lib/supabase/server';`
4. Same-level or relative imports (rare): rarely used; path aliases preferred

**Path Aliases:**
- `@/*` → `./src/*` (configured in `tsconfig.json`)
- All imports use `@/` for consistency: `@/lib/`, `@/components/`, `@/lib/validations/`

**Example import block:**
```typescript
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createInvitationSchema, type CreateInvitationInput } from '@/lib/validations/invitation';
```

## Error Handling

**Patterns:**
- Try-catch blocks in all API route handlers
- Explicit type guards: `if (!user)`, `if (!claims?.team_id)`
- Null coalescing for optional values: `athleteId: athleteId || null`
- Error responses follow consistent format: `{ error: 'Message' }` with appropriate status codes
- Logging: `console.error('Error description:', error)` in catch blocks
- No silent failures; all errors logged or returned to client

**Status codes:**
- 400: Validation failed
- 401: Unauthorized/No session
- 403: Forbidden (insufficient permissions or no team)
- 404: Resource not found
- 409: Conflict (e.g., duplicate invitation)
- 500: Internal server error

**Example error handling:**
```typescript
try {
  const response = await fetch('/api/invitations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Failed to create invitation');
  }
} catch (error) {
  setSubmitError(error instanceof Error ? error.message : 'An error occurred');
}
```

## Logging

**Framework:** `console` (native, no external logging library)

**Patterns:**
- `console.error()` only in catch blocks for debugging
- No debug/info/warn logging used
- Errors include context: `console.error('Error fetching invitations:', error)`
- Client-side errors shown in UI state: `submitError`, `submitSuccess`
- No sensitive data logged

## Comments

**When to Comment:**
- Function purpose comments before implementation: `// Helper to get claims with database fallback`
- API method comments as markers: `// GET: List invitations...`, `// POST: Create single invitation`
- Complex logic requiring explanation: `// IMPORTANT: Use getUser() for auth verification, NOT getSession()`
- Workarounds or important context: `// NOTE: Email sending not implemented in v1...`, `// The setAll method was called from a Server Component...`
- Reference to documentation: `// See: .planning/phases/01-foundation-multi-tenancy/01-KNOWN-LIMITATIONS.md`

**JSDoc/TSDoc:**
- Not used systematically; minimal inline documentation
- TypeScript interfaces and types serve as self-documenting code
- Custom interface comments rare; only in `CustomJwtPayload` for clarity

## Function Design

**Size:** Functions generally 50-200 lines; API handlers are larger due to request parsing and error handling

**Parameters:**
- Destructured objects preferred: `{ id, name, manufacturer }` in component props
- Explicit types for all parameters in TypeScript
- Props passed as single object in React components
- Async context objects: `{ params }: { params: Promise<{ id: string }> }`

**Return Values:**
- API handlers return `NextResponse` with status codes and JSON body
- Components return JSX
- Helper functions return typed values or `null` for no data
- Consistent response format: `{ success: true, data: {...} }` or `{ error: 'message' }`

**Example function pattern:**
```typescript
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validationResult = schema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    // ... process request ...

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    console.error('Error description:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## Module Design

**Exports:**
- Named exports for all functions and components: `export function EquipmentCard()`, `export async function POST()`
- Single function per route handler file: `export async function GET()`, `export async function POST()`
- Default export for layout components: `export default function RootLayout()`
- Type exports: `export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;`

**Barrel Files:**
- Not systematically used; each component/function imported directly from its file
- Path aliases replace barrel file needs

**Validation Schemas:**
- Zod schemas separated in `/lib/validations/` files
- Schemas always exported: `export const createEquipmentSchema = ...`
- Derived types exported: `export type CreateEquipmentInput = z.infer<typeof createEquipmentSchema>;`
- Form schemas separate from API schemas when needed: `createEquipmentFormSchema` vs `createEquipmentSchema`

---

*Convention analysis: 2026-01-20*
