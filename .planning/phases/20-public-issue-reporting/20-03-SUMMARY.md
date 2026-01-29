---
phase: 20-public-issue-reporting
plan: 03
subsystem: api
tags: [resend, email, notifications, severity, damage-reports]

# Dependency graph
requires:
  - phase: 20-01
    provides: Schema (ReportSeverity enum), validation (severity, reporterName, honeypot)
provides:
  - Email client with Resend integration and graceful fallback
  - Critical damage alert email template
  - Severity-based notification routing
  - Silent honeypot bot rejection
affects: [20-04 (UI integration)]

# Tech tracking
tech-stack:
  added: [resend client wrapper]
  patterns: [graceful email degradation, conditional severity-based routing]

key-files:
  created:
    - src/lib/email/client.ts
    - src/lib/email/templates/critical-alert.ts
    - src/lib/supabase/admin.ts
  modified:
    - src/app/api/equipment/[id]/damage-reports/route.ts
    - .env.example

key-decisions:
  - "Silent honeypot rejection returns 201 to not reveal detection to bots"
  - "Email gracefully degrades when RESEND_API_KEY or SUPABASE_SERVICE_ROLE_KEY not configured"
  - "Supabase admin client created for user email lookup via service role"
  - "Dynamic import for email template to avoid loading when not needed"

patterns-established:
  - "Graceful email degradation: sendEmail returns { success: false } when not configured instead of throwing"
  - "Severity-based notification routing: conditional prefix [CRITICAL] and email trigger based on severity field"

# Metrics
duration: 5min
completed: 2026-01-26
---

# Phase 20 Plan 03: Notifications & Severity Routing Summary

**Resend email client with graceful degradation, critical severity email alerts to coaches, and silent honeypot bot rejection**

## Performance

- **Duration:** 5 min
- **Started:** 2026-01-26T23:10:09Z
- **Completed:** 2026-01-26T23:14:47Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- Email infrastructure with Resend client that gracefully handles missing API key
- HTML email template for critical damage alerts with equipment details and action button
- API extended with severity-based notification routing (CRITICAL triggers email)
- Honeypot bot protection now silently returns success to not reveal detection
- Notification messages include reporter name for better context

## Task Commits

Each task was committed atomically:

1. **Task 1: Create email client with Resend** - `3fd9a80` (feat)
2. **Task 2: Create critical damage alert email template** - `6cab00e` (feat)
3. **Task 3: Extend damage reports API with new fields and notifications** - `f8def24` (feat)

## Files Created/Modified

- `src/lib/email/client.ts` - Resend email client with lazy initialization and graceful fallback
- `src/lib/email/templates/critical-alert.ts` - HTML email template for critical damage alerts with XSS-safe escaping
- `src/lib/supabase/admin.ts` - Supabase admin client for user email lookup via service role
- `src/app/api/equipment/[id]/damage-reports/route.ts` - Extended with severity-based notifications and email routing
- `.env.example` - Added RESEND_API_KEY, RESEND_FROM_ADDRESS, SUPABASE_SERVICE_ROLE_KEY documentation

## Decisions Made

1. **Silent honeypot rejection** - Returns 201 with fake ID 'blocked' instead of 400 error to not reveal bot detection mechanism
2. **Graceful email degradation** - When RESEND_API_KEY not set, sendEmail returns { success: false, error: 'Email not configured' } rather than throwing
3. **Service role admin client** - Created dedicated admin.ts for Supabase service role operations since user emails require admin API
4. **Dynamic email import** - Used `await import()` for email template to avoid loading Resend SDK when not sending emails
5. **XSS-safe HTML escaping** - Added escapeHtml helper in email template to sanitize user-provided content

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added XSS protection to email template**
- **Found during:** Task 2 (email template creation)
- **Issue:** Plan template interpolated user input directly into HTML without escaping
- **Fix:** Added escapeHtml() function to sanitize teamName, equipmentName, location, description, category, reporterName
- **Files modified:** src/lib/email/templates/critical-alert.ts
- **Verification:** Special characters like `<script>` are escaped to `&lt;script&gt;`
- **Committed in:** 6cab00e (Task 2 commit)

**2. [Rule 3 - Blocking] Created Supabase admin helper for user email lookup**
- **Found during:** Task 3 (email notification implementation)
- **Issue:** Plan suggested using supabaseAdmin but no admin client existed in codebase
- **Fix:** Created src/lib/supabase/admin.ts with getSupabaseAdmin() and getUserEmailsByIds() helpers
- **Files modified:** src/lib/supabase/admin.ts (new file)
- **Verification:** getUserEmailsByIds returns empty array when service role key not configured
- **Committed in:** f8def24 (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (1 missing critical security, 1 blocking)
**Impact on plan:** Both fixes essential for security (XSS prevention) and functionality (user email lookup). No scope creep.

## Issues Encountered

None - plan executed smoothly with auto-fixes integrated.

## User Setup Required

**External services require manual configuration.** To enable email notifications:

1. **Resend API Key:**
   - Sign up at https://resend.com
   - Create API key in dashboard
   - Add to `.env.local`: `RESEND_API_KEY=re_xxxxx`
   - Optionally set `RESEND_FROM_ADDRESS` (defaults to `Radl <onboarding@resend.dev>`)

2. **Supabase Service Role Key (for user email lookup):**
   - Get from Supabase Dashboard -> Settings -> API -> service_role key
   - Add to `.env.local`: `SUPABASE_SERVICE_ROLE_KEY=eyJxxxxxx`

**Note:** Both are optional - email notifications gracefully degrade when not configured.

## Next Phase Readiness

- Email infrastructure ready for other notification types
- API accepts all new fields (severity, category, reporterName)
- Ready for Phase 20-04: Public UI (form and QR code flow)

---
*Phase: 20-public-issue-reporting*
*Completed: 2026-01-26*
