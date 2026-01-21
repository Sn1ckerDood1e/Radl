# Codebase Concerns

**Analysis Date:** 2026-01-20

## Tech Debt

**Email Notification System Not Implemented:**
- Issue: Invitations are created but no email is sent to invitees. Coaches must manually share the join link. This is a critical usability gap.
- Files: `src/app/api/invitations/route.ts` (line 161), `src/app/api/invitations/bulk/route.ts` (line 139)
- Impact: Bulk invite feature (CSV import) is essentially non-functional for the intended use case. Athletes/parents cannot be invited via email.
- Fix approach: Integrate Resend email service (referenced as v2 requirement in code). Add email sending after successful invitation creation. Requires Resend API key in environment variables.

**Settings Page Complexity:**
- Issue: `src/app/(dashboard)/[teamSlug]/settings/page.tsx` is 459 lines with multiple independent state management concerns (notifications, colors, theme) mixed together.
- Files: `src/app/(dashboard)/[teamSlug]/settings/page.tsx`
- Impact: Difficult to test, maintain, and extend. Multiple simultaneous API calls with separate loading/error states increase chance of UI state inconsistencies.
- Fix approach: Split into separate sub-components: `<NotificationSettings>`, `<ColorSettings>`, `<AppearanceSettings>`. Extract shared error/loading UI patterns.

**Component Size Hotspots:**
- Issue: Several components exceed 300 lines and combine form logic with API communication
- Files:
  - `src/components/equipment/equipment-form.tsx` (325 lines)
  - `src/components/forms/csv-import-form.tsx` (287 lines)
  - `src/components/equipment/damage-report-form.tsx` (275 lines)
  - `src/components/equipment/equipment-detail.tsx` (243 lines)
- Impact: Hard to test, high cognitive load, increased bug potential
- Fix approach: Extract submission logic into custom hooks, split large forms into smaller sub-components

**Duplicated Claims Fetching Pattern:**
- Issue: Every API route implements identical JWT decode + database fallback logic (repeated in 10+ files)
- Files:
  - `src/app/api/equipment/route.ts` (lines 14-37)
  - `src/app/api/team-settings/route.ts` (lines 21-43)
  - `src/app/api/invitations/[id]/route.ts` (lines 13-36)
  - And 7+ more
- Impact: DRY violation, maintenance burden, inconsistency risk if fallback logic changes
- Fix approach: Extract into `src/lib/auth/get-claims-with-fallback.ts` as reusable utility

**Missing Input Sanitization:**
- Issue: User-provided data (team names, equipment names, etc.) written directly to database without trimming or normalizing
- Files: `src/app/api/teams/route.ts`, `src/app/api/equipment/route.ts`, form components
- Impact: Can create inconsistent data (leading/trailing whitespace), database pollution, poor UX
- Fix approach: Add `.trim()` calls on all string inputs before validation/storage

## Known Bugs

**Race Condition in Team Join Flow:**
- Symptoms: User can join the same team twice if two requests are sent simultaneously
- Files: `src/app/api/join/route.ts` (lines 166-181)
- Trigger:
  1. User clicks "join" button twice rapidly
  2. Both requests pass the `existingMember` check before either creates the TeamMember
  3. Both succeed in creating a duplicate TeamMember entry
- Workaround: Database constraint `@@unique([teamId, userId])` prevents actual duplicate, but first request succeeds and second gets 500 error instead of proper conflict response
- Fix approach: Wrap both the existingMember check and create in a transaction with proper error handling

**Settings Save Success Message Dismissal:**
- Symptoms: Success alerts ("Settings saved successfully") persist for exactly 3 seconds regardless of user action
- Files: `src/app/(dashboard)/[teamSlug]/settings/page.tsx` (lines 110-111, 141)
- Trigger: User saves settings, alert appears, user doesn't interact with anything
- Impact: UX confusion - user can't dismiss alert manually
- Fix approach: Add onClick handler to alerts to allow manual dismissal, or keep toast system with auto-dismiss

**Inconsistent Error Handling in Forms:**
- Symptoms: Some form errors silently console.log, others show to user, some propagate as exceptions
- Files: `src/components/forms/create-team-form.tsx` (line 83), `src/components/equipment/damage-report-form.tsx` (line 76)
- Trigger: Asset upload failures (logo, photos) are logged but not shown to user in some cases
- Impact: Silent failures - users don't know operations partially failed
- Fix approach: Standardize error handling: always show user-facing message AND console.error for debugging

