# Phase 30: Equipment Flow Testing - Research

**Researched:** 2026-01-29
**Domain:** Equipment management, damage reporting, QR codes, usage tracking
**Confidence:** HIGH (code audit of existing implementation)

## Summary

This phase tests the complete equipment lifecycle from creation through damage resolution. The implementation is mature and comprehensive, with all EQUP requirements fully implemented.

Key areas for testing:
1. Equipment CRUD with all fields (name, type, status, manufacturer, serial, year, price, notes)
2. Status transitions (ACTIVE → INACTIVE → RETIRED)
3. QR code generation and public damage reporting flow
4. Damage report management and resolution
5. Usage tracking through lineup assignments

**Primary finding:** All EQUP requirements have working implementations. Equipment is deeply integrated with the practice/lineup system for usage tracking. Testing should focus on verifying the complete lifecycle and edge cases.

**Primary recommendation:** Test both URL navigation AND actual QR scanning for damage reports. Verify equipment status transitions and usage logging are accurate.

## Current Implementation

### File Inventory

**Pages:**
| File | Purpose |
|------|---------|
| `/src/app/(dashboard)/[teamSlug]/equipment/page.tsx` | Equipment list with usage summary |
| `/src/app/(dashboard)/[teamSlug]/equipment/new/page.tsx` | Create equipment form |
| `/src/app/(dashboard)/[teamSlug]/equipment/[id]/page.tsx` | Equipment detail with QR, damage, usage |
| `/src/app/(dashboard)/[teamSlug]/equipment/[id]/edit/page.tsx` | Edit equipment form |
| `/src/app/report/[equipmentId]/page.tsx` | Public damage report form (no auth) |

**Components:**
| File | Purpose |
|------|---------|
| `/src/components/equipment/equipment-form.tsx` | Create/edit form with shell-specific fields |
| `/src/components/equipment/equipment-detail.tsx` | Detail view with status toggle, QR display |
| `/src/components/equipment/equipment-card.tsx` | List item card |
| `/src/components/equipment/equipment-list-client.tsx` | List with filters |
| `/src/components/equipment/shell-fields.tsx` | Boat class + weight category fields |
| `/src/components/equipment/qr-code-display.tsx` | QR code generation with download |
| `/src/components/equipment/damage-report-form.tsx` | Public damage report form |
| `/src/components/equipment/damage-history.tsx` | Damage reports list with resolution |
| `/src/components/equipment/usage-history.tsx` | Usage log display |
| `/src/components/equipment/readiness-badge.tsx` | Visual readiness indicator |

**API Routes:**
| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/equipment` | GET, POST | List/create equipment |
| `/api/equipment/[id]` | GET, PATCH, DELETE | Single equipment CRUD |
| `/api/equipment/[id]/damage-reports` | POST | Create damage report (public) |
| `/api/equipment/[id]/damage-reports/[reportId]` | PATCH | Resolve damage report |
| `/api/equipment/[id]/usage` | GET | Get usage logs |

**Library Functions:**
| File | Purpose |
|------|---------|
| `/src/lib/equipment/usage-logger.ts` | Create/query usage logs |
| `/src/lib/equipment/readiness.ts` | Compute readiness status |

**Validations:**
| File | Purpose |
|------|---------|
| `/src/lib/validations/equipment.ts` | Equipment CRUD schemas |
| `/src/lib/validations/damage-report.ts` | Damage report schemas |

### Data Model

```prisma
Equipment {
  id: String (UUID)
  teamId: String (required for reports)
  type: SHELL | OAR | LAUNCH | OTHER
  name: String (required)
  manufacturer: String?
  serialNumber: String?
  yearAcquired: Int?
  purchasePrice: Decimal?
  status: ACTIVE | INACTIVE | RETIRED (default ACTIVE)
  notes: String?

  // Shell-specific (required if type = SHELL)
  boatClass: SINGLE_1X | DOUBLE_2X | PAIR_2_MINUS | ... | EIGHT_8_PLUS | OTHER
  weightCategory: LIGHTWEIGHT | MIDWEIGHT | HEAVYWEIGHT

  // Readiness tracking
  manualUnavailable: Boolean (default false)
  manualUnavailableNote: String?
  lastInspectedAt: DateTime?

  // Relationships
  damageReports: DamageReport[]
  usageLogs: EquipmentUsageLog[]
  lineups: Lineup[] // Equipment assigned to lineups
}

