# Features Research: v2.0 Commercial Readiness

**Domain:** Rowing team operations SaaS
**Researched:** 2026-01-22
**Overall Confidence:** MEDIUM

Multi-tenancy patterns, PWA best practices, and RBAC models are well-established (HIGH confidence). Domain-specific rowing app features are based on competitor analysis and general sports team management patterns (MEDIUM confidence). UI/UX expectations reflect 2026 SaaS standards.

---

## Facility Model Features

### Table Stakes

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| **Hierarchical tenancy (facility → club)** | Real-world organizational structure. Boathouses host multiple clubs with shared resources. Industry standard in enterprise SaaS. | High | Current flat team_id model must evolve to support parent-child relationships | Microsoft Entra, Oracle OCI, and GKE all support hierarchical multi-tenancy |
| **Shared resource management** | Clubs at same facility share boats/equipment. Parent tenancy assigns resources to child tenancies. | Medium | Equipment model needs ownership scope (facility vs club) | Inheritance pattern: child namespaces inherit parent resources |
| **Per-club subscriptions** | Each club is independent billing entity, even if sharing facilities. Supports self-service signup. | Medium | Stripe/billing integration | Seat-based or hybrid pricing expected in 2026 |
| **Tenant-scoped data isolation** | Absolute requirement for commercial SaaS. No cross-tenant reads/writes. | High | All queries need facility + club context | Security failure point — must verify at DB level |
| **Equipment visibility controls** | Facility equipment visible to all clubs, club equipment private to that club. | Medium | RBAC + equipment model | "Shared but scoped" access pattern |
| **Facility admin role** | Cross-club management for facility-level users. Can manage shared equipment, view (not edit) club practices. | Medium | RBAC system | Separate from club admin role |
| **Club isolation by default** | Clubs cannot see each other's rosters, practices, or lineups. Only shared equipment is visible. | High | Database design + RBAC | Table stakes for multi-tenant trust |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Equipment reservation system** | Shared boats can be reserved by clubs to prevent conflicts. "Lookout has the 8+ on Saturday morning." | Medium | Builds on existing practice scheduling |
| **Cross-club lineup sharing** | Facility admin can create composite lineups (e.g., combined novice program). Optional, permissions-gated. | High | Complex permissions — requires explicit opt-in |
| **Facility-level analytics** | Dashboard showing equipment utilization across all clubs. Helps justify facility investment. | Low | Aggregate existing usage tracking |
| **Club migration tools** | Export/import to move club between facilities. Supports org restructuring. | Medium | Needed for real-world flexibility |
| **Waiting list / club approval** | Facility admin can approve/reject club signup requests. Prevents random clubs joining facility. | Low | Standard B2B approval workflow |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Infinite nesting depth** | Facilities don't have sub-facilities in rowing. Adds complexity without value. | Limit to 2 levels: facility → club |
| **Cross-facility club membership** | A club belongs to one facility. Splitting across facilities adds billing/data complexity. | Require club-per-facility model |
| **Facility-wide rosters** | Rosters are club-specific. Athletes don't share across clubs even at same facility. | Keep rosters club-scoped |
| **Facility-level practices** | Practices are always club-specific. Even shared facilities schedule independently. | Practices remain club-scoped |
| **Complex resource-sharing rules** | Beyond "facility-owned" vs "club-owned," rules get too granular. | Simple binary ownership model |

---

## Mobile PWA Features

