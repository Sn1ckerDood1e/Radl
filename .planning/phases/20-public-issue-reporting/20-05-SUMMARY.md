---
phase: 20-public-issue-reporting
plan: 05
subsystem: api
tags: [qrcode, jspdf, pdf-generation, bulk-export]

# Dependency graph
requires:
  - phase: 20-02
    provides: Form enhancements with severity selector
  - phase: 20-03
    provides: API endpoint and email notifications
provides:
  - GET /api/qr-export endpoint generating PDF with all equipment QR codes
  - QRBulkExportButton component for triggering bulk export
  - Coach-only bulk export on equipment list page
affects: [future-equipment-management, coach-workflows]

# Tech tracking
tech-stack:
  added: [qrcode]
  patterns: [server-side-qr-generation, pdf-grid-layout, blob-download]

key-files:
  created:
    - src/app/api/qr-export/route.ts
    - src/components/equipment/qr-bulk-export.tsx
  modified:
    - src/app/(dashboard)/[teamSlug]/equipment/page.tsx

key-decisions:
  - "Server-side QR generation via qrcode library for consistent quality"
  - "12 QR codes per page (3x4 grid) optimized for letter-size printing"
  - "Error correction level M for print reliability"
  - "Equipment names truncated to 20 chars to prevent label overflow"

patterns-established:
  - "PDF generation: Use jsPDF with grid layout for multi-item exports"
  - "Blob download: Fetch blob, create object URL, trigger click, revoke URL"
  - "Coach-only actions: Wrap in isCoach conditional with flex container"

# Metrics
duration: 4min
completed: 2026-01-26
---

# Phase 20 Plan 05: Bulk QR Export Summary

**Server-side PDF generation with scannable QR codes for all equipment using qrcode library and jsPDF grid layout**

## Performance

- **Duration:** 4 min
- **Started:** 2026-01-26T23:18:25Z
- **Completed:** 2026-01-26T23:22:50Z
- **Tasks:** 4
- **Files modified:** 4

## Accomplishments
- API endpoint generates multi-page PDF with 12 QR codes per page
- Each QR code is scannable and links to /report/[equipmentId]
- Equipment names appear as labels below each QR code
- Export button visible only to coaches on equipment list page
- Loading state with spinner during PDF generation

## Task Commits

Each task was committed atomically:

1. **Task 1: Create QR export API endpoint** - `e40e974` (feat)
2. **Task 2: Add server-side QR code generation** - `cb4c118` (feat)
3. **Task 3: Create bulk export button component** - `998fd0e` (feat)
4. **Task 4: Add export button to equipment list page** - `2550717` (feat)

## Files Created/Modified
- `src/app/api/qr-export/route.ts` - API endpoint generating PDF with QR codes grid
- `src/components/equipment/qr-bulk-export.tsx` - Button component with loading state and download
- `src/app/(dashboard)/[teamSlug]/equipment/page.tsx` - Added QRBulkExportButton for coaches
- `package.json` - Added qrcode dependency

## Decisions Made
- **Server-side QR generation:** Used qrcode library for consistent high-resolution output (500px width)
- **Grid layout:** 3 columns x 4 rows = 12 QR codes per page on letter-size PDF
- **Error correction level M:** Medium error correction for print reliability balance
- **Name truncation:** 20 character limit prevents label overflow under QR codes
- **Coach-only visibility:** Button wrapped in isCoach conditional check

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Bulk QR export complete and functional
- Phase 20 (Public Issue Reporting) feature set now complete
- All 5 plans delivered: Schema, Form UI, API/Notifications, Individual QR, Bulk Export

---
*Phase: 20-public-issue-reporting*
*Completed: 2026-01-26*