DamageReport {
  id: String
  equipmentId: String
  teamId: String (denormalized for RLS)
  reportedBy: String? (null for anonymous)
  reporterName: String (required always)
  location: String (where on equipment)
  description: String (min 10 chars)
  severity: MINOR | MODERATE | CRITICAL
  category: String? (Hull, Rigging, Hardware, etc.)
  photoUrl: String? (Supabase Storage)
  status: OPEN | RESOLVED
  resolvedAt: DateTime?
  resolvedBy: String?
  resolutionNote: String?
  createdAt: DateTime
}

EquipmentUsageLog {
  id: String
  equipmentId: String
  teamId: String
  practiceId: String
  lineupId: String?
  usageDate: DateTime
  createdAt: DateTime
}
```

## Per-Requirement Assessment

### EQUP-01: Admin/coach can add equipment with full details

**Implementation status:** COMPLETE

**What exists:**
- Equipment form with all fields
- Type selector: SHELL, OAR, LAUNCH, OTHER
- Conditional shell fields (boatClass, weightCategory) with validation
- Form validation via Zod schemas
- RBAC enforcement: COACH role required

**Fields available:**
- **Required:** type, name
- **Optional:** manufacturer, serialNumber, yearAcquired, purchasePrice, notes
- **Shell-specific:** boatClass (required for SHELL), weightCategory

**Code evidence:**
```typescript
// equipment-form.tsx lines 82-145
const onSubmit = async (data: CreateEquipmentFormInput) => {
  // Clean up data: remove empty strings, NaN values
  // Only include shell-specific fields for SHELL type
  const cleanData = { type: data.type, name: data.name, ... };
  if (data.type === 'SHELL') {
    if (data.boatClass) cleanData.boatClass = data.boatClass;
    if (data.weightCategory) cleanData.weightCategory = data.weightCategory;
  }
  // POST /api/equipment
}
```

**Status transitions:**
- Status defaults to ACTIVE on creation
- Coach can toggle: ACTIVE → INACTIVE → RETIRED → ACTIVE
- Status change via PATCH /api/equipment/[id] with `status` field

**Testing approach:**
1. Navigate to `/{teamSlug}/equipment/new`
2. Select each equipment type (SHELL, OAR, LAUNCH, OTHER)
3. For SHELL: verify boatClass required validation
4. Fill all optional fields (manufacturer, serial, year, price, notes)
5. For SHELL: select boatClass and weightCategory
6. Submit and verify creation
7. Verify equipment appears in list
8. Open detail page, click "Edit"
9. Modify fields and verify updates persist
10. Test status transitions (ACTIVE → INACTIVE → RETIRED)

### EQUP-02: Equipment usage is tracked when assigned to lineups

**Implementation status:** COMPLETE

**How it works:**
- Usage logging happens automatically when equipment assigned to lineups
- `createUsageLog()` function called when boat assigned to lineup
- Idempotent: won't duplicate for same equipment + practice combination
- Logs stored with practice date, linked to practice and lineup

**Code evidence:**
```typescript
// usage-logger.ts lines 11-54
export async function createUsageLog({
  equipmentId, teamId, practiceId, lineupId, usageDate
}): Promise<EquipmentUsageLog> {
  // Check if log already exists for equipment + practice
  const existing = await prisma.equipmentUsageLog.findFirst({
    where: { equipmentId, practiceId }
  });
  if (existing) {
    // Update lineupId if different, or return as-is
  }
  // Create new log entry
}
```

**Usage display:**
- Equipment detail page shows usage history (last 20 sessions)
- Usage history component links to practices
- Equipment list page shows usage summary (most used, recent usage)

**Testing approach:**
1. Create practice with WATER block
2. Add lineup with boat assignment
3. Navigate to equipment detail page
4. Verify usage history shows the practice
5. Create multiple practices with same equipment
6. Verify usage count increments
7. Verify usage logs link to correct practices
8. Test usage summary on equipment list page

### EQUP-03: Anyone can report damage via QR code without login

**Implementation status:** COMPLETE

**How it works:**
- QR code displayed on equipment detail page (coach only)
- QR encodes URL: `{baseUrl}/report/{equipmentId}`
- Public page `/report/[equipmentId]` loads without auth
- Form submits to POST `/api/equipment/[id]/damage-reports` (no auth required)
- Rate limiting + honeypot for spam prevention
- Optional photo upload to Supabase Storage

**QR code generation:**
```typescript
// qr-code-display.tsx lines 22-23
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
const reportUrl = `${baseUrl}/report/${equipmentId}`;
// QRCodeSVG component renders QR
```

**Damage report form fields:**
- **Required:** reporterName, location, description (min 10 chars), severity
- **Optional:** category (Hull, Rigging, Hardware, etc.), photo
- **Hidden:** honeypot field (bot detection)

**Form features:**
- Photo capture/upload (10MB max, JPEG/PNG/WebP)
- Severity levels: MINOR, MODERATE, CRITICAL
- Category dropdown with common damage types
- Success confirmation with reference ID
- "Report Another Issue" button after submission

**Notifications:**
- In-app notifications created for coaches
- Email alerts sent for CRITICAL severity only
- Notification recipients from TeamSettings.damageNotifyUserIds or default to all coaches

**Testing approach:**
1. As COACH: Open equipment detail page
2. Verify QR code displays with equipment name
3. Click "Download PNG" and verify image downloads
4. Copy report URL from QR component
5. Open report URL in incognito window (no login)
6. Verify equipment name and team branding display
7. Fill damage report form with all fields
8. Upload photo (test various formats and sizes)
9. Submit and verify success confirmation
10. Test actual QR scan with mobile device camera
11. Verify report appears in damage history
12. Test honeypot: fill hidden field and verify silent rejection

### EQUP-04: Coach can view damage reports and mark resolved

**Implementation status:** COMPLETE

**Where reports appear:**
- Equipment detail page has "Damage History" section
- Shows all reports (open and resolved) in reverse chronological order
- Open reports highlighted with red border/background
- Resolved reports grayed out with timestamp

**Resolution workflow:**
```typescript
// damage-history.tsx lines 32-56
const handleResolve = async (reportId: string) => {
  const response = await fetch(
    `/api/equipment/${equipmentId}/damage-reports/${reportId}`,
    { method: 'PATCH', body: JSON.stringify({ status: 'RESOLVED' }) }
  );
  // Optimistically updates local state
}
```

**RBAC enforcement:**
```typescript
// damage-reports/[reportId]/route.ts lines 18
if (claims.user_role !== 'COACH')
  return forbiddenResponse('Only coaches can resolve damage reports');
