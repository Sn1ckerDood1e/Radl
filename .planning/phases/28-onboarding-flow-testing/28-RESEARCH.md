# Phase 28: Onboarding Flow Testing - Research

**Researched:** 2026-01-29
**Domain:** Authentication, Team Creation, Invitation System, User Onboarding
**Confidence:** HIGH (code audit completed)

## Summary

The onboarding flow is substantially implemented across multiple components. This research audited all existing code to document what works, identify gaps, and prepare a testing approach for each ONBD requirement.

**Key Findings:**
- Signup and login flows are functional with rate limiting and audit logging
- Email verification relies on Supabase's default email templates
- Team creation works but creates TeamMember, not ClubMembership (consistency issue)
- Invitation system is well-implemented but email sending is explicitly not implemented (manual link sharing only)
- Empty states exist on most pages but lack actionable onboarding guidance
- Signup page does NOT handle the `redirect` query parameter (breaks join flow for unauthenticated users)

**Primary recommendation:** Fix the signup redirect parameter handling, test each flow end-to-end, and enhance empty states with clear CTAs.

## Current Implementation

### File Inventory

#### Authentication (ONBD-01, ONBD-02)

| File | Purpose | Status |
|------|---------|--------|
| `/src/app/(auth)/signup/page.tsx` | Signup form UI | Working |
| `/src/app/(auth)/login/page.tsx` | Login form UI | Working |
| `/src/app/api/auth/signup/route.ts` | Signup API with rate limiting | Working |
| `/src/app/api/auth/login/route.ts` | Login API with rate limiting | Working |
| `/src/app/api/auth/callback/route.ts` | Email verification callback | Working |
| `/src/lib/validations/auth.ts` | Zod schemas for auth | Working |
| `/src/middleware.ts` | Route protection | Working |

#### Team Creation (ONBD-03)

| File | Purpose | Status |
|------|---------|--------|
| `/src/app/create-team/page.tsx` | Create team page | Working |
| `/src/components/forms/create-team-form.tsx` | Team creation form | Working |
| `/src/app/api/teams/route.ts` | Create team API | Working |
| `/src/lib/validations/team.ts` | Team validation schema | Working |
| `/src/app/(auth)/onboarding/page.tsx` | No-membership landing | Working |

#### Invitation System (ONBD-04, ONBD-05)

| File | Purpose | Status |
|------|---------|--------|
| `/src/app/(dashboard)/[teamSlug]/invitations/page.tsx` | Invitation management | Working |
| `/src/app/(dashboard)/[teamSlug]/invitations/invitations-client.tsx` | Client component | Working |
| `/src/app/api/invitations/route.ts` | Create/list invitations | Working |
| `/src/app/api/invitations/[id]/route.ts` | Revoke/approve invitations | Working |
| `/src/app/api/invitations/bulk/route.ts` | Bulk CSV import | Working |
| `/src/app/join/[code]/page.tsx` | Join team page | Working |
| `/src/app/join/[code]/join-team-client.tsx` | Join request form | Working |
| `/src/app/api/join/route.ts` | Process join request | Working |
| `/src/components/forms/invite-member-form.tsx` | Single invite form | Working |
| `/src/components/forms/csv-import-form.tsx` | Bulk import form | Working |

#### Empty States & Onboarding (ONBD-06)

| File | Purpose | Status |
|------|---------|--------|
| `/src/components/ui/empty-state.tsx` | Reusable empty state | Working |
| `/src/components/onboarding/onboarding-wizard.tsx` | Coach onboarding modal | Working |
| `/src/components/onboarding/onboarding-steps.tsx` | Step content | Working |
| `/src/hooks/use-onboarding.ts` | Onboarding state hook | Working |
| `/src/components/dashboard/dashboard-with-onboarding.tsx` | Dashboard wrapper | Working |

## Per-Requirement Assessment

### ONBD-01: User can sign up with email and password

**Status:** WORKING with minor issues

