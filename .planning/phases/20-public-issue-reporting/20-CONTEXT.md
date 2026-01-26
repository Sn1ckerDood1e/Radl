# Phase 20: Public Issue Reporting - Context

**Gathered:** 2026-01-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Allow anyone to report equipment issues via QR code without authentication. Public route `/report/[equipmentId]` accepts damage reports, creates maintenance alerts, and updates equipment status. QR codes generated per equipment item for physical placement.

</domain>

<decisions>
## Implementation Decisions

### Report Form Design
- Severity: 3 simple levels — Minor / Moderate / Critical
- Reporter name: Required field (not anonymous)
- Photo upload: Optional — camera/gallery upload for damage documentation
- Description: Required text field

### Issue Categories
**Claude's Discretion** — Implement dropdown with sensible categories (Hull, Rigging, Hardware, Other) or free text based on what works best

### QR Code Generation
- Both individual and bulk generation available
- Individual: Button on equipment detail page
- Bulk: Export all QR codes as PDF/ZIP
- Print formats: Both PDF sheets and PNG/SVG downloads

### QR Code Design
**Claude's Discretion** — Decide what to encode (URL only vs URL + metadata) and sticker styling (QR + label design)

### Success Flow
**Claude's Discretion** — Confirmation message, whether to show reference number, "Report Another" UX

### Status Tracking
- No public status tracking — submit and done
- Coaches handle issue lifecycle internally

### Coach Notifications
- In-app notification: Always show badge/alert for new reports
- Email notification: Send for critical severity issues only

### Abuse Prevention
- Rate limiting: Yes — reasonable limit (e.g., 5 reports/hour/IP)
- Bot protection: Honeypot field (invisible to humans, catches bots)
- Content validation: Claude's discretion on minimum requirements

### Error Handling
**Claude's Discretion** — Handle invalid equipment URLs appropriately

</decisions>

<specifics>
## Specific Ideas

- QR codes will be printed as stickers and placed on physical equipment (boats, oars, etc.)
- Form should work well on mobile since people will scan QR with phones
- Keep form simple and fast — people reporting issues shouldn't be frustrated

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 20-public-issue-reporting*
*Context gathered: 2026-01-26*
