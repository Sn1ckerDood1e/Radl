# Phase 6: RC Settings UI - Context

**Gathered:** 2026-01-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Coaches can manage their Regatta Central integration from within the app — view connection status, connect/disconnect via OAuth, trigger manual imports, and toggle auto-sync. This is a settings UI phase; the underlying RC API integration already exists from v1.0.

</domain>

<decisions>
## Implementation Decisions

### Settings Page Layout
- RC settings lives as a section/card within the existing team settings page (not a separate integrations page)
- Coaches only — athletes should not see this section
- Include brief inline help text explaining what RC integration does

### Connection Status Display
- When connected: show RC account name only (no last sync time or health indicators)
- Disconnect confirmation: Claude's discretion on dialog vs inline confirmation

### Import Feedback
- After successful import: show count with link to view imported data ("Imported 3 regattas" links to regatta list)
- Progress display during import: Claude's discretion (depends on what RC API provides)
- No-change scenario: Claude's discretion on messaging
- Cancel button: Claude's discretion based on typical import duration

### Auto-sync Behavior
- If auto-sync fails: send push notification to coach
- Sync frequency and mechanism: Claude's discretion based on RC API capabilities
- Sync granularity: Claude's discretion (all-or-nothing vs selective)

### Claude's Discretion
- Card structure (expandable vs always visible)
- Disconnected state empty text
- Disconnect confirmation pattern (dialog vs inline)
- OAuth error handling pattern
- Import progress indicator type
- No-changes messaging
- Cancel button during import
- Auto-sync frequency/mechanism
- Whether to show last sync timestamp
- What data types sync (granularity)

</decisions>

<specifics>
## Specific Ideas

No specific references — open to standard approaches for OAuth connection management UIs.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 06-rc-settings-ui*
*Context gathered: 2026-01-21*