## Security Considerations

**Overly Broad Anonymous Access to Damage Reporting:**
- Risk: Damage report endpoints allow completely anonymous submissions with minimal validation. QR codes point to public URLs.
- Files: `src/app/api/equipment/[id]/damage-reports/route.ts` (lines 38-48), `src/middleware.ts` (line 15-16)
- Current mitigation: Equipment ID is UUID (not predictable), but still allows spam/abuse
- Recommendations:
  - Add rate limiting per IP on damage report endpoints
  - Consider requiring JWT auth OR a valid equipment access code
  - Log all anonymous submissions for abuse detection
  - Add CAPTCHA for truly public reporting

**JWT Claims Used for Authorization Without Verification:**
- Risk: Code relies on JWT claims (team_id, user_role) from decoded token, but jwt-decode doesn't verify signature
- Files: Multiple API routes decode JWT and use claims directly for authorization
- Current mitigation: Supabase getUser() call verifies auth separately, so token is valid, but claims could theoretically be stale
- Recommendations:
  - Add comment explaining reliance on getUser() verification
  - Consider adding claim refresh on each request
  - Add logging of role-based access denials

**Email Invite Validation Only Matches Current User Email:**
- Risk: If user changes email in Supabase after invitation sent, they can't accept the invite. Invite stays pending forever.
- Files: `src/app/api/join/route.ts` (lines 85-91)
- Current mitigation: Users could contact admin to re-send invite to new email
- Recommendations:
  - Allow coaches to resend invitations to different email
  - Add expiry to invitations (currently permanent)
  - Allow users to look up and accept invitations by token instead of email

**Team Code Join Lacks Rate Limiting:**
- Risk: Attacker can brute-force team join codes (only 8 character alphanumeric = ~2.8 trillion possibilities, but 26+10 = 36^8 ≈ 2.8 trillion, still feasible)
- Files: `src/app/api/join/route.ts` (lines 155-157)
- Current mitigation: Each attempt creates a pending invitation (DB write), so resource cost exists
- Recommendations:
  - Add rate limiting: max 10 join attempts per IP per hour
  - Consider requiring email verification for team code joins
  - Add admin notification for suspicious join patterns

**Missing CORS/CSRF Protection on API Routes:**
- Risk: API routes accept requests from any origin
- Files: All `/api/*` routes
- Current mitigation: Requires authentication via Supabase JWT
- Recommendations:
  - Verify Origin header on state-changing requests (POST/PATCH/DELETE)
  - Add CSRF token for form submissions if not already handled by Next.js
  - Document expected frontend origin in development

**Sensitive User Data in Notifications:**
- Risk: Damage report notifications include equipment name and damage description in the message field - exposed to all recipient coaches
- Files: `src/app/api/equipment/[id]/damage-reports/route.ts` (lines 90-91)
- Impact: Can't limit who sees specific reports by type/severity
- Recommendations:
  - Add damage severity level to DamageReport model
  - Only notify specific coaches based on equipment category/type preferences
  - Consider audit logging for sensitive equipment damage

## Performance Bottlenecks

**N+1 Queries in Roster Loading:**
- Problem: Roster page fetches team members, then likely makes per-athlete queries for profile details
- Files: `src/app/(dashboard)/[teamSlug]/roster/page.tsx`, `src/app/api/athletes/route.ts`
- Cause: Review of roster loading patterns shows athleteProfile is included in findMany but components may make additional queries
- Improvement path:
  - Verify all athlete queries use `include: { athleteProfile: true }`
  - Add query caching at route level if same data requested multiple times
  - Consider pagination for large teams (>100 members)

**Synchronous Dashboard Layout Queries:**
- Problem: Dashboard layout runs multiple sequential database queries on every page load
- Files: `src/app/(dashboard)/layout.tsx` (lines 21-45)
- Cause: First checks JWT claims, then fallback queries TeamMember, then queries Team separately
- Impact: 2-3 database roundtrips per page load. Slow for users with high latency.
- Improvement path:
  - Cache Team data in Supabase session/context to avoid re-query
  - Use single optimized query that fetches both TeamMember and Team together
  - Consider revalidate at layout boundary (currently on every request)