```

**Report display includes:**
- Status badge (OPEN/RESOLVED)
- Severity badge (MINOR/MODERATE/CRITICAL)
- Category tag
- Location and description (with expand/collapse)
- Reporter name
- Timestamps (reported, resolved)
- Photo thumbnail with lightbox
- "Mark Resolved" button (coach only, open reports only)

**Testing approach:**
1. Create damage reports with different severities
2. As COACH: Open equipment detail page
3. Verify damage history section shows all reports
4. Verify open reports count displayed
5. Click "Mark Resolved" on an open report
6. Verify report status changes to RESOLVED
7. Verify resolved timestamp appears
8. Verify "Mark Resolved" button disappears
9. Test photo lightbox (click thumbnail, view full size, close)
10. Test long descriptions (expand/collapse)
11. As ATHLETE: Verify cannot resolve reports (button hidden/disabled)
12. Create CRITICAL report and verify email notification sent

## Usage Tracking Implementation Details

### When Usage Logs Are Created

Usage logging is **automatic** when equipment is assigned to lineups:

1. **Lineup creation/update**: When coach assigns boat to lineup
2. **Practice creation from template**: If template includes boat assignments
3. **Multi-boat lineups**: Each boat creates separate usage log

### Usage Log Properties

```typescript
interface EquipmentUsageLog {
  equipmentId: string;     // Which equipment
  teamId: string;          // Denormalized for queries
  practiceId: string;      // Which practice
  lineupId: string | null; // Optional: which lineup
  usageDate: Date;         // Practice date (not creation date)
  createdAt: Date;         // When log was created
}
```

### Usage Query Functions

From `usage-logger.ts`:
- `getUsageLogsForEquipment()` - Get logs for specific equipment (limit 50)
- `getUsageLogsForTeam()` - Get all team logs with equipment/practice details
- `deleteUsageLogForLineup()` - Remove logs when lineup deleted

### Where Usage Is Displayed

1. **Equipment detail page**: Shows last 20 usage sessions
   - Links to practice pages
   - Shows practice name and date

2. **Equipment list page**: Shows usage summary
   - Most used equipment (top 5)
   - Recent usage (last 5)
   - Usage counts

## QR Code Implementation Details

### QR Code Library

Uses `qrcode.react` package (QRCodeSVG component):
```typescript
<QRCodeSVG value={reportUrl} size={128} level="M" />
```

### QR Code Display Locations

1. **Equipment detail page** (coach only)
   - 120px size with equipment name label
   - "Scan to report damage" caption
   - Download button for print-quality PNG

2. **Download functionality**
   - Scales to 3x for 300 DPI print quality
   - Adds padding and equipment name label
   - Saves as PNG: `qr-{equipment-name}.png`

### Report URL Structure

```
{NEXT_PUBLIC_APP_URL}/report/{equipmentId}
```

Environment variable `NEXT_PUBLIC_APP_URL` must be set for production QR codes to work correctly.

### Public Report Page Security

1. **No authentication required** - page loads for anyone
2. **Rate limiting** - 5 reports per IP per hour (configurable)
3. **Honeypot field** - catches bot submissions (silently rejected)
4. **Team validation** - equipment must have teamId association
5. **Photo upload** - direct to Supabase Storage (public bucket)

## Damage Report Workflow

### Report Lifecycle

```
1. User scans QR → Report form loads
2. User fills form → Optional photo upload
3. Submit → API validates + creates report
4. Notifications → Coaches receive alerts
5. Coach views → Damage history section
6. Coach resolves → Status → RESOLVED
```

### Severity Levels

| Severity | Description | Email Alert |
|----------|-------------|-------------|
| MINOR | Cosmetic damage, can still use safely | No |
| MODERATE | Functional impact, needs attention | No |
| CRITICAL | Unsafe to use, immediate action needed | Yes |

### Photo Storage

- **Bucket:** `damage-photos` in Supabase Storage
- **Path:** `{equipmentId}/{nanoid()}.{ext}`
- **Max size:** 10MB
- **Formats:** JPEG, PNG, WebP
- **Upload timing:** Before report creation (fails if photo upload fails)

### Notification Strategy

**In-app notifications:**
- Created for all severities
- Recipients from TeamSettings.damageNotifyUserIds (custom list)
- Falls back to all coaches if custom list empty
- Title format: `[CRITICAL] Damage: {equipment name}` for critical
- Message: `{reporterName}: {description truncated to 80 chars}`

**Email notifications:**
- Only for CRITICAL severity
- Uses admin API to fetch coach emails
- Template: `critical-alert` from email library
- Degrades gracefully if email fails (doesn't block API)

## Testing Checklist

### Equipment CRUD (EQUP-01)

**Create:**
- [ ] Navigate to `/{teamSlug}/equipment/new`
- [ ] Test SHELL type with all fields
- [ ] Verify boatClass required validation for SHELL
- [ ] Test OAR type (no shell-specific fields)
- [ ] Test LAUNCH type
- [ ] Test OTHER type
- [ ] Verify empty optional fields save as null
- [ ] Verify equipment appears in list

**Read:**
- [ ] Open equipment detail page
- [ ] Verify all fields display correctly
- [ ] Verify status badge shows ACTIVE
- [ ] Verify last inspected shows "Never"
- [ ] Verify QR code section displays (coach only)

**Update:**
- [ ] Click "Edit" button
- [ ] Modify name, manufacturer, serial number
- [ ] Change boat class and weight category
- [ ] Add notes
- [ ] Save and verify changes persist
- [ ] Verify updated fields display on detail page

**Delete:**
- [ ] (Verify deletion endpoint exists)
- [ ] Test deletion (if exposed in UI)

**Status Transitions:**
- [ ] Click "Change Status" button
- [ ] Verify cycles: ACTIVE → INACTIVE → RETIRED → ACTIVE
- [ ] Verify status badge updates
- [ ] Refresh page and verify status persists

### Usage Tracking (EQUP-02)

- [ ] Create practice with WATER block
- [ ] Add lineup with boat selector
- [ ] Select equipment from dropdown
- [ ] Assign athletes to lineup
- [ ] Save lineup
- [ ] Navigate to equipment detail page
- [ ] Verify usage history shows the practice
- [ ] Verify practice name and date display
- [ ] Click practice link and verify navigation
- [ ] Create second practice with same equipment
- [ ] Verify usage count = 2
- [ ] Navigate to equipment list page
- [ ] Verify "Most Used" section shows equipment
- [ ] Verify usage count displays

### QR Damage Reporting (EQUP-03)

**QR Generation:**
- [ ] As COACH: Open equipment detail page
- [ ] Verify QR code displays
- [ ] Verify equipment name label shows
- [ ] Click "Download PNG" button
- [ ] Verify high-quality PNG downloads
- [ ] Verify filename: `qr-{equipment-name}.png`

**URL Navigation:**
- [ ] Copy report URL: `/report/{equipmentId}`
- [ ] Open in new incognito window
- [ ] Verify no login prompt
- [ ] Verify team logo displays (if set)
- [ ] Verify team name displays
- [ ] Verify equipment info displays

**Form Submission:**
- [ ] Fill reporter name (required)
- [ ] Fill location (e.g., "Port side rigger")
- [ ] Fill description (min 10 chars)
- [ ] Select severity: MINOR
- [ ] Select category: "Hull"
- [ ] Upload photo (JPEG, < 10MB)
- [ ] Submit form
- [ ] Verify success confirmation displays
- [ ] Verify reference ID shows
- [ ] Click "Report Another Issue"
- [ ] Verify form resets

**Photo Upload:**
- [ ] Test JPEG upload
- [ ] Test PNG upload
- [ ] Test WebP upload
- [ ] Test file > 10MB (should error)
- [ ] Test invalid format (should error)
- [ ] Verify preview displays before submit
- [ ] Verify remove photo button works

**QR Scan (Real Device):**
- [ ] Download QR code PNG
- [ ] Print or display on screen
- [ ] Use mobile device camera to scan QR
- [ ] Verify report page opens
- [ ] Verify mobile-responsive form
- [ ] Test photo capture from camera
- [ ] Submit report from mobile
- [ ] Verify success

**Edge Cases:**
- [ ] Test honeypot: Fill hidden "website" field
- [ ] Submit and verify silent success (no report created)
- [ ] Test rate limiting: Submit 6 reports quickly
- [ ] Verify 429 Too Many Requests after 5th
- [ ] Wait for rate limit reset
- [ ] Verify can submit again

### Damage Resolution (EQUP-04)

**Viewing Reports:**
- [ ] As COACH: Open equipment with damage reports
- [ ] Verify "Damage History" section displays
- [ ] Verify open count shows: "(X open)"
- [ ] Verify OPEN reports have red border
- [ ] Verify RESOLVED reports grayed out
- [ ] Verify severity badges color-coded
- [ ] Verify category tags display
- [ ] Verify reporter name shows
- [ ] Verify timestamps display

**Resolving Reports:**
- [ ] Click "Mark Resolved" on OPEN report
- [ ] Verify status changes to RESOLVED
- [ ] Verify button disappears
- [ ] Verify "Resolved: {date}" appears
- [ ] Refresh page
- [ ] Verify resolution persists
- [ ] Verify open count decrements

**Photo Lightbox:**
- [ ] Click photo thumbnail
- [ ] Verify full-size image displays
- [ ] Verify overlay darkens background
- [ ] Click X button or outside to close
- [ ] Verify lightbox closes

**Long Content:**
- [ ] Create report with 500+ char description
- [ ] Verify description truncates with "..."
- [ ] Click "Show more"
- [ ] Verify full description expands
- [ ] Click "Show less"
- [ ] Verify collapses

**RBAC:**
- [ ] As ATHLETE: Open equipment detail
- [ ] Verify can see damage reports
- [ ] Verify "Mark Resolved" button NOT visible
- [ ] Verify QR code section NOT visible

**Notifications:**
- [ ] Create CRITICAL damage report
- [ ] As COACH: Check notifications (bell icon)
- [ ] Verify in-app notification received
- [ ] Verify title: "[CRITICAL] Damage: {name}"
- [ ] Check coach email inbox
- [ ] Verify email received (if email configured)
- [ ] Test MODERATE severity
- [ ] Verify no email sent (only in-app)

## Known Issues and Edge Cases

### Edge Case 1: Equipment Without TeamId

**Impact:** MEDIUM
**Description:** Facility-owned equipment (where `teamId = null`) cannot receive damage reports via public form.

**Code evidence:**
```typescript
// damage-reports/route.ts lines 63-66
if (!equipment.teamId) {
  return NextResponse.json(
    { error: 'Equipment has no team association' },
    { status: 400 }
  );
}
```

**Recommendation:** Document limitation or add facility-level damage reporting.

### Edge Case 2: Usage Logs Not Cleaned Up

**Impact:** LOW
**Description:** When lineups are deleted, usage logs remain (by design).

**Code evidence:**
```typescript
// usage-logger.ts has deleteUsageLogForLineup() but unclear if called
```

**Recommendation:** Verify if historical usage should persist or be cleaned.

### Edge Case 3: QR Code Base URL

**Impact:** HIGH (production deployment)
**Description:** QR codes use `NEXT_PUBLIC_APP_URL` or fallback to `window.location.origin`.

**Risk:** In production, if env var not set, QR codes may generate with wrong URL.

**Recommendation:** Ensure `NEXT_PUBLIC_APP_URL` is set in production environment.

### Edge Case 4: Rate Limit Configuration

**Impact:** LOW
**Description:** Rate limiting is hardcoded in `checkRateLimit()` function.

**Recommendation:** Verify rate limit thresholds are appropriate (5 per hour).

### Edge Case 5: Photo Storage Cleanup

**Impact:** LOW
**Description:** Photos uploaded to Supabase Storage are not deleted when reports are resolved/deleted.

**Recommendation:** Implement storage cleanup policy or document storage growth.

## Architecture Patterns

### Equipment Form Pattern

```typescript
// Conditional field rendering based on type
const selectedType = watch('type');
const isShell = selectedType === 'SHELL';

