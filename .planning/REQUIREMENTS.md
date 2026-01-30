# Requirements: Radl v3.0 Production Polish

**Defined:** 2026-01-29
**Core Value:** Coaches can plan practices with lineups and equipment, and athletes know where to be and what boat they're in.

## v3.0 Requirements

Production-ready polish before user launch: branding, UX improvements, device-specific fixes, and legal compliance.

### Branding

- [x] **BRND-01**: App renamed from "Strokeline" to "Radl" throughout all UI text
- [x] **BRND-02**: Color palette updated to brand teal (#0d9488) as primary color
- [x] **BRND-03**: App icons and favicons updated with brand assets
- [x] **BRND-04**: PWA manifest updated with correct name, colors, and icons
- [x] **BRND-05**: Crest/logo integrated in header when asset is available

### UX Polish - Loading States

- [ ] **LOAD-01**: Skeleton loading states on all list views (roster, equipment, practices)
- [ ] **LOAD-02**: Skeleton loading states on detail pages during data fetch
- [ ] **LOAD-03**: 300ms delay before showing spinners (prevent flash)
- [ ] **LOAD-04**: Progress indicators for operations longer than 10 seconds

### UX Polish - Error Handling

- [ ] **ERRR-01**: Error messages formatted consistently with icon and clear action
- [ ] **ERRR-02**: Form validation errors shown inline on blur (not submit)
- [ ] **ERRR-03**: Network error states with retry action
- [ ] **ERRR-04**: Optimistic UI updates with rollback on failure

### UX Polish - Empty States

- [ ] **EMPT-01**: Empty state variants implemented (informational, celebration, error)
- [ ] **EMPT-02**: All major list views have contextual empty states
- [ ] **EMPT-03**: Empty states include clear call-to-action for next step

### Device-Specific - Mobile Calendar

- [ ] **CALM-01**: Calendar opens in bottom sheet (Drawer) on mobile viewports
- [ ] **CALM-02**: Date picker optimized for touch with larger tap targets
- [ ] **CALM-03**: Practice list view readable on mobile without horizontal scroll

### Device-Specific - Drag-Drop

- [ ] **DRAG-01**: Touch drag-drop uses 250ms hold delay activation
- [ ] **DRAG-02**: Explicit drag handles with touch-action: none CSS
- [ ] **DRAG-03**: Visual feedback during drag (shadow, scale, color change)

### Device-Specific - Safe Areas

- [x] **SAFE-01**: Viewport uses viewport-fit=cover for edge-to-edge
- [x] **SAFE-02**: Content respects safe-area-inset-* for notched devices
- [x] **SAFE-03**: Bottom navigation accounts for home indicator

### Legal

- [x] **LEGL-01**: Terms of Service page with current date and company info
- [x] **LEGL-02**: Privacy Policy page with data collection and usage details
- [x] **LEGL-03**: Footer links to Terms and Privacy on all pages
- [x] **LEGL-04**: Legal pages accessible without authentication

## Future Requirements

Deferred to v3.1 or later:

### Native Mobile Apps

- **NATV-01**: Capacitor project initialized with iOS and Android targets
- **NATV-02**: Native push notifications via @capacitor/push-notifications
- **NATV-03**: App Store submission with screenshots and metadata
- **NATV-04**: Play Store submission with screenshots and metadata

### GDPR Compliance (if EU expansion)

- **GDPR-01**: Cookie consent banner with accept/reject options
- **GDPR-02**: Data export functionality for user data
- **GDPR-03**: Account deletion with data removal

### Additional Polish

- **POLH-01**: Swipe gestures for calendar month navigation
- **POLH-02**: Haptic feedback on key interactions

## Out of Scope

| Feature | Reason |
|---------|--------|
| React Native rebuild | Capacitor wrapping is sufficient, 136k LOC already exists |
| Cookie consent | US-only launch, no GDPR requirement yet |
| In-app purchases | Web subscriptions only for now |
| Push notification migration | Defer to native app milestone |
| Dynamic team colors | Using brand teal consistently |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| BRND-01 | Phase 32 | Complete |
| BRND-02 | Phase 32 | Complete |
| BRND-03 | Phase 32 | Complete |
| BRND-04 | Phase 32 | Complete |
| BRND-05 | Phase 32 | Complete |
| SAFE-01 | Phase 32 | Complete |
| SAFE-02 | Phase 32 | Complete |
| SAFE-03 | Phase 32 | Complete |
| LEGL-01 | Phase 33 | Complete |
| LEGL-02 | Phase 33 | Complete |
| LEGL-03 | Phase 33 | Complete |
| LEGL-04 | Phase 33 | Complete |
| LOAD-01 | Phase 34 | Pending |
| LOAD-02 | Phase 34 | Pending |
| LOAD-03 | Phase 34 | Pending |
| LOAD-04 | Phase 34 | Pending |
| ERRR-01 | Phase 34 | Pending |
| ERRR-02 | Phase 34 | Pending |
| ERRR-03 | Phase 34 | Pending |
| ERRR-04 | Phase 34 | Pending |
| EMPT-01 | Phase 34 | Pending |
| EMPT-02 | Phase 34 | Pending |
| EMPT-03 | Phase 34 | Pending |
| CALM-01 | Phase 35 | Pending |
| CALM-02 | Phase 35 | Pending |
| CALM-03 | Phase 35 | Pending |
| DRAG-01 | Phase 35 | Pending |
| DRAG-02 | Phase 35 | Pending |
| DRAG-03 | Phase 35 | Pending |

**Coverage:**
- v3.0 requirements: 29 total
- Mapped to phases: 29
- Unmapped: 0

---
*Requirements defined: 2026-01-29*
*Last updated: 2026-01-30 — Phases 32-33 complete (12 requirements)*
