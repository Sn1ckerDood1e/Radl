# Domain Pitfalls: RowOps Scheduling, Lineups, and Regatta Integration

**Domain:** Multi-tenant rowing team management SaaS
**Milestone:** Scheduling, lineups, regatta mode, PWA offline, push notifications
**Researched:** 2026-01-20
**Overall Confidence:** MEDIUM-HIGH

---

## Critical Pitfalls

Mistakes that cause rewrites, security breaches, or major user-facing failures.

---

### Pitfall 1: Multi-Tenant Data Leakage via Missing Tenant Filters

**What goes wrong:** A query forgets `WHERE tenant_id = ?`, exposing Team A's lineup data to Team B. In multi-tenant SaaS with shared databases, a single missing filter causes cross-tenant data exposure.

**Why it happens:**
- Developers add new queries and forget tenant scoping
- Complex joins lose tenant context
- Async context loss in Node.js/Go loses tenant_id mid-request
- Connection pool contamination reuses connections with stale tenant state

**Consequences:**
- Security breach exposing sensitive athlete data (medical, performance)
- Regulatory violations (GDPR, FERPA for college teams)
- Complete loss of customer trust
- Potential lawsuit from affected teams

**Warning signs:**
- No automated tenant isolation tests
- Manual `tenant_id` in every query vs. middleware enforcement
- "It works in single-tenant testing" mentality
- No row-level security (RLS) at database level

**Prevention:**
1. **Enforce tenant context at middleware level** - Extract tenant_id from JWT and inject into all database queries automatically
2. **Use database RLS as defense-in-depth** - PostgreSQL row-level security policies as a safety net
3. **Write tenant isolation integration tests** - Tests that attempt cross-tenant access must fail
4. **Audit logging for all data access** - Log tenant_id with every query for forensic analysis
5. **Connection pool hygiene** - Reset tenant context on connection return to pool

**Detection:**
- Run penetration tests with two test tenants attempting to access each other's data
- Automated tests that swap JWT tenant claims and verify rejection
- Query log analysis for queries missing tenant_id in WHERE clause

**Phase mapping:** Must be addressed in Phase 1 (foundation) before any new features. **CRITICAL: Given noted "JWT claims gaps" in existing codebase, this is an active vulnerability.**