### Table Stakes

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| **Touch-friendly targets (≥44px)** | WCAG 2.5.5 standard for mobile accessibility. Required for operational apps used in field. | Low | UI component updates | 44x44px CSS pixels minimum |
| **Offline-first data sync** | Coaches/athletes use app at regattas with unreliable cellular. Industry standard for field apps. | Medium (already built in v1.0) | Service workers + IndexedDB | Radl already has this via Serwist + Dexie |
| **Responsive breakpoints** | Mobile-first design with tablet/desktop layouts. No separate mobile site. | Medium | CSS refactor for existing pages | Standard practice in 2026 |
| **Conflict resolution strategy** | When offline changes clash with server state, app must handle gracefully. | Medium | Background sync implementation | Last-write-wins or user prompt for critical data |
| **Background sync queue** | Mutations queued in IndexedDB, synced when online. Essential for regatta mode offline reliability. | Medium (already built in v1.0) | Service worker Background Sync API | Radl has this for lineup changes |
| **App-like UX (add to homescreen)** | PWA manifest, splash screen, standalone mode. Expected for "app-like" claim. | Low | Web manifest configuration | Standard PWA setup |
| **Network-aware UI** | Show connection status, indicate when changes are pending sync. | Low | Online/offline event listeners | Reduces user confusion |
| **Cache-first for static, network-first for dynamic** | Service worker strategies per resource type. | Low (already built in v1.0) | Serwist configuration | Radl uses Serwist caching strategies |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Optimistic UI updates** | Lineup changes appear instantly, sync in background. Feels native. | Medium | Requires rollback logic on sync failure |
| **Granular sync status** | "3 changes pending" with list of what's queued. Builds trust in offline mode. | Low | IndexedDB query + UI indicator |
| **Smart precaching** | On regatta day, precache all race data automatically. Anticipate offline needs. | Medium | Service worker logic based on context |
| **Progressive loading** | Show critical content first (today's practices), defer secondary (past history). | Medium | Skeleton screens + lazy loading |
| **Offline fallback content** | Helpful empty states when offline instead of generic errors. "You're offline. Viewing cached data from [time]." | Low | Service worker routing |
| **Push notification grouping** | Stack multiple race notifications together instead of spamming. | Low | Web Push API options |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Full offline editing** | Editing equipment/roster offline creates complex conflicts. Not needed at regattas. | Allow viewing offline, require online for mutations outside lineups |
| **Offline-first for everything** | Admin pages (settings, integrations) don't need offline. Adds complexity. | Offline-first only for operational pages (schedule, lineups, regatta) |
| **Native app** | PWA sufficient for current use case. Native adds app store overhead, maintenance burden. | Architect PWA for future native migration, but don't build now |
| **Real-time sync (WebSockets)** | Rowing teams are small (10-50 athletes). Polling sufficient, simpler than WebSocket infrastructure. | Stick with background sync + periodic polling |
| **Infinite scroll** | Practices/races are finite, bounded by season. Pagination simpler. | Use pagination with reasonable page sizes |

---

## UI/UX Features

### Table Stakes

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| **Design system with consistent components** | Modern SaaS expectation. Predictability reduces cognitive load. 500+ components standard. | Medium | Component library (shadcn/ui recommended) | shadcn/ui has 104K GitHub stars, 560K npm downloads/week (2026) |
| **Empty states with guidance** | Blank screens feel broken. Users need CTAs. "No practices scheduled. Create your first practice." | Low | Content design for each empty state | Transform empty → engagement opportunity |
| **Progressive disclosure** | Don't overwhelm new users with all features. Reveal advanced options as needed. | Medium | UI refactor for multi-step flows | Reduces onboarding friction |
| **Dark mode support** | Expected by 2026, especially for operational apps used early morning/late evening. | Medium | Theme system (CSS variables) | Sonner already supports dark mode |
| **Loading states (skeletons)** | Replace spinners with content-shaped placeholders. Feels faster. | Low | Component library patterns | Standard in modern design systems |
| **Toast notifications for feedback** | Instant feedback for actions. "Practice created." "Lineup saved." | Low (already built in v1.0) | Sonner library | Radl already uses Sonner |
| **Accessible form validation** | Inline errors, ARIA labels, keyboard navigation. WCAG compliance. | Medium | Form component standards | Required for commercial sale (accessibility laws) |
| **Consistent typography system** | Type scale, weights, spacing defined. Not ad-hoc font sizes. | Low | Design tokens | Foundation of design system |
| **AI integration touchpoints** | Not full AI features, but UI prepared for AI assistance (e.g., "Suggest lineup"). 2026 baseline. | Low | Button placeholders, future-ready architecture | AI is table stakes expectation (not differentiator) in 2026 |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Drag-and-drop everywhere** | Lineups, equipment assignment, practice planning all use drag-drop. Consistent interaction model. | Medium (dnd-kit already in use) | Radl has dnd-kit for lineups — extend pattern |
| **Contextual help (tooltips, hints)** | Inline guidance without leaving page. "What's a coxswain?" tooltip. | Low | Native tooltips or library |
| **Milestone-based onboarding** | "3/5 setup tasks complete." Gamified progress. | Medium | Track user state, show progress UI |
| **Smart defaults** | Auto-fill common values (e.g., practice duration defaults to team's usual). Learn from usage. | Medium | Requires usage analytics |
| **Undo/redo** | Especially for lineup changes. "Oops, didn't mean to move that athlete." | Medium | Command pattern for state management |
| **Keyboard shortcuts** | Power users (coaches on desktop) want speed. "Cmd+N for new practice." | Medium | Global keyboard handler |
| **Adaptive UI based on role** | Athletes see simpler views than coaches. Same app, different complexity. | Low | Conditional rendering based on claims |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Onboarding tours** | Disruptive, skipped by users. Low retention value. | Use empty states + progressive disclosure instead |
| **Animation-heavy UI** | Rowing app is operational, not flashy. Too much motion is distracting. | Subtle transitions only (200-300ms) |
| **Customizable dashboards** | Adds complexity, most users won't customize. Not needed for targeted workflows. | Opinionated dashboard layout optimized for role |
| **White-labeling** | Facility branding not needed for v2.0. Adds theme complexity. | Defer to enterprise tier (future) |
| **Multi-column drag-drop** | Lineup editor is single-list focus. Multi-column adds cognitive load. | Keep linear drag-drop model |

---

## Security/RBAC Features

### Table Stakes

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| **Tenant-scoped roles** | User can be admin in Club A, athlete in Club B. Roles are not global. | High | JWT claims refactor | "Is user admin in THIS club?" not just "is user admin?" |
| **Invite flow with role assignment** | Invite team member → assign role at invitation time. Standard SaaS pattern. | Medium | Email + token system | Assign role before user accepts |
| **Least privilege by default** | New users start with minimal permissions. Explicit grants required. | Low | Default role assignment | Prevents accidental over-permissioning |
| **Audit logging for sensitive actions** | Who changed what, when. Required for compliance (SOC 2, GDPR). | Medium | Audit log table + background writes | 365-day retention standard |
| **MFA support** | Expected for admin accounts in commercial SaaS. | Medium | Auth provider (Supabase supports MFA) | Required for enterprise sales |
| **Rate limiting** | Protect against brute force, DDoS. Already in v1.0, must be comprehensive. | Low (already built in v1.0) | Middleware rate limit check | Radl has SEC-02 complete |
| **Session management** | Configurable session timeout, revocation. Admin can force logout. | Medium | Auth provider features | Standard for security-conscious orgs |
| **Permission delegation** | Facility admin can delegate club management without granting facility-level access. | Medium | Hierarchical RBAC | Scope grants to organizational level |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Custom roles (hybrid RBAC)** | 80% use defaults (coach, athlete), 20% want custom (assistant coach, equipment manager). | High | Role definition UI + permission mapping | Hybrid model = defaults + customization |
| **Granular permissions (feature-level)** | "Can manage equipment" vs "can view equipment." Not just role labels. | High | Permission matrix across all features | Enables custom roles |
| **Temporary role elevation** | Grant athlete "coach" permissions for specific practice (they're leading workout). Auto-revoke. | Medium | Time-bounded role grants | Useful for delegation scenarios |
| **Permission preview** | "As facility admin, you can see X but not Y." Help users understand scope. | Medium | UI showing current user's effective permissions |
| **Bulk invite** | CSV upload with roles. "Add 30 athletes at once." | Low | CSV parsing + invite loop | Time-saver for large rosters |
| **SSO/SAML support** | Enterprise orgs expect SSO. Differentiator for commercial sales. | High | Auth provider integration | Defer to later in v2.0 or enterprise tier |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Fine-grained object permissions** | "Athlete A can view Practice 1 but not Practice 2." Too granular for rowing context. | Role-based access at club/facility level, not per-object |
| **Workflow approval chains** | "Coach creates practice → admin approves → published." Adds friction, not needed in small teams. | Direct publishing with audit logs |
| **IP allowlisting** | Rowing teams work from home, boathouse, regattas. IP restrictions break mobility. | Rely on MFA instead |
| **Separate "owner" vs "admin"** | Adds confusion. One top-level role sufficient per scope. | Single admin role with full permissions |
| **Passwordless-only auth** | Some users (older coaches) prefer passwords. Don't force magic links. | Support both passwordless and traditional |

---

## Feature Dependencies

```
Facility Model Dependencies:
  Hierarchical Tenancy → Shared Resource Management → Equipment Visibility Controls
  Facility Admin Role → Permission Delegation → Club Isolation

Mobile PWA Dependencies:
  Offline-first Sync → Conflict Resolution → Network-aware UI
  Touch Targets → Responsive Breakpoints → App-like UX

UI/UX Dependencies:
  Design System → Empty States → Loading States
  Progressive Disclosure → Contextual Help → Milestone Onboarding

Security/RBAC Dependencies:
  Tenant-scoped Roles → Invite Flow → Audit Logging
  Least Privilege → Permission Delegation → MFA
```

---

## MVP Recommendation for v2.0

### Must Build (Table Stakes)

**Facility Model:**
1. Hierarchical tenancy (facility → club)
2. Shared resource management
3. Tenant-scoped data isolation
4. Facility admin role
5. Club isolation

**Mobile PWA:**
1. Touch-friendly targets (44px+)
2. Responsive breakpoints
3. Network-aware UI indicators
4. Conflict resolution for offline sync

**UI/UX:**
1. Design system (shadcn/ui integration)
2. Empty states with guidance
3. Dark mode support
4. Accessible form validation
5. Loading states (skeletons)

**Security/RBAC:**
1. Tenant-scoped roles
2. Invite flow with role assignment
3. Audit logging
4. MFA support
5. Permission delegation

### Defer to Post-v2.0

- Custom roles (hybrid RBAC) — complex, 20% use case
- SSO/SAML — enterprise feature, not MVP
- Equipment reservation system — nice-to-have, not blocking
- Cross-club lineup sharing — complex permissions, rare use case
- Temporary role elevation — advanced delegation, defer

---

## Complexity Assessment

| Category | Overall Complexity | Critical Path Items |
|----------|-------------------|-------------------|
| **Facility Model** | High | Hierarchical tenancy (DB + JWT refactor), data isolation verification |
| **Mobile PWA** | Low-Medium | Already 70% complete from v1.0. Need responsive CSS + touch targets. |
| **UI/UX** | Medium | Design system integration is biggest lift. Empty states are breadth, not depth. |
| **Security/RBAC** | High | Tenant-scoped roles require JWT claims overhaul. Audit logging is new infrastructure. |

**Highest risk:** Facility model + RBAC interaction. Tenant-scoping must be bulletproof across both facility and club boundaries.

**Quick wins:** Mobile PWA improvements (build on existing), empty states, loading states, dark mode.

---

## Sources

### Multi-Tenancy & Facility Model
- [SaaS Multitenancy Best Practices - Frontegg](https://frontegg.com/blog/saas-multitenancy)
- [Multi-Tenant Architecture - Microsoft Azure](https://learn.microsoft.com/en-us/azure/architecture/guide/saas-multitenant-solution-architecture/)
- [Multi-Tenant SaaS Architecture on AWS 2026 - ClickIT](https://www.clickittech.com/software-development/multi-tenant-architecture/)
- [How to Design Multi-Tenant SaaS - Clerk](https://clerk.com/blog/how-to-design-multitenant-saas-architecture)
- [Hierarchical Multi-Tenancy - Microsoft Entra](https://learn.microsoft.com/en-us/entra/identity/multi-tenant-organizations/overview)
- [Best Practices for Enterprise Multi-Tenancy - Google Cloud](https://cloud.google.com/kubernetes-engine/docs/best-practices/enterprise-multitenancy)
- [Organization Management - Oracle Cloud](https://docs.oracle.com/en-us/iaas/Content/General/Concepts/organization_management_overview.htm)

### PWA & Offline-First
- [Progressive Web App Best Practices - MobiDev](https://mobidev.biz/blog/progressive-web-app-development-pwa-best-practices-challenges)
- [PWA 2.0 + Edge Runtime 2026 - Zignuts](https://www.zignuts.com/blog/pwa-2-0-edge-runtime-full-stack-2026)
- [PWA Offline-First Strategies - Medium](https://tianyaschool.medium.com/pwa-offline-first-strategies-key-steps-to-enhance-user-experience-4c10de780446)
- [Data Synchronization in PWAs - GTC Systems](https://gtcsys.com/comprehensive-faqs-guide-data-synchronization-in-pwas-offline-first-strategies-and-conflict-resolution/)
- [PWA with Offline Sync - eLuminous](https://medium.com/@biz_41031/how-to-build-a-seamless-progressive-web-app-pwa-with-offline-data-synchronization-3ca94d50c37f)
- [Configure Offline Sync - Microsoft Dynamics](https://learn.microsoft.com/en-us/dynamics365/field-service/mobile/offline-data-sync)

### UI/UX & Design Systems
- [Top SaaS Design Trends 2026 - Design Studio UIUX](https://www.designstudiouiux.com/blog/top-saas-design-trends/)
- [SaaS UX Design Best Practices 2026 - Millipixels](https://millipixels.com/blog/saas-ux-design)
- [Essential SaaS Design Principles 2026 - Index.dev](https://www.index.dev/blog/saas-design-principles-ui-ux)
- [shadcn/ui - Component Library](https://ui.shadcn.com/)
- [React UI Libraries 2025-2026 - Makers Den](https://makersden.io/blog/react-ui-libs-2025-comparing-shadcn-radix-mantine-mui-chakra)
- [Empty State UX Examples - Eleken](https://www.eleken.co/blog-posts/empty-state-ux)
- [SaaS Onboarding UX 2026 - Design Studio UIUX](https://www.designstudiouiux.com/blog/saas-onboarding-ux/)
- [Empty States for Onboarding - Candu](https://www.candu.ai/template-category/empty-states)

### Mobile Accessibility
- [Mobile Accessibility WCAG - W3C](https://www.w3.org/TR/mobile-accessibility-mapping/)
- [Touch Targets Accessibility - Digital.gov](https://accessibility.digital.gov/ux/touch-targets/)
- [Understanding Success Criterion 2.5.5 Target Size - W3C](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html)
- [Mobile & Responsive WCAG Standards - Accesify](https://www.accesify.io/blog/mobile-responsive-wcag/)

### RBAC & Security
- [Best Practices for Multi-Tenant Authorization - Permit.io](https://www.permit.io/blog/best-practices-for-multi-tenant-authorization)
- [Multi-Tenant RBAC - AWS Prescriptive Guidance](https://docs.aws.amazon.com/prescriptive-guidance/latest/saas-multitenant-api-access-authorization/avp-mt-abac-examples.html)
- [Building RBAC for Multi-Tenant SaaS - Medium](https://medium.com/@my_journey_to_be_an_architect/building-role-based-access-control-for-a-multi-tenant-saas-startup-26b89d603fdb)
- [How to Design RBAC for Multi-Tenant SaaS - WorkOS](https://workos.com/blog/how-to-design-multi-tenant-rbac-saas)
- [Multi-Tenant RBAC - Aserto](https://www.aserto.com/use-cases/multi-tenant-saas-rbac)
- [Enterprise Ready RBAC - EnterpriseReady.io](https://www.enterpriseready.io/features/role-based-access-control/)
- [Role-Based Access Control 2026 - Concentric AI](https://concentric.ai/how-role-based-access-control-rbac-helps-data-security-governance/)

### SaaS Security Hardening
- [DDoS Protection 2026 - Kentik](https://www.kentik.com/kentipedia/ddos-protection/)
- [API Rate Limiting for SaaS - IJSRCSEIT](https://ijsrcseit.com/index.php/home/article/view/CSEIT241061223)
- [Best SaaS Security Tools 2026 - Astra](https://www.getastra.com/blog/security-audit/saas-security-tools/)
- [State of SaaS Security 2025-2026 - Cloud Security Alliance](https://cloudsecurityalliance.org/artifacts/state-of-saas-security-report-2025)
- [SaaS Security Best Practices 2026 - GainHQ](https://gainhq.com/blog/saas-security-best-practices/)

### Subscription & Billing
- [SaaS Pricing Models Guide 2026 - Revenera](https://www.revenera.com/blog/software-monetization/saas-pricing-models-guide/)
- [Future of SaaS Pricing 2026 - Medium](https://medium.com/@aymane.bt/the-future-of-saas-pricing-in-2026-an-expert-guide-for-founders-and-leaders-a8d996892876)
- [Seat-Based Pricing Model - SubscriptionFlow](https://www.subscriptionflow.com/2025/02/seat-based-pricing-model/)
- [State of SaaS Pricing 2025 - Growth Unhinged](https://www.growthunhinged.com/p/2025-state-of-saas-pricing-changes)

### Sports Team Management (Domain)
- [CrewTimer Regatta Timing](https://www.crewtimer.com/)
- [iCrew Rowing Club Management](https://icrew.club/)
- [CrewLAB Rowing Team Management](https://crewlab.io/down-under/)
- [5 Best Sports Team Management Apps 2026 - EZFacility](https://www.ezfacility.com/blog/sports-team-management-apps/)
- [Sports Team Management Apps - Connecteam](https://connecteam.com/best-sports-team-management-apps/)
- [TeamSnap Team Management](https://www.teamsnap.com/teams)

---

**Research Confidence Summary:**

| Area | Confidence | Reason |
|------|-----------|--------|
| Multi-tenancy patterns | HIGH | Well-established industry patterns from Microsoft, AWS, Google, Oracle |
| PWA offline-first | HIGH | Current MDN documentation + 2026 best practices from multiple sources |
| RBAC for multi-tenant | HIGH | Verified with WorkOS, Permit.io, AWS, enterprise sources |
| UI/UX expectations | MEDIUM | Based on 2026 SaaS trends; shadcn/ui adoption is verifiable (104K stars) |
| Mobile accessibility | HIGH | WCAG 2.5.5 is official W3C standard (44px touch targets) |
| Domain-specific features | MEDIUM | Based on competitor analysis (CrewTimer, iCrew, CrewLAB) and general sports team apps |
| Security hardening | HIGH | Cloud Security Alliance report + current vendor practices (AppTrana, Kentik) |
| Billing/subscription | MEDIUM | 2026 trends show shift toward hybrid models; seat-based still common |

**Overall:** Research is comprehensive across all four v2.0 dimensions. Facility model and RBAC are highest complexity. Mobile PWA builds on existing v1.0 foundation (70% complete). UI/UX is breadth (many small features) not depth (complex features).
