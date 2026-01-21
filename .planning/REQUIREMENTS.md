# RowOps Requirements

## v1 Requirements

### Security & Foundation
- [ ] **SEC-01**: Fix JWT claims verification gaps — ensure tokens are validated before trusting claims
- [ ] **SEC-02**: Add rate limiting to sensitive endpoints — protect auth, invitations, damage reports
- [ ] **SEC-03**: Audit and verify multi-tenant data isolation — confirm RLS policies, add missing filters

### Seasons
- [ ] **SEASON-01**: Create season container model — group practices and regattas by season
- [ ] **SEASON-02**: Implement season-scoped eligibility — athletes can be active/inactive per season

### Practice Scheduling
- [ ] **PRAC-01**: Create practices with time blocks — date, start/end, typed blocks (water/land/erg)
- [ ] **PRAC-02**: Add block metadata — single/interval, time/distance values, category tags
- [ ] **PRAC-03**: Create reusable practice templates — save and apply practice structures
- [ ] **PRAC-04**: Build unified calendar view — display practices and regattas together

### Lineups
- [ ] **LINE-01**: Build lineup editor — define athletes with seat positions
- [ ] **LINE-02**: Implement boat assignment — assign compatible available boat to lineup
- [ ] **LINE-03**: Create reusable lineup templates — save and apply lineup configurations
- [ ] **LINE-04**: Implement group-based assignment — land/erg blocks use groups not individual seats

### Equipment Operational
- [ ] **EQUIP-01**: Auto-generate usage logs — record equipment use from practice assignments
- [ ] **EQUIP-02**: Implement readiness state — derive from damage reports + maintenance flags + overrides
- [ ] **EQUIP-03**: Enforce availability at assignment — block assignment of unavailable equipment

### Regatta Mode
- [ ] **REG-01**: Integrate Regatta Central API — OAuth2 auth, per-team keys, fetch race schedules
- [ ] **REG-02**: Support manual regatta/race entry — for regattas not on RC or offline creation
- [ ] **REG-03**: Build timeline view — chronological display of team's races at regatta
- [ ] **REG-04**: Enable lineup assignment per entry — assign athletes to each race (fresh or template)
- [ ] **REG-05**: Implement race notifications — push alerts with configurable timing before races
- [ ] **REG-06**: Add meeting location field — specify where to rig/launch for each race
- [ ] **REG-07**: Add notes field — helper athletes, special instructions per race
- [ ] **REG-08**: Build offline capability — cache schedules/lineups, queue actions, sync when online

### PWA Infrastructure
- [ ] **PWA-01**: Set up service worker with caching — basic PWA shell, manifest, offline fallback
- [ ] **PWA-02**: Implement push notifications — VAPID keys, subscription management, delivery
- [ ] **PWA-03**: Add IndexedDB offline storage — local storage for schedules, lineups, regatta data
- [ ] **PWA-04**: Implement background sync — queue offline actions, sync on reconnect (with fallback)

### Tech Debt
- [ ] **DEBT-01**: Extract claims helper utility — DRY up duplicated JWT decode + fallback pattern
- [ ] **DEBT-02**: Refactor oversized form components — split equipment, damage report, CSV import forms
- [ ] **DEBT-03**: Add query caching — cache stable data (equipment lists, roster, team settings)

---

## v2 Requirements (Deferred)

- [ ] Season templates — copy settings between seasons
- [ ] Email notifications — email fallback for push notifications
- [ ] Erg results tracking — store and display erg test scores
- [ ] Attendance analytics — reporting on practice attendance patterns
- [ ] Equipment lifecycle tracking — maintenance schedules, age-based alerts
- [ ] Parent portal — dedicated parent view with child's schedule/races
- [ ] Native mobile apps — iOS/Android apps if PWA insufficient

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Financial tracking / payroll | Not team operations focus |
| Inventory accounting | Equipment is operational, not financial |
| Checkout systems unrelated to practices | Equipment tied to practices only |
| Results database | Regatta Central handles official results |
| Registration/payment | Out of scope for internal execution tool |
| Public scoring | Not a spectator-facing app |
| Messaging platform | Not a communication-first tool |
| Social features | Not a social network |
| Video analysis | Specialized tools exist |
| Erg training platform | ErgData, Concept2 logbook exist |

---

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| SEC-01 | 1 | Complete |
| SEC-02 | 1 | Complete |
| SEC-03 | 1 | Complete |
| SEASON-01 | 1 | Complete |
| SEASON-02 | 1 | Complete |
| DEBT-01 | 1 | Complete |
| PRAC-01 | 2 | Complete |
| PRAC-02 | 2 | Complete |
| PRAC-03 | 2 | Complete |
| PRAC-04 | 2 | Complete |
| EQUIP-02 | 2 | Complete |
| EQUIP-03 | 2 | Complete |
| LINE-01 | 3 | Complete |
| LINE-02 | 3 | Complete |
| LINE-03 | 3 | Complete |
| LINE-04 | 3 | Complete |
| EQUIP-01 | 3 | Complete |
| DEBT-02 | 3 | Complete |
| PWA-01 | 4 | Pending |
| PWA-02 | 4 | Pending |
| PWA-03 | 4 | Pending |
| PWA-04 | 4 | Pending |
| DEBT-03 | 4 | Pending |
| REG-01 | 5 | Pending |
| REG-02 | 5 | Pending |
| REG-03 | 5 | Pending |
| REG-04 | 5 | Pending |
| REG-05 | 5 | Pending |
| REG-06 | 5 | Pending |
| REG-07 | 5 | Pending |
| REG-08 | 5 | Pending |

---

*Last updated: 2026-01-21*
