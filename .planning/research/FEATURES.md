# Feature Landscape: Rowing Team Operations

**Domain:** Multi-tenant rowing team management SaaS (scheduling, lineups, regatta mode)
**Researched:** 2026-01-20
**Confidence:** HIGH (multiple authoritative sources cross-referenced)

## Context

This research focuses on features for Milestone 2 (Scheduling & Lineups) and Milestone 3 (Regatta Mode). RowOps already has Milestone 1 features (equipment CRUD, damage reporting, roster management, invitations). This document identifies what's expected vs. differentiating in the scheduling/regatta space.

**Key Competitors Analyzed:**
- [iCrew](https://www.icrew.club/) - Full-featured rowing club management, RegattaCentral integration
- [CrewLAB](https://crewlab.io/) - USRowing official partner, wellness + performance focus
- [The Rowing App](https://www.therowingapp.com/) - Coach-focused lineup tools
- [Ludum](https://ludum.com/) - Elite-level athlete management (Rowing Australia, Cambridge)
- [Spond](https://www.spond.com/activity/rowing/) - General sports team management with rowing support
- [Oar Nation](https://oarnation.com/) - Points-based attendance, RSVP calendar

---

## Table Stakes

Features users expect. Missing = product feels incomplete or coaches abandon for spreadsheets.

### Scheduling

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Practice calendar** | Every team app has this. Coaches can't plan without dates. | Low | Must support recurring (weekly templates) |
| **Time blocks within practice** | Rowing practices have distinct phases (warmup, steady-state, pieces). All competitors support this. | Medium | Water/land/erg tags are rowing-specific |
| **Athlete availability/RSVP** | iCrew, Oar Nation, Spond all prominently feature this. Coaches need to know who's coming before assigning lineups. | Medium | Must be mobile-friendly for athlete input |
| **Attendance tracking** | Standard in every competitor. Required for fair coxswain rotation, seat selection. | Low | Auto-mark based on check-in or coach confirmation |
| **Template practices** | iCrew and others offer reusable templates. Coaches hate recreating "Tuesday Steady State" weekly. | Medium | Save practice structure, apply to dates |

### Lineups

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Lineup builder** | Core feature of The Rowing App, iCrew, CrewLAB, Ludum. Assigning athletes to seats in boats is the primary coach task. | Medium | Drag-drop or seat-assignment UI |
| **Roster-to-boat assignment** | Basic expectation. Athletes expect to see their boat assignment. | Low | Show position (bow, 2-seat, stroke, cox) |
| **Lineup templates** | CrewLAB cited as "best lineup tool." Teams reuse "Varsity 1V" configurations frequently. | Medium | Save lineup configurations, apply to practices |
| **Boat compatibility check** | iCrew enforces size/skill-level matching. Coaches shouldn't assign damaged boats. | Medium | Warn or block incompatible assignments |
| **Export/share lineups** | The Rowing App exports as images. Teams share via GroupMe, email. | Low | Image or PDF export for sharing |

### Regatta Support

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Regatta calendar entry** | Basic scheduling for competitions. Every team app supports event types. | Low | Regatta as event type with multiple races |
| **Race schedule view** | Athletes need to know when they race. Parents need to plan. | Low | Timeline of team's races for the day |
| **Entry/lineup per race** | iCrew supports regatta lineups. Different boats for different events. | Medium | Same athlete can race multiple events |
| **Manual entry support** | Not all regattas are in RegattaCentral. Coaches need manual input. | Low | Fall-back when API unavailable |

### Notifications & Communication

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Push notifications** | Spond, CrewLAB, Tracklete all have mobile notifications. Athletes miss texts/emails. | Medium | Requires service worker / PWA push |
| **Practice reminder** | Standard. "Practice tomorrow at 6am" the night before. | Low | Configurable timing |
| **Lineup notification** | Athletes need to know their assignment before practice. | Low | "You're in bow seat of Varsity 8+" |
| **Schedule change alerts** | Teams cite this as critical. Cancelled practices, time changes. | Low | Push + in-app notification |

### Role-Based Access

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Coach dashboard** | iCrew: "Coaches and athletes each have their own home page." Coaches need planning view. | Low | Planning-focused, shows all athletes/boats |
| **Athlete view** | Athletes need personal schedule, not full team planning tools. | Low | My schedule, my assignments, my notifications |
| **Parent read-only view** | Spond explicitly mentions parent notifications. Parents want schedules without team management access. | Low | Linked to child athlete, view-only |

---

## Differentiators

Features that set RowOps apart. Not expected, but valued. Competitive advantages.

### Regatta Central Integration

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **API v4 connection** | Only iCrew explicitly has this. Pull race schedules automatically instead of manual entry. | High | OAuth2 with per-team keys, JSON endpoints |
| **Real-time race updates** | Regatta Central API supports timing system updates. Show if races are delayed. | High | Polling or webhook for schedule changes |
| **Entry sync** | Pull team's registered entries. Know which events the team is racing. | Medium | Reduces manual data entry errors |

**Source:** [RegattaCentral API v4 Cookbook](https://api.regattacentral.com/v4/RegattaCentral_APIV4_Cookbook.pdf)

### Race-Day Execution

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Regatta mode** | Dedicated operational state for race day. No competitor explicitly has this concept. | High | Distinct UX from practice planning |
| **Race-specific notifications** | "Report to dock 3 in 45 minutes for rigging." Configurable timing per race. | Medium | Push with location, timing, race context |
| **Meeting location per race** | Where to meet for rigging, where to launch. Different per venue/event. | Low | Text field + optional map pin |
| **Helper athlete assignment** | Note who's helping rig, who's coxing the launch. Common pattern not in software. | Low | Tags/notes for non-racing athletes |
| **Offline-first race day** | Venues have poor connectivity. Cached schedules work without signal. | High | Service worker caching, optimistic UI |

### Lineup Intelligence

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Drag-drop crew builder** | Ludum explicitly has this. Most tools are form-based, not visual. | Medium | Visual seat assignment, intuitive |
| **Coxswain rotation tracking** | iCrew mentions "fair coxswain rotation." Automated fairness based on race count. | Medium | Track cox races, suggest rotations |
| **Seat racing data integration** | Coaches use erg scores and seat race results for selection. Show relevant data in lineup builder. | High | Connect to erg results, display in context |
| **Conflict detection** | Athlete assigned to overlapping races. Warn before it happens. | Medium | Check race times, show conflicts |

### Athlete Experience

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Race acknowledgment** | Athletes confirm they've seen their assignment. Coach knows who's informed. | Low | Simple button/checkbox, reduces pre-race anxiety |
| **Personal race counter** | iCrew has "individual race count for regattas." Athletes see their stats. | Low | Count appearances, motivational |
| **Unified personal schedule** | Practices + regattas + races in one view. Athletes shouldn't juggle apps. | Low | Calendar with all commitments |

### Training Block Support

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Erg test integration** | RowHero does this. Auto-upload erg scores from PM5. | High | Bluetooth/cloud sync from Concept2 |
| **Land/erg group assignment** | Different from water assignment. "Group A does 5k, Group B does 6x500m." | Medium | Group-based, not seat-based |
| **Results per athlete** | Store erg scores, attendance. Track progress over season. | Medium | Personal history, coach analytics |

---

## Anti-Features

Features to explicitly NOT build. Common mistakes in this domain.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Full erg training platform** | ErgData, RowHero, Concept2 logbook already exist. Reinventing creates maintenance burden and worse UX. | Integrate with Concept2 API or accept manual entry. Store results, don't collect them. |
| **Results database** | Regatta Central is the official source. Duplicating creates sync issues, stale data. | Pull from Regatta Central. Display, don't own. |
| **Registration/payment** | Out of scope per PROJECT.md. iCrew charges extra for PaySimple integration. Complex, regulated domain. | Link to Regatta Central for registration. Keep payments out of scope. |
| **Video analysis** | CrewLAB and Ludum have this. High storage costs, specialized domain, existing tools (Coach's Eye, Dartfish) are better. | Allow linking to external video (YouTube, Coach's Eye URLs) in notes. |
| **Messaging platform** | Spond, GroupMe, Slack already do this. Teams won't switch. Maintaining chat is expensive. | Notifications are one-way broadcasts. Link to team's existing chat for discussions. |
| **Social features** | Athletes don't need another social network. Focus drifts from operational to engagement theater. | Stay operational. No feeds, likes, comments. |
| **Complex analytics dashboard** | Ludum has elite-level analytics. Small/mid teams don't need it. Scope creep. | Basic metrics (attendance, race count). Export data for coaches who want Excel analysis. |
| **Public spectator features** | Regatta Central handles public results. Time-Team handles spectator experience. | Regatta mode is team-internal only. Parents see schedule, not full race management. |
| **Native mobile apps** | PWA handles push notifications, offline. Native adds app store complexity, dual codebase maintenance. | PWA first. Revisit native only if PWA limitations block critical features. |
| **Weather-based cancellation** | Automated cancellation is error-prone. Coaches make judgment calls. | Manual cancellation with good notification flow. Maybe show weather data for coach reference. |

---

## Feature Dependencies

```
Practice Calendar (table stakes)
    |
    +---> Time Blocks (table stakes)
    |         |
    |         +---> Block Types: water/land/erg (table stakes)
    |                   |
    |                   +---> Water: Lineup Assignment (table stakes)
    |                   |         |
    |                   |         +---> Boat Compatibility Check (table stakes)
    |                   |         +---> Lineup Templates (table stakes)
    |                   |         +---> Drag-Drop Builder (differentiator)
    |                   |
    |                   +---> Land/Erg: Group Assignment (differentiator)
    |                             |
    |                             +---> Erg Results Storage (differentiator)
    |
    +---> Athlete Availability/RSVP (table stakes)
    |         |
    |         +---> Attendance Tracking (table stakes)
    |
    +---> Template Practices (table stakes)

Regatta Calendar Entry (table stakes)
    |
    +---> Race Schedule View (table stakes)
    |         |
    |         +---> Manual Entry (table stakes)
    |         +---> RegattaCentral API Sync (differentiator)
    |                   |
    |                   +---> Real-time Updates (differentiator)
    |
    +---> Entry/Lineup per Race (table stakes)
    |         |
    |         +---> Conflict Detection (differentiator)
    |         +---> Race Acknowledgment (differentiator)
    |
    +---> Regatta Mode UX (differentiator)
              |
              +---> Race-Specific Notifications (differentiator)
              +---> Meeting Location (differentiator)
              +---> Offline-First (differentiator)

Push Notifications (table stakes)
    |
    +---> Practice Reminder (table stakes)
    +---> Lineup Notification (table stakes)
    +---> Schedule Change Alerts (table stakes)
    +---> Race-Specific Notifications (differentiator)

Role-Based Views (table stakes)
    |
    +---> Coach Dashboard (table stakes)
    +---> Athlete View (table stakes)
    +---> Parent Read-Only (table stakes)
```

---

## MVP Recommendation

For the scheduling/lineup/regatta milestone, prioritize:

### Must Have (Table Stakes)
1. **Practice calendar with time blocks** - Coaches can't use the app without this
2. **Athlete availability/RSVP** - Coaches need to know who's coming
3. **Lineup builder with templates** - The core coach workflow
4. **Push notifications** - Athletes need to know their assignments
5. **Regatta calendar with race schedule** - Basic regatta support
6. **Role-based views** - Coach/athlete/parent separation

### Should Have (High-Value Differentiators)
7. **RegattaCentral integration** - Major differentiator, reduces manual work
8. **Regatta mode UX** - Unique positioning vs. general team apps
9. **Race-specific notifications with configurable timing** - Race-day execution focus
10. **Offline-first for race day** - Critical for venue connectivity issues

### Could Have (Nice Differentiators)
11. **Drag-drop lineup builder** - Better UX than form-based
12. **Coxswain rotation tracking** - Fairness feature coaches appreciate
13. **Land/erg group assignment** - Completes training block support
14. **Race acknowledgment** - Reduces pre-race communication anxiety

### Defer to Post-MVP
- Erg test integration (Concept2 API is complex, RowHero already exists)
- Seat racing data integration (advanced analytics, not core workflow)
- Weather display (nice but not blocking)

---

## Complexity Assessment

| Feature | Complexity | Rationale |
|---------|------------|-----------|
| Practice calendar | Low | Standard calendar UI, existing patterns |
| Time blocks | Medium | Nested data model, multiple block types |
| Lineup builder | Medium | Seat assignment logic, boat validation |
| Lineup templates | Medium | Template storage, apply with modifications |
| Availability/RSVP | Medium | Mobile-first UI, notification triggers |
| Attendance tracking | Low | Simple boolean/timestamp per practice |
| Template practices | Medium | Clone with date changes, handle edge cases |
| Push notifications | Medium | Service worker setup, FCM/APNs, permission handling |
| Regatta calendar | Low | Event type with nested races |
| Race schedule view | Low | Timeline UI, filter by team |
| RegattaCentral integration | High | OAuth2 flow, API polling, error handling, credential management |
| Regatta mode UX | High | Distinct navigation, context switching, optimized for race day |
| Offline-first | High | Service worker caching strategy, conflict resolution, queued actions |
| Drag-drop builder | Medium | Drag-drop library, accessibility, mobile support |
| Conflict detection | Medium | Time overlap detection across races |
| Race acknowledgment | Low | Simple state toggle per athlete-race |

---

## Sources

**Primary (HIGH confidence):**
- [iCrew Rowing Club Management](https://www.icrew.club/) - Feature comparison, pricing tiers
- [RegattaCentral API v4 Cookbook](https://api.regattacentral.com/v4/RegattaCentral_APIV4_Cookbook.pdf) - API capabilities
- [CrewLAB](https://crewlab.io/) - USRowing partner, feature positioning

**Secondary (MEDIUM confidence):**
- [The Rowing App](https://www.therowingapp.com/) - Coach tools, lineup features
- [Ludum](https://ludum.com/) - Drag-drop crew builder, elite features
- [Spond](https://www.spond.com/activity/rowing/) - Parent access, notifications

**Community (LOW confidence - patterns observed, not officially documented):**
- [EGR Crew Race Day Guide](https://egrcrew.com/crew-101/crew-101-race-day/) - Race day workflow patterns
- [Rowing Chat on iCrew](https://rowing.chat/icrew-club-management-software/) - User testimonials
- [World Rowing Apps Overview](https://worldrowing.com/2025/11/25/the-best-rowing-apps-of-2025-2026/) - Market landscape

---

*Last updated: 2026-01-20*
