---
phase: 20-public-issue-reporting
plan: 04
subsystem: ui
tags: [qrcode, canvas, png-export, equipment, client-component]

# Dependency graph
requires:
  - phase: 20-01
    provides: QRCodeDisplay component foundation
  - phase: 20-02
    provides: Public report form for QR code destination
provides:
  - QR code download as print-quality PNG
  - Equipment name label on QR code
  - Coaches-only QR code section in equipment detail
affects: [20-05]

# Tech tracking
tech-stack:
  added: []
  patterns: [canvas-based image export, SVG-to-PNG conversion]

key-files:
  modified:
    - src/components/equipment/qr-code-display.tsx
    - src/components/equipment/equipment-detail.tsx

key-decisions:
  - "3x scale factor for print-quality PNG output (equivalent to 300 DPI)"
  - "QR code section coaches-only since download enables printing physical labels"
  - "Equipment name included in downloaded PNG for label identification"

patterns-established:
  - "Canvas-based export: Create canvas, draw SVG as image, add text, trigger download"
  - "useCallback for download handler to prevent re-creation on render"

# Metrics
duration: 2min
completed: 2026-01-26
---

# Phase 20 Plan 04: QR Code Download for Equipment Detail Summary

**Print-quality PNG download with equipment name label, restricted to coaches in equipment detail page**

## Performance

- **Duration:** 2 min
- **Started:** 2026-01-26T23:18:23Z
- **Completed:** 2026-01-26T23:20:36Z
- **Tasks:** 3 (2 with code changes, 1 verification only)
- **Files modified:** 2

## Accomplishments

- QRCodeDisplay component enhanced with PNG download at 3x resolution for print quality
- Equipment name rendered as label below QR code in downloaded image
- QR code section in equipment detail restricted to coaches only
- Clean filename generation based on equipment name (e.g., `qr-rowing-shell-1.png`)

## Task Commits

Each task was committed atomically:

1. **Task 1: Enhance QRCodeDisplay with download functionality** - `f424886` (feat)
2. **Task 2: Add QR code section to equipment detail component** - `1b624a3` (feat)
3. **Task 3: Pass equipment name to detail component** - No commit (verified existing data flow)

## Files Created/Modified

- `src/components/equipment/qr-code-display.tsx` - Added equipmentName, showDownload props and canvas-based PNG export
- `src/components/equipment/equipment-detail.tsx` - Coaches-only QR section with download button and instructions

## Decisions Made

- **3x scale factor for PNG:** Produces high-resolution image suitable for printing QR code stickers
- **Canvas-based export:** SVG converted to image, drawn on canvas with text label, exported as PNG
- **Coaches-only restriction:** Only coaches need to print and attach QR codes to equipment
- **Clean filename:** Equipment name slugified for download filename (spaces to dashes, lowercase)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - existing code structure already passed equipment name through the component chain.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- QR code download functionality complete for individual equipment items
- Ready for 20-05: Bulk QR code export (will need API endpoint for generating multiple QR codes)
- Equipment detail page now shows coaches how to create physical QR labels

---
*Phase: 20-public-issue-reporting*
*Completed: 2026-01-26*