**Confidence:** HIGH - Based on [2025 multi-tenant security research](https://instatunnel.my/blog/multi-tenant-leakage-when-row-level-security-fails-in-saas) and [CVE-2024-10976 PostgreSQL RLS bypass](https://instatunnel.my/blog/multi-tenant-leakage-when-row-level-security-fails-in-saas).

---

### Pitfall 2: JWT Claims Gaps Enable Tenant Spoofing

**What goes wrong:** Attacker modifies JWT payload to change `tenant_id` claim, gaining access to another team's data. The existing "JWT claims gaps" in RowOps make this an active risk.

**Why it happens:**
- Signature verification skipped (using `decode()` instead of `verify()`)
- Missing tenant_id claim in token, relying on request parameters instead
- No validation that user actually belongs to claimed tenant
- Header claim attacks (`kid`, `jku` manipulation)

**Consequences:**
- Complete bypass of tenant isolation
- Attacker impersonates any organization
- Silent data theft (no obvious error, just wrong data returned)

**Warning signs:**
- JWT library used with `decode()` in any code path
- tenant_id passed as query parameter alongside JWT
- No test that invalid/tampered JWTs are rejected
- Missing tenant_id claim in token structure

**Prevention:**
1. **Always use library `verify()` method** - Never access claims without signature validation
2. **Include tenant_id AND user_id in JWT claims** - Validate user membership in tenant
3. **Add organization_id validation** - Check user's org membership on every request
4. **Implement JTI (JWT ID) tracking** - Detect replay attacks
5. **Short expiration with refresh** - Limit damage window from stolen tokens

**Detection:**
- Security audit of all JWT handling code paths
- Integration tests with tampered tokens
- Log analysis for tokens with mismatched claims

**Phase mapping:** Phase 1 remediation. **CRITICAL: Existing JWT claims gaps must be fixed before adding regatta integration (which adds external OAuth complexity).**

**Confidence:** HIGH - Based on [JWT vulnerability research](https://www.vaadata.com/blog/jwt-json-web-token-vulnerabilities-common-attacks-and-security-best-practices/) and [PentesterLab JWT guide](https://pentesterlab.com/blog/jwt-vulnerabilities-attacks-guide).

---

### Pitfall 3: Lineup/Boat Assignment Race Conditions

**What goes wrong:** Two coaches simultaneously assign the same athlete to different boats. Without proper concurrency control, athlete ends up double-booked or data becomes inconsistent.

**Why it happens:**
- Check-then-act pattern without locking
- Optimistic updates without conflict detection
- No database constraints for athlete-boat uniqueness
- Simultaneous mobile app updates during practice

**Consequences:**
- Athlete assigned to two boats for same event (physically impossible)
- Lost assignments when last-write-wins
- Coaches see different lineups, causing confusion on race day
- Data integrity violations requiring manual cleanup

**Warning signs:**
- No database unique constraints on (athlete_id, event_id, boat_type)
- Using simple UPDATE without version checking
- No "athlete already assigned" validation in API
- No real-time sync between coaching devices

**Prevention:**
1. **Database-level constraints** - Unique constraint on (athlete_id, event_id, time_slot)
2. **Optimistic locking with version field** - Reject updates with stale version
3. **Use database transactions** - Wrap check-assign in single transaction
4. **Consider distributed locks for high-contention** - Redis locks for critical lineup changes
5. **Real-time conflict notification** - WebSocket to notify other coaches of concurrent edits

**Detection:**
- Load testing with concurrent lineup edits
- Integration tests simulating race conditions
- Database constraint violations in production logs

**Phase mapping:** Phase 2 (lineup management). Design data model with constraints from the start.

**Confidence:** HIGH - Based on [booking system race condition patterns](https://hackernoon.com/how-to-solve-race-conditions-in-a-booking-system) and [ticketing system concurrency](https://codefarm0.medium.com/building-a-ticketing-system-concurrency-locks-and-race-conditions-182e0932d962).

---

### Pitfall 4: PWA Offline Sync Data Loss and Conflicts

**What goes wrong:** Coach A edits lineup offline. Coach B edits same lineup online. When Coach A reconnects, sync either loses Coach A's changes or overwrites Coach B's changes without notification.

**Why it happens:**
- No conflict detection strategy defined
- Last-write-wins without user awareness
- No version vectors or timestamps for conflict identification
- Background sync fails silently

**Consequences:**
- Lost work frustrates coaches (especially remote/traveling coaches)
- Race day lineup doesn't match what coaches thought they saved
- Trust erosion in offline capability
- Coaches abandon offline feature, defeating PWA purpose

**Warning signs:**
- No conflict resolution strategy documented
- Using simple timestamp comparison (wall clock can drift)
- No user notification of sync conflicts
- No local queue for pending changes

**Prevention:**
1. **Implement operational transformation or CRDTs** - For conflict-free merging where possible
2. **Version vectors per entity** - Track changes at field level, not just record level
3. **Queue offline writes in IndexedDB** - With retry logic and failure tracking
4. **User-facing conflict resolution** - Show both versions, let user choose
5. **Sync status indicator** - Always show user whether data is synced or pending

**Architecture recommendation:**
```
Write locally (IndexedDB) -> Queue for sync ->
Background sync attempts ->
On conflict: surface to user OR auto-merge with rules ->
Confirm sync complete with visual indicator
```

**Detection:**
- Test with airplane mode + concurrent edits
- Simulate network failures mid-sync
- Monitor `QuotaExceededError` exceptions in production

**Phase mapping:** Phase 3 (PWA offline). Must design sync strategy before implementation, not after.

**Confidence:** MEDIUM-HIGH - Based on [PWA sync conflict patterns](https://gtcsys.com/comprehensive-faqs-guide-data-synchronization-in-pwas-offline-first-strategies-and-conflict-resolution/) and [background sync issues](https://moldstud.com/articles/p-resolving-challenges-with-background-synchronization-in-progressive-web-applications).

---

### Pitfall 5: iOS Push Notifications Silently Failing

**What goes wrong:** Push notifications work initially, then mysteriously stop for iOS users. Users miss race-day alerts, lineups, or schedule changes.

**Why it happens:**
- iOS WebPush endpoints expire after ~1-2 weeks
- Safari PWA requires home screen installation for push
- Battery optimization blocks notifications for inactive apps
- No rich media or silent push support on iOS PWAs

**Consequences:**
- Athletes miss race-day notifications (critical failure)
- Support tickets about "notifications stopped working"
- Users lose trust in notification feature
- Coaches resort to text messages, bypassing the app

**Warning signs:**
- Notifications work in testing but fail in production after time
- iOS users specifically reporting issues
- No monitoring of push delivery rates
- No re-subscription mechanism

**Prevention:**
1. **Track push endpoint health** - Monitor for expired endpoints, refresh proactively
2. **Implement re-subscription flow** - Detect failed pushes, prompt user to re-enable
3. **Fallback to email/SMS for critical alerts** - Never rely solely on PWA push for race day
4. **Clear user communication** - "Add to home screen for notifications" on iOS
5. **Monitor delivery rates by platform** - Alert when iOS delivery drops

**Critical limitation:** If targeting iPhone users for time-sensitive race-day alerts, PWA push is NOT reliable enough alone. Consider hybrid approach or SMS fallback.

**Detection:**
- Monitor push delivery success rates by platform
- Track time since last successful push per user
- User feedback surveys on notification reliability

**Phase mapping:** Phase 4 (notifications). Build SMS/email fallback into initial design, not as afterthought.

**Confidence:** HIGH - Based on [iOS PWA push issues](https://developer.apple.com/forums/thread/728796) and [2025 PWA iOS capabilities](https://ravi6997.medium.com/pwas-on-ios-in-2025-why-your-web-app-might-beat-native-0b1c35acf845).

---

## Moderate Pitfalls

Mistakes that cause delays, technical debt, or degraded user experience.

---

### Pitfall 6: Service Worker Cache Traps Users on Stale Versions

**What goes wrong:** After deploying updates, users remain stuck on old cached version. "Just refresh" doesn't work. Users see old UI, old bugs, missing features.

**Why it happens:**
- Service worker lifecycle misunderstanding
- New SW waits while any tab is open (users never close tabs)
- Cache-first strategy without cache-busting
- Safari particularly aggressive about caching

**Consequences:**
- Bug fixes don't reach users
- New features invisible to installed PWA users
- QA reports "fixed" bugs as still occurring
- User confusion about app state

**Warning signs:**
- Reports of issues that were already fixed
- "Works for me" syndrome between developers and users
- No `skipWaiting()` or update prompt implementation
- No versioned cache names

**Prevention:**
1. **Version your caches** - `cache-v1`, `cache-v2`, delete old on activation
2. **Implement update prompt UI** - "New version available, click to update"
3. **Use `skipWaiting()` for non-breaking updates** - Take control immediately
4. **Poll for updates** - `registration.update()` on interval
5. **Cache API responses with stale-while-revalidate** - Fresh data, cached backup

**Detection:**
- Add version indicator in app UI footer
- Monitor active service worker versions in analytics
- User reports of version mismatches

**Phase mapping:** Phase 3 (PWA). Implement proper SW update handling from day one.

**Confidence:** HIGH - Based on [PWA cache behavior guide](https://iinteractive.com/resources/blog/taming-pwa-cache-behavior) and [Chrome Workbox patterns](https://developer.chrome.com/docs/workbox/handling-service-worker-updates).

---

### Pitfall 7: Regatta Central OAuth Token Expiration Handling

**What goes wrong:** OAuth access token expires, refresh token fails silently, regatta integration stops working mid-event. Coach discovers integration broken during race day.

**Why it happens:**
- Refresh tokens expire (6 months typical, but variable)
- Refresh token used but new token not stored (breaking future refreshes)
- Rate limiting during token refresh
- Non-standard error codes (403 vs 401) not handled

**Consequences:**
- Regatta integration fails at worst possible time
- Manual re-authentication required mid-competition
- Results not syncing during event
- Lost trust in integration reliability

**Warning signs:**
- No token health monitoring
- No proactive token refresh before expiration
- Single-use refresh tokens not properly rotated
- No alerting on authentication failures

**Prevention:**
1. **Proactive token refresh** - Refresh when 80% of TTL elapsed, not at expiration
2. **Store refresh token rotation** - Update stored tokens after every refresh
3. **Health check endpoint** - Verify token validity before race day
4. **Graceful degradation** - Cache last-known regatta data, show warning
5. **Per-tenant token monitoring** - Dashboard showing token health per team

**Regatta Central specific:**
- API V4.0 uses RESTful syntax (changed from V3.0)
- Requires TLS 1.1+
- Cross-Origin requires configured referer header
- Contact: [email protected] for API issues

**Detection:**
- Daily job to validate all tenant tokens
- Alert on authentication errors in logs
- Pre-event checklist including OAuth verification

**Phase mapping:** Phase 5 (regatta integration). Design token lifecycle management into initial OAuth implementation.

**Confidence:** MEDIUM - Limited public documentation on Regatta Central API issues. Based on [OAuth refresh patterns](https://frontegg.com/blog/oauth-2-refresh-tokens) and general [OAuth expiration anti-patterns](https://cloud.google.com/apigee/docs/api-platform/antipatterns/oauth-long-expiration).

---

### Pitfall 8: Time Zone Chaos in Scheduling

**What goes wrong:** Practice scheduled for "3pm" displays as different times for coaches in different time zones. Regatta in different city shows wrong local time. Athletes miss events due to time confusion.

**Why it happens:**
- Storing times without timezone info
- Browser local time vs event location time confusion
- Daylight saving transitions not handled
- Regatta API returns times in different timezone than expected

**Consequences:**
- Athletes miss practices and races
- Coaches schedule conflicting events
- International teams constantly confused
- Regattas at traveling venues show wrong times

**Warning signs:**
- Using JavaScript `Date` without timezone libraries
- Storing times as strings without timezone offset
- No distinction between "wall clock time" and "instant in time"
- Tests only run in one timezone

**Prevention:**
1. **Store as UTC instant + timezone name** - e.g., `2026-03-15T15:00:00Z` + `America/Los_Angeles`
2. **Display in context-appropriate timezone** - Event location for regattas, user local for practices
3. **Use proper datetime library** - Luxon, date-fns-tz, or Temporal (when stable)
4. **Test across timezones** - CI tests with TZ environment variable
5. **Show timezone in UI** - "3:00 PM PDT" not just "3:00 PM"

**Detection:**
- User reports of wrong times
- Compare stored time vs displayed time in logs
- Test with team members in different timezones

**Phase mapping:** Phase 2 (scheduling). Get timezone handling right in data model, very hard to fix later.

**Confidence:** HIGH - Based on [sports scheduling timezone issues](https://mobile-help.sportsengine.com/en/articles/8284904-why-is-my-event-time-wrong) and general datetime best practices.

---

### Pitfall 9: IndexedDB Quota Exceeded on Mobile

**What goes wrong:** PWA stores too much offline data, hits iOS 50MB Safari limit, app crashes or loses data silently.

**Why it happens:**
- Caching full regatta history instead of relevant subset
- Storing high-resolution athlete photos offline
- No eviction strategy for old data
- Private browsing mode has near-zero quota

**Consequences:**
- App crashes on iOS Safari with no clear error
- Offline data corrupted or lost
- "Silent eviction" - Safari deletes data without warning after 7 days of inactivity
- Users can't use app offline when they most need it (remote venues)

**Warning signs:**
- No storage quota monitoring
- No data pruning strategy
- Storing binary data (photos, videos) in IndexedDB
- No user feedback when nearing quota

**Prevention:**
1. **Monitor storage usage** - Use `navigator.storage.estimate()` to track usage
2. **Implement LRU eviction** - Remove oldest/least-used data first
3. **Request persistent storage** - `navigator.storage.persist()` to prevent auto-eviction
4. **Keep offline data minimal** - Current roster, upcoming events, not full history
5. **Store media externally** - Use CDN URLs, cache only thumbnails

**Practical limits:**
- iOS Safari Cache API: 50MB hard limit on mobile
- IndexedDB: ~500MB on iOS, but Safari may evict without warning
- Plan for 50MB as your safe ceiling

**Detection:**
- Catch `QuotaExceededError` and report to analytics
- Show storage usage in settings
- Test with constrained storage

**Phase mapping:** Phase 3 (PWA offline). Design minimal offline data set upfront.

**Confidence:** HIGH - Based on [MDN storage quotas](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria) and [RxDB storage limits guide](https://rxdb.info/articles/indexeddb-max-storage-limit.html).

---

### Pitfall 10: Seat Racing Algorithm Complexity Trap

**What goes wrong:** Team builds sophisticated seat racing algorithm to optimize lineups, but algorithm doesn't match how coaches actually make decisions. Over-engineered solution nobody uses.

**Why it happens:**
- Mathematical models don't capture "intangibles" coaches value
- Coaches have domain expertise that's hard to codify
- Perfect lineup optimization is NP-hard (140 combinations for 8+8 athletes)
- Building algorithm before understanding workflow

**Consequences:**
- Wasted development time on unused feature
- Coaches bypass system and use spreadsheets anyway
- Algorithm gives "optimal" lineups coaches reject
- Feature complexity without value

**Warning signs:**
- Building seat racing "AI" before talking to coaches
- Optimizing for metrics coaches don't use
- No manual override capability
- Assuming algorithmic solutions to human judgment problems

**Prevention:**
1. **Start with data capture, not optimization** - Record seat race results, analyze later
2. **Enable manual lineup management first** - Let coaches do what they do
3. **Surface data, don't prescribe decisions** - "Here's who performed well together"
4. **Add suggestions incrementally** - Based on recorded patterns
5. **Always allow override** - Coach knows things algorithm doesn't

**Detection:**
- Feature usage analytics (is anyone using the algorithm?)
- Coach interviews on lineup decision process
- Compare algorithm suggestions to actual coach decisions

**Phase mapping:** Phase 2 (lineup management). Start with manual lineup tools, add suggestions later based on usage data.

**Confidence:** MEDIUM - Based on [rowing selection research](https://medium.com/@harry.powell72/the-data-science-of-rowing-crew-selection-16e5692cca79) and [British Rowing seat racing protocols](https://plus.britishrowing.org/2024/01/02/seat-racing/).

---

## Minor Pitfalls

Annoyances that are fixable but worth avoiding.

---

### Pitfall 11: Weather Integration Overcomplication

**What goes wrong:** Building complex weather integration for water conditions when simple external links would suffice. Over-engineering a solved problem.

**Why it happens:**
- Every feature must be "in app"
- Underestimating API costs at scale
- Not knowing specialized water sports weather services exist

**Prevention:**
- Link to local weather/tide resources rather than building
- Use free tier APIs (Open-Meteo) for basic conditions
- Consider StormGlass.io for water-specific forecasts if needed
- Make weather integration a nice-to-have, not MVP

**Phase mapping:** Defer to post-MVP. Link to resources initially.

**Confidence:** MEDIUM - Based on [rowing weather resources](https://www.owrc.com/resources-tides) and [StormGlass water sports API](https://stormglass.io/watersports/).

---

### Pitfall 12: Double-Booking Practice Facilities

**What goes wrong:** Two practice sessions scheduled for same boathouse/tank time slot. Conflicts discovered day-of.

**Prevention:**
1. Database constraint on (facility_id, time_slot)
2. Visual calendar showing facility utilization
3. Warning on conflict (allow override for split sessions)
4. Pre-save validation in API

**Phase mapping:** Phase 2 (scheduling). Basic constraint, not complex.

**Confidence:** HIGH - Standard scheduling pattern from [athletics scheduling guidance](https://blog.teamup.com/athletics-scheduling/).

---

### Pitfall 13: Push Notification Spam Leading to Opt-Outs

**What goes wrong:** Sending too many notifications causes users to disable them entirely, then they miss critical race-day alerts.

**Prevention:**
1. Categorize notifications (critical vs info)
2. User preferences per category
3. Digest/batch non-urgent notifications
4. Save critical notifications for race day only

**Phase mapping:** Phase 4 (notifications). Design notification taxonomy early.

**Confidence:** HIGH - Based on [PWA push notification best practices](https://yundrox.dev/posts/claritybox/building-robust-pwa-push-notifications/).

---

## Existing Technical Debt Amplification

**WARNING:** The project context notes "No test coverage, some tech debt, JWT claims gaps." This amplifies all pitfalls above:

### No Test Coverage Impact

| Pitfall | Without Tests |
|---------|---------------|
| Multi-tenant leakage | Cannot verify tenant isolation |
| Race conditions | Cannot reproduce concurrency bugs |
| JWT security | Cannot verify token validation paths |
| PWA sync | Cannot test offline scenarios |
| Timezone issues | Cannot test across zones |

**Recommendation:** Before adding new features, establish baseline test coverage:
- Integration tests for tenant isolation (CRITICAL)
- API tests for authentication/authorization
- Service-level unit tests for business logic

**Phase mapping:** Phase 0/1 remediation. Do not add complexity to untested codebase.

### Tech Debt Amplification

Adding scheduling, lineups, and offline sync to a codebase with existing tech debt creates compounding complexity:
- Each new feature interacts with debt-laden code
- Bugs become harder to isolate
- Refactoring becomes more expensive
- Developer velocity decreases with each addition

**Recommendation:** Allocate 20% of each sprint to debt reduction. Flag and document shortcuts. Hold the line on new debt.

**Confidence:** HIGH - Based on [technical debt research](https://logiciel.io/blog/refactoring-technical-debt) and [startup scaling mistakes](https://www.devteamsondemand.com/blog/6-technical-scaling-mistakes-that-kill-startup-growth).

---

## Phase-Specific Warnings Summary

| Phase | Primary Pitfalls | Risk Level |
|-------|-----------------|------------|
| Phase 1: Foundation/Security | JWT claims gaps (#2), Tenant leakage (#1) | CRITICAL |
| Phase 2: Scheduling/Lineups | Race conditions (#3), Timezone (#8), Double-booking (#12) | HIGH |
| Phase 3: PWA Offline | Sync conflicts (#4), Cache staleness (#6), Storage quota (#9) | HIGH |
| Phase 4: Notifications | iOS failures (#5), Spam (#13) | MEDIUM-HIGH |
| Phase 5: Regatta Integration | OAuth tokens (#7) | MEDIUM |

---

## Recommended Pre-Implementation Checklist

Before each phase, verify:

- [ ] Tenant isolation tested (integration tests)
- [ ] JWT validation verified (no decode-only paths)
- [ ] Data model has appropriate unique constraints
- [ ] Timezone handling specified in data model
- [ ] Offline sync strategy documented (if applicable)
- [ ] Push notification fallback defined (if applicable)
- [ ] OAuth token lifecycle managed (if applicable)
- [ ] Storage budget estimated (if offline)

---

## Sources

### Multi-Tenant Security
- [Multi-Tenant Leakage: When Row-Level Security Fails](https://instatunnel.my/blog/multi-tenant-leakage-when-row-level-security-fails-in-saas)
- [Multi-Tenant Security: Definition, Risks and Best Practices](https://qrvey.com/blog/multi-tenant-security/)
- [Six Shades of Multi-Tenant Mayhem](https://borabastab.medium.com/six-shades-of-multi-tenant-mayhem-the-invisible-vulnerabilities-hiding-in-plain-sight-182e9ad538b5)

### JWT Security
- [JWT Vulnerabilities and Best Practices](https://www.vaadata.com/blog/jwt-json-web-token-vulnerabilities-common-attacks-and-security-best-practices/)
- [JWT Security Best Practices](https://curity.io/resources/learn/jwt-best-practices/)
- [PentesterLab JWT Guide](https://pentesterlab.com/blog/jwt-vulnerabilities-attacks-guide)

### Booking/Scheduling Race Conditions
- [How to Solve Race Conditions in a Booking System](https://hackernoon.com/how-to-solve-race-conditions-in-a-booking-system)
- [Building a Ticketing System: Concurrency and Locks](https://codefarm0.medium.com/building-a-ticketing-system-concurrency-locks-and-race-conditions-182e0932d962)
- [Preventing Database Race Conditions with Redis](https://iniakunhuda.medium.com/hands-on-preventing-database-race-conditions-with-redis-2c94453c1e47)

### PWA Offline/Sync
- [Data Synchronization in PWAs: Offline-First Strategies](https://gtcsys.com/comprehensive-faqs-guide-data-synchronization-in-pwas-offline-first-strategies-and-conflict-resolution/)
- [Background Sync Issues in PWAs](https://moldstud.com/articles/p-resolving-challenges-with-background-synchronization-in-progressive-web-applications)
- [PWA Offline Dynamic Data](https://www.monterail.com/blog/pwa-offline-dynamic-data)

### Service Worker Updates
- [Taming PWA Cache Behavior](https://iinteractive.com/resources/blog/taming-pwa-cache-behavior)
- [Handling Service Worker Updates](https://whatwebcando.today/articles/handling-service-worker-updates/)
- [Chrome Workbox SW Updates](https://developer.chrome.com/docs/workbox/handling-service-worker-updates)

### Push Notifications
- [Building Robust PWA Push Notifications](https://yundrox.dev/posts/claritybox/building-robust-pwa-push-notifications/)
- [iOS PWA Push Issues (Apple Forums)](https://developer.apple.com/forums/thread/728796)
- [PWAs on iOS 2025](https://ravi6997.medium.com/pwas-on-ios-in-2025-why-your-web-app-might-beat-native-0b1c35acf845)

### Storage Limits
- [MDN Storage Quotas and Eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)
- [IndexedDB Max Storage Limits](https://rxdb.info/articles/indexeddb-max-storage-limit.html)

### OAuth/API Integration
- [OAuth 2 Refresh Tokens Guide](https://frontegg.com/blog/oauth-2-refresh-tokens)
- [Apigee OAuth Token Expiration Anti-patterns](https://cloud.google.com/apigee/docs/api-platform/antipatterns/oauth-long-expiration)
- [RegattaCentral API V4.0](https://api.regattacentral.com/v4/apiV4.jsp)

### Rowing-Specific
- [British Rowing Seat Racing](https://plus.britishrowing.org/2024/01/02/seat-racing/)
- [Data Science of Rowing Crew Selection](https://medium.com/@harry.powell72/the-data-science-of-rowing-crew-selection-16e5692cca79)
- [Rowing Club Management Software Reviewed](https://rowperfect.co.uk/rowing-club-management-software-systems-reviewed/)

### Technical Debt
- [Refactoring Technical Debt for SaaS CTOs](https://logiciel.io/blog/refactoring-technical-debt)
- [6 Technical Scaling Mistakes That Kill Startup Growth](https://www.devteamsondemand.com/blog/6-technical-scaling-mistakes-that-kill-startup-growth)