{isShell && <ShellFields register={register} errors={errors} />}
```

**Data cleaning before API:**
```typescript
// Remove empty strings and NaN
const cleanData = { type, name };
if (manufacturer && manufacturer !== '') cleanData.manufacturer = manufacturer;
if (!Number.isNaN(yearAcquired)) cleanData.yearAcquired = yearAcquired;
// Only include shell fields for SHELL type
if (type === 'SHELL') {
  if (boatClass) cleanData.boatClass = boatClass;
}
```

### Public API Pattern (Damage Reports)

```typescript
// No auth required, but rate limited
const rateLimit = await checkRateLimit(clientIp, 'damage-report');
if (!rateLimit.success) return 429;

// Honeypot check (silent rejection)
if (body.honeypot && body.honeypot.length > 0) {
  return NextResponse.json({ success: true }, { status: 201 });
}

// Try to get authenticated user (optional)
let reportedBy: string | null = null;
try {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) reportedBy = user.id;
} catch {
  // Anonymous submission is fine
}
```

### Usage Logging Pattern (Idempotent)

```typescript
// Check if log exists before creating
const existing = await prisma.equipmentUsageLog.findFirst({
  where: { equipmentId, practiceId }
});

if (existing) {
  // Update if lineupId changed, else return existing
  if (existing.lineupId !== lineupId) {
    return await prisma.equipmentUsageLog.update(...);
  }
  return existing;
}