**What exists:**
- Signup form with email, password, confirmPassword fields
- Zod validation (8+ char password, email format, password match)
- Rate limiting (signup-specific)
- Audit logging on success/failure
- Success state shows "Check your email" message

**Gaps identified:**
1. **Signup does NOT read `redirect` query parameter** - When user visits `/join/ABC123` unauthenticated, they're redirected to `/signup?redirect=/join/ABC123`, but the signup page ignores this parameter. After signup, user must manually navigate back.
2. Password requirements not clearly displayed on form
3. No loading indicator during form submission beyond button text

**Testing approach:**
1. Submit valid signup, verify "Check your email" message appears
2. Submit with invalid email, verify validation error
3. Submit with short password (<8 chars), verify validation error
4. Submit with mismatched passwords, verify validation error
5. Submit repeatedly to trigger rate limit, verify 429 response
6. Verify audit log entry created

### ONBD-02: User receives and can complete email verification

**Status:** WORKING (Supabase-managed)

**What exists:**
- Supabase handles email template and sending
- `/api/auth/callback` handles code exchange
- Success redirects to `next` parameter or `/`
- Error redirects to `/login?error=auth_callback_error`

**Gaps identified:**
1. No custom email template configured (uses Supabase default)
2. Error page doesn't explain what went wrong or how to retry
3. No resend verification email option on signup success screen

**Testing approach:**
1. Sign up with real email (or use Supabase email testing)
2. Verify email arrives with verification link
3. Click link, verify redirect to dashboard
4. Test expired/invalid link handling (error redirect)
5. Verify user can log in after verification

### ONBD-03: User can create a new team/club after signup

**Status:** WORKING with consistency issue

**What exists:**
- Create team form with name, colors, optional logo
- Generates unique slug (with collision handling)
- Generates 8-char join code
- Creates TeamMember with COACH role in transaction
- Refreshes session after creation to update JWT claims
- Redirects to team dashboard

**Gaps identified:**
1. **Creates TeamMember but NOT ClubMembership** - The RBAC system uses ClubMembership, but team creation only creates TeamMember. Dashboard layout falls back to TeamMember when ClubMembership is missing, but this is inconsistent.
2. Logo upload is separate from team creation (update after create)
3. No validation feedback for slug collisions

**Testing approach:**
1. Navigate to `/create-team` as authenticated user with no team
2. Submit form with valid name, verify team created
3. Verify join code is generated and displayed
4. Verify redirect to team dashboard
5. Verify user is shown as COACH role
6. Test slug collision handling (create team with same name)

### ONBD-04: Coach/admin can invite members via email

**Status:** PARTIALLY WORKING (email not sent)

**What exists:**
- Invitation form with email, role selection
- Parent invites can link to athlete
- Bulk CSV import with duplicate detection
- Team code display on roster and invitations pages
- Join link displayed with shareable URL

**Gaps identified:**
1. **Email sending explicitly NOT implemented** - Comments in code note: "Email sending not implemented in v1 - coaches share join link manually"
2. Invitation creates database record but no notification sent
3. No copy-to-clipboard for team code or join link
4. Success toast says "Invitation sent" but email wasn't sent (misleading)

**Testing approach:**
1. Create invitation via form, verify record created
2. Verify no actual email is sent (expected behavior)
3. Test bulk CSV import with valid data
4. Test bulk import with duplicates, verify proper error handling
5. Verify join code and link are displayed and copyable
6. Test parent invite with athlete linking

### ONBD-05: Invited user can accept invitation and join team

**Status:** WORKING with caveat

**What exists:**
- Team code join flow at `/join/[code]`
- Role selection (Athlete/Parent) during join
- Creates pending invitation requiring coach approval
- Email invite acceptance auto-approves (if email matches)
- Coach approval creates TeamMember and ClubMembership