**No Query Result Caching:**
- Problem: Equipment lists, roster data fetched fresh on every page view despite being static-friendly
- Files: All GET `/api/*` routes
- Cause: No cache headers or revalidation strategy
- Impact: Unnecessary database load for stable data
- Improvement path:
  - Add `revalidate` time or `no-store` to route handlers
  - Use Next.js data cache for stable queries
  - Implement client-side SWR/React Query for refetching

**Large CSV Parse Without Streaming:**
- Problem: CSV import parses entire file into memory before processing
- Files: `src/components/forms/csv-import-form.tsx` (line 44)
- Impact: Large CSV files (>10MB) could cause browser memory issues
- Improvement path:
  - Add file size validation (currently done)
  - Consider streaming CSV parse with papaparse
  - Implement chunked upload/processing for very large files
  - Add progress indicator for parse + upload

## Fragile Areas

**Join Request Approval Flow:**
- Files: `src/app/api/invitations/[id]/route.ts` (PATCH handler), `src/app/(dashboard)/[teamSlug]/invitations/invitations-client.tsx`
- Why fragile: Complex state transitions (PENDING → ACCEPTED, with athlete profile creation), multiple actors (user requesting, coach approving), potential race conditions if coach and user interact simultaneously
- Safe modification:
  - Always wrap state changes in transactions
  - Test race conditions: simultaneous approve + revoke
  - Add idempotency checks - handle double-approvals gracefully
- Test coverage: Invitation approval/rejection flows need explicit integration tests