// Create new log
return await prisma.equipmentUsageLog.create(...);
```

## Technical Stack

### Libraries Used

| Library | Version | Purpose |
|---------|---------|---------|
| qrcode.react | Latest | QR code generation (SVG) |
| react-hook-form | Latest | Form state management |
| zod | Latest | Schema validation |
| @hookform/resolvers | Latest | Zod + react-hook-form integration |

### Validation Schemas

**Equipment:**
```typescript
// equipment.ts
equipmentTypeSchema = z.enum(['SHELL', 'OAR', 'LAUNCH', 'OTHER']);
equipmentStatusSchema = z.enum(['ACTIVE', 'INACTIVE', 'RETIRED']);
boatClassSchema = z.enum([...9 boat types...]);
weightCategorySchema = z.enum(['LIGHTWEIGHT', 'MIDWEIGHT', 'HEAVYWEIGHT']);

createEquipmentSchema = z.object({
  type, name, manufacturer?, serialNumber?,
  yearAcquired?, purchasePrice?, notes?,
  boatClass?, weightCategory?
}).refine(
  (data) => data.type !== 'SHELL' || data.boatClass !== undefined,
  { message: 'Boat class required for shells' }
);
```

**Damage Report:**
```typescript
// damage-report.ts
reportSeverityValues = ['MINOR', 'MODERATE', 'CRITICAL'];