**Gaps identified:**
1. **Unauthenticated join flow broken** - User at `/join/ABC123` redirects to `/signup?redirect=/join/ABC123`, but signup ignores the redirect parameter
2. Join via team code always requires approval (by design, but not clearly communicated)
3. No notification to coaches when join request is submitted
4. Approval creates both TeamMember and ClubMembership (good consistency)

**Testing approach:**
1. Test join flow as authenticated user (happy path)
2. Test join flow as unauthenticated user (currently broken)
3. Test already-member handling (redirects to dashboard)
4. Test pending request display (shows "Request Pending" state)
5. Test coach approval workflow
6. Verify member appears on roster after approval

### ONBD-06: New users see helpful empty states guiding next actions

**Status:** PARTIALLY IMPLEMENTED

**What exists:**
- `EmptyState` component with icon, title, description, optional action
- Roster page: "No team members yet" with invite link for coaches
- Practices page: "No practices yet" with new practice link (if season exists)
- Equipment page: Has usage summary even when empty
- Onboarding wizard for coaches (4-step modal on first visit)

**Gaps identified:**
1. **Equipment page has no empty state** - Shows usage summary section even with no equipment
2. Dashboard widgets show empty/zero states but lack guidance
3. Athlete view has limited onboarding (no wizard)
4. Empty states don't always have clear CTAs
5. No contextual help or tooltips

**Testing approach:**
1. Create new team, verify onboarding wizard appears
2. Complete onboarding wizard, verify dismissal works
3. Skip onboarding, verify skip persists across sessions
4. Check each empty state page:
   - Roster (empty roster)
   - Practices (no season, then with season but no practices)
   - Equipment (no equipment)
5. Verify CTAs in empty states link to correct creation flows
6. Test athlete view empty states

## Route Analysis

### Public Routes (no auth required)
- `/login` - Login page
- `/signup` - Signup page
- `/auth/callback` - Supabase auth callback
- `/api/auth/callback`, `/api/auth/login`, `/api/auth/signup`, `/api/auth/forgot-password`
- `/join/*` - Join team pages (but redirects to signup if not auth)
- `/report/*` - QR damage reporting

### Protected Routes (auth required)
- `/` - Root redirects to team or create-team
- `/create-team` - Team creation
- `/onboarding` - No-membership state
- `/{teamSlug}/*` - All dashboard routes

### Route Redirect Flow

```
/signup
  --> User signs up --> "Check your email" message
      --> User verifies --> /api/auth/callback --> /
          --> / checks auth --> has team? --> /{teamSlug}
          --> / checks auth --> no team? --> /create-team

/login
  --> User logs in --> /
      --> same as above

/join/{code} (unauthenticated)
  --> redirect to /signup?redirect=/join/{code}
      --> [BUG] signup ignores redirect param
      --> User must manually navigate back to /join/{code}

/join/{code} (authenticated)
  --> Team exists? --> Already member? --> redirect to /{teamSlug}
  --> Team exists? --> Not member? --> Show join form
  --> Team doesn't exist? --> Show "Invalid Team Code" error
```

## Database Schema Relevant to Onboarding

### Key Models

**TeamMember** (legacy, single role per team)
```prisma
model TeamMember {
  id        String   @id @default(uuid())
  teamId    String
  userId    String   // Supabase auth user
  role      Role     // COACH, ATHLETE, PARENT
  createdAt DateTime @default(now())
}
```

**ClubMembership** (new RBAC, multiple roles per club)
```prisma
model ClubMembership {
  id        String   @id @default(uuid())
  clubId    String   // References Team.id
  userId    String
  roles     Role[]   // Array of roles
  isActive  Boolean  @default(true)
  joinedAt  DateTime @default(now())
}
```

**Invitation** (email invites and team code joins)
```prisma
model Invitation {
  id         String           @id @default(uuid())
  teamId     String
  email      String?          // For email invites
  userId     String?          // For team code joins
  role       Role
  status     InvitationStatus // PENDING, ACCEPTED, REVOKED
  invitedBy  String
  athleteId  String?          // For parent invites
  createdAt  DateTime
  acceptedAt DateTime?
}
```