**Equipment Damage Report Notification System:**
- Files: `src/app/api/equipment/[id]/damage-reports/route.ts` (lines 63-95), `src/app/(dashboard)/[teamSlug]/settings/page.tsx` (notification recipient selection)
- Why fragile: Creates notifications but has no retry logic if notification creation fails after report is created. No deduplication if same report triggers multiple notifications. Settings changes don't audit who changed what.
- Safe modification:
  - Make notification creation errors non-blocking (log but don't fail the main request)
  - Add unique constraint on (report_id, user_id) to prevent duplicate notifications
  - Add audit logging to team settings changes
- Test coverage: Test scenarios where notification creation fails, duplicate reports, bulk damage reports

**Supabase Auth Token Refresh:**
- Files: `src/middleware.ts`, `src/lib/auth/authorize.ts`
- Why fragile: Token refresh happens in middleware but JWT claims might still be stale in API routes. Fallback to database works but adds latency.
- Safe modification:
  - Document the intended flow: middleware refreshes, then claims are read in route handlers
  - Add optional `reauth: true` parameter to force refresh in critical endpoints
  - Monitor for claims mismatches in error logs
- Test coverage: Test JWT expiry + refresh scenarios, concurrent requests during token rotation

## Scaling Limits

**Single Database for Multi-Tenant System:**
- Current capacity: Design supports unlimited teams but no tenant isolation at database level
- Limit: If one large team's queries become expensive, they slow down all other teams
- Scaling path:
  - Add database connection pooling (PgBouncer) if not already configured
  - Implement query analysis for slow queries per team
  - Consider sharding by team_id if any single team exceeds 10k members or 100k equipment records
  - Add read replicas for reporting/analytics queries

**No Image/Asset Size Limits:**
- Current capacity: Supabase storage bucket size limits apply, but no per-user quotas
- Limit: One user could upload massive photos, filling storage quota for entire team
- Scaling path:
  - Add asset size validation before upload (currently missing for photos)
  - Implement per-team storage quota
  - Add image optimization/resizing pipeline
  - Consider CDN caching for frequently accessed team logos

**Synchronous Email Sending (When Implemented):**
- Current capacity: No email sending exists yet (TODO item)
- Limit: Once implemented, bulk invites will be synchronous, blocking request until all emails sent
- Scaling path:
  - Queue email sending to job queue (Bull, RabbitMQ, or Resend API background jobs)
  - Return success immediately, send emails asynchronously
  - Add retry logic for failed email sends
  - Track email delivery status in Invitation model

## Dependencies at Risk

**Prisma v6 - New Major Version:**
- Risk: Recent major upgrade (v5→v6), may have breaking changes in edge cases. Wasm compiler in generated files.
- Impact: Any Prisma breaking changes require migration work across entire data layer
- Migration plan: Monitor Prisma releases, pin version until stable track record. Consider Prisma ORM alternatives (Drizzle) for future projects if issues arise.

**jwt-decode Library:**
- Risk: Library explicitly doesn't verify JWT signatures. Security depends on Supabase auth verification being called first.
- Impact: If auth verification is ever skipped, JWT claims become untrusted
- Migration plan: Consider using `jose` library instead, which supports signature verification. Add comment at jwt-decode import explaining security model.

**Papaparse for CSV Processing:**
- Risk: CSVs can contain malicious formulas (Excel injection). Papaparse doesn't sanitize.
- Impact: If CSVs with formula injection are processed, they could be re-exported as dangerous
- Migration plan: Add CSV sanitization step to strip leading `=`, `+`, `@`, `-` characters from cells before storing

## Missing Critical Features

**No Equipment Availability/Booking System:**
- Problem: Equipment can be marked ACTIVE/INACTIVE but there's no reservation or booking feature. No way to check if equipment is currently available for use.
- Blocks: Can't prevent scheduling conflicts on shared equipment. Can't track equipment utilization.
- Impact: In a rowing context, essential for managing shell rotations and training schedules
- Priority: Medium (not blocking core functionality but limits usefulness)

**No Audit Logging:**
- Problem: Who deleted equipment? Who changed team settings? When did coach approve an athlete? No audit trail.
- Blocks: Can't investigate disputes, can't understand what changed and when
- Impact: Critical for teams with governance/compliance needs
- Priority: High (should be added before team-wide deployment)

**No Bulk Export:**
- Problem: Roster data can't be exported to CSV. Manual copy-paste required for reports.
- Blocks: Integration with external tools, reporting, data portability
- Impact: Reduces usefulness for coaches who maintain external tracking
- Priority: Low (nice-to-have)

**No Two-Factor Authentication:**
- Problem: Supabase handles auth but 2FA not mentioned in setup. Single password compromise = account takeover.
- Blocks: Can't secure coach/admin accounts with 2FA
- Impact: Medium risk - depends on deployment context
- Priority: Medium (should add before production multi-team deployment)

**No Data Retention Policies:**
- Problem: Damage reports, notifications, athlete data never deleted. No GDPR right-to-be-forgotten support.
- Blocks: Can't comply with data privacy regulations
- Impact: Legal risk for EU-based teams or teams with EU users
- Priority: High (critical for compliance)

## Test Coverage Gaps

**Authorization Checks Not Systematically Tested:**
- What's not tested: Role-based access control across all endpoints. Can an athlete accidentally call coach-only endpoints? Can a parent access another team's data?
- Files: All `/api/*` routes (especially `src/app/api/equipment/[id]/route.ts`, `src/app/api/team-settings/route.ts`, `src/app/api/invitations/[id]/route.ts`)
- Risk: Authorization bypass vulnerabilities slip through development
- Priority: High - should have integration test suite covering RBAC matrices

**Concurrent Operation Race Conditions:**
- What's not tested: Two simultaneous requests modifying same resource. Transaction isolation is implemented but not verified.
- Files: `src/app/api/join/route.ts` (team join duplicate), invitation approval
- Risk: Data corruption under concurrent load
- Priority: High - needs automated race condition testing

**CSV Import Edge Cases:**
- What's not tested: Malformed CSV, special characters in names/emails, duplicate handling, very large files, empty files
- Files: `src/components/forms/csv-import-form.tsx`
- Risk: User data corruption from malformed import
- Priority: Medium - critical path but partially validated

**Error Recovery Flows:**
- What's not tested: Network failures during form submission, timeouts, partial failures (e.g., team created but logo upload failed)
- Files: Form submission handlers across all components
- Risk: Orphaned data, unclear user state after failure
- Priority: Medium - affects reliability

**Invitation Expiry and Cleanup:**
- What's not tested: Behavior of very old invitations, revoked invitation access attempts, expired invite access
- Files: `src/app/api/join/route.ts`, `src/app/api/invitations/[id]/route.ts`
- Risk: Stale data accumulation, security issues if very old invitations are never cleaned
- Priority: Low-Medium - affects data hygiene but not core functionality

---

*Concerns audit: 2026-01-20*