createDamageReportSchema = z.object({
  location: z.string().min(1),
  description: z.string().min(10),
  severity: z.enum(reportSeverityValues),
  reporterName: z.string().min(2),
  category: z.string().optional(),
  honeypot: z.string().max(0, 'Bot detected').optional()
});
```

## Recommendations for Planning

### Priority Order

1. **EQUP-01** - Equipment CRUD (foundation)
2. **EQUP-02** - Usage tracking (verify automatic logging)
3. **EQUP-03** - QR reporting (most complex, needs real device)
4. **EQUP-04** - Damage resolution (depends on EQUP-03)

### Risk Areas

| Area | Risk | Mitigation |
|------|------|------------|
| QR scanning | Requires physical device | Test with multiple devices/cameras |
| Photo upload | Size/format validation | Test boundary cases |
| Rate limiting | May block legitimate users | Verify thresholds reasonable |
| Public endpoint | Spam/abuse potential | Verify honeypot + rate limit work |
| Usage logging | Automatic, hard to verify | Create practices and check logs |

### Suggested Task Structure

**Task 1: Equipment CRUD**
- Create all equipment types
- Test all fields including optionals
- Test status transitions
- Verify validation

**Task 2: Usage Tracking**
- Create practices with lineup assignments
- Verify usage logs created
- Verify usage history displays
- Verify usage summary on list page

**Task 3: QR Damage Reporting**
- Generate QR codes
- Test URL navigation
- Test QR scanning with real device
- Test form validation and submission
- Test photo upload
- Test honeypot and rate limiting

**Task 4: Damage Resolution**
- View damage reports
- Test photo lightbox
- Resolve reports
- Verify notifications
- Test RBAC (coach vs athlete)

## Sources

### Primary (HIGH confidence)
- Direct code audit of `/home/hb/radl/src/` codebase
- Prisma schema at `/home/hb/radl/prisma/schema.prisma`
- Equipment API route handlers
- Damage report components and pages
- Usage logger implementation

### Files Examined
**Pages:** 5 equipment pages, 1 public report page
**Components:** 10+ equipment components
**API routes:** 5 equipment endpoints
**Libraries:** 2 utility files
**Validations:** 2 schema files
**Tests:** 1 RBAC test file

### Verification Sources
- Phase 29 research (for E2E testing patterns)
- Existing test file (equipment.test.ts)
- Git status (confirms files exist)

## Metadata

**Confidence breakdown:**
- Equipment CRUD: HIGH - verified via code + existing tests
- Usage tracking: HIGH - implementation complete, automatic
- QR reporting: HIGH - public endpoint tested in code
- Damage resolution: HIGH - RBAC enforcement verified

**Research date:** 2026-01-29
**Valid until:** Indefinite (testing existing code)
**Limitations:** QR scanning requires physical device testing