## Critical Issues Found

### Issue 1: Signup redirect parameter ignored (HIGH)

**Location:** `/src/app/(auth)/signup/page.tsx`

**Problem:** The signup page does not read or use the `redirect` query parameter. When users are redirected from `/join/{code}` to signup, they cannot return automatically after signup.

**Impact:** Breaks the join flow for unauthenticated users. User experience is poor - they must remember to navigate back manually.

**Fix:** Read `redirect` param from URL, store in state, redirect after successful signup verification.

### Issue 2: Team creation doesn't create ClubMembership (MEDIUM)

**Location:** `/src/app/api/teams/route.ts`

**Problem:** Team creation only creates TeamMember, not ClubMembership. The dashboard layout has fallback logic but this is inconsistent.

**Impact:** RBAC queries against ClubMembership may fail for team creators until they join through another path.

**Fix:** Create both TeamMember (for legacy compat) and ClubMembership in the transaction.

### Issue 3: "Invitation sent" toast is misleading (LOW)

**Location:** `/src/components/forms/invite-member-form.tsx`

**Problem:** Toast says "Invitation sent" but email is not sent. Coaches may expect invitees to receive email.

**Impact:** Confusion for coaches expecting email delivery.

**Fix:** Change toast to "Invitation created - share the join link with this member" or similar.

## Testing Checklist

### ONBD-01: Signup
- [ ] Valid signup creates account
- [ ] Invalid email shows error
- [ ] Short password shows error
- [ ] Password mismatch shows error
- [ ] Rate limiting triggers at threshold
- [ ] Audit log entry created

### ONBD-02: Email Verification
- [ ] Verification email received
- [ ] Clicking link verifies account
- [ ] Verified user can log in
- [ ] Invalid/expired link shows error

### ONBD-03: Team Creation
- [ ] Team created with valid data
- [ ] Join code generated and unique
- [ ] User becomes COACH
- [ ] Redirect to dashboard works
- [ ] Logo upload works (optional)

### ONBD-04: Invitations
- [ ] Single invite creates record
- [ ] Bulk import works with CSV
- [ ] Duplicate detection works
- [ ] Team code is displayed
- [ ] Join link is displayed

### ONBD-05: Join Team
- [ ] Authenticated user can join via code
- [ ] Unauthenticated user redirected to signup [BUG: redirect not working]
- [ ] Already-member redirected to dashboard
- [ ] Pending request shows correct state
- [ ] Coach can approve request
- [ ] Approved member appears on roster

### ONBD-06: Empty States
- [ ] Onboarding wizard appears for new coach
- [ ] Onboarding can be completed
- [ ] Onboarding can be skipped
- [ ] Roster empty state shown
- [ ] Practices empty state shown (with season)
- [ ] Equipment empty state needed

## Recommendations for Planning

1. **Fix signup redirect handling** - Critical for join flow to work end-to-end
2. **Add ClubMembership to team creation** - Consistency with RBAC model
3. **Update invitation toast message** - Accurate user feedback
4. **Add equipment page empty state** - Consistent with other pages
5. **Document email limitation** - Clear in-app messaging that invites are shared manually
6. **Add copy-to-clipboard** - For team code and join link

## Sources

### Primary (HIGH confidence)
- Direct code audit of `/home/hb/radl/src/**/*.{ts,tsx}`
- Prisma schema at `/home/hb/radl/prisma/schema.prisma`
- Middleware configuration at `/home/hb/radl/src/middleware.ts`

### Secondary (MEDIUM confidence)
- Comments in code indicating v1 limitations (email not implemented)

## Metadata

**Confidence breakdown:**
- Current implementation: HIGH - direct code audit
- Gap identification: HIGH - compared code to requirements
- Testing approach: HIGH - derived from code paths

**Research date:** 2026-01-29
**Valid until:** N/A (code audit, current as of research date)
