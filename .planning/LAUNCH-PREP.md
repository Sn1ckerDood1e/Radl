# Radl Two-Week Launch Prep

**Goal:** Have a working app ready for a test team within two weeks.

**Timeline:** 2026-01-28 to 2026-02-11

---

## Week 1: Foundation & Security

### Your Tasks (Physical/Business)

| Task | Priority | Est. Time | Notes |
|------|----------|-----------|-------|
| **Form LLC** | HIGH | 2-3 days | File in your state. Consider Wyoming or Delaware for simplicity. Use a registered agent service. |
| **Set up business email** | HIGH | 1 hour | Google Workspace ($6/mo) or Zoho Mail (free tier). Use your domain (e.g., hello@radl.com) |
| **Get custom domain** | HIGH | 30 min | If not done: radl.com or similar. Point to Vercel. |
| **Set up Stripe account** | MEDIUM | 1 hour | Even if free for testing, you'll need this eventually. Requires LLC/EIN. |
| **Identify test club** | HIGH | Ongoing | Reach out to 2-3 rowing clubs. Offer free access for feedback. |
| **Create demo data script** | LOW | - | I can help with this (see Claude prompts below) |
| **Write terms of service** | MEDIUM | 1 hour | Basic ToS and privacy policy. Can use generators initially. |
| **Set up error monitoring** | MEDIUM | 30 min | Create Sentry account (free tier), I'll integrate it |

### Claude Prompts (Operating Problems)

Copy these prompts when you encounter issues:

**Authentication Issues:**
```
I'm having an authentication issue on Radl. [Describe what's happening - login failing, session expiring, redirect loops, etc.]. Check the auth flow and help me debug.
```

**Database/Prisma Errors:**
```
I'm getting this database error on Radl: [paste error]. Help me understand what's wrong and fix it.
```

**Vercel Deployment Issues:**
```
Vercel deployment is failing or the app isn't working after deploy. Here's what I'm seeing: [describe issue or paste error]. Help me fix the deployment.
```

**UI/Styling Broken:**
```
The UI looks broken on [page/component]. [Describe what's wrong - layout issues, colors, responsiveness]. Help me fix the styling.
```

**Permission/Access Issues:**
```
A user with role [ROLE] is [able to/unable to] do [ACTION] but they [should/shouldn't] be able to. Check the CASL permissions and fix the access control.
```

### GSD Workflow Tasks

These are structured development tasks. Run `/gsd:new-milestone` when ready to start.

**Phase 1: Security Audit**
- Review all API routes for authentication checks
- Verify RBAC permissions work correctly for each role
- Check for exposed sensitive data in responses
- Audit database queries for proper tenant isolation
- Review environment variables (no secrets in client code)

**Phase 2: Core Flow Testing**
- Test complete signup → create team → invite members flow
- Test practice creation → lineup assignment → athlete view flow
- Test equipment management → damage reporting → resolution flow
- Document any bugs found

**Phase 3: UI Polish**
- Ensure consistent styling across all pages
- Fix any broken layouts on mobile
- Add loading states where missing
- Improve error messages for user clarity

---

## Week 2: Testing & Refinement

### Your Tasks (Physical/Business)

| Task | Priority | Est. Time | Notes |
|------|----------|-----------|-------|
| **Onboard test club** | HIGH | 2-3 hours | Walk them through signup, answer questions |
| **Create user guide** | MEDIUM | 2 hours | Simple doc or video explaining core features |
| **Set up feedback channel** | HIGH | 30 min | Google Form, Discord, or simple email for bug reports |
| **Monitor first sessions** | HIGH | Ongoing | Watch for errors in Vercel logs, respond quickly |
| **Collect initial feedback** | HIGH | Ongoing | Note pain points, confusion, feature requests |
| **Back up production data** | MEDIUM | 15 min | Enable Supabase backups if not already |
| **Create support email** | LOW | 15 min | support@radl.com forwarding to you |

### Claude Prompts (Testing Phase)

**Bug Triage:**
```
Users are reporting this issue: [describe bug]. Here's what they were doing and what happened. Help me find and fix the root cause.
```

**Quick Feature Request:**
```
Test users are asking for [FEATURE]. Is this a quick add or should it wait? If quick, help me implement it.
```

**Performance Issues:**
```
The app feels slow on [page/action]. Help me identify the bottleneck and optimize it.
```

**Data Issues:**
```
User data looks wrong: [describe issue]. Help me investigate and fix it. Be careful not to lose data.
```

### GSD Workflow Tasks

**Phase 4: Bug Fixes (from testing)**
- Fix issues discovered in Week 1 testing
- Address feedback from test club
- Priority: anything blocking core workflows

**Phase 5: Quality of Life**
- Add helpful empty states
- Improve onboarding hints
- Add confirmation dialogs for destructive actions
- Better mobile navigation

---

## Pre-Launch Checklist

### Infrastructure
- [ ] Custom domain configured and working
- [ ] SSL certificate active (Vercel handles this)
- [ ] Environment variables set correctly in Vercel
- [ ] Database backups enabled in Supabase
- [ ] Error monitoring connected (Sentry)

### Security
- [ ] All API routes require authentication
- [ ] RBAC permissions tested for each role
- [ ] No secrets exposed in client-side code
- [ ] Rate limiting on auth endpoints
- [ ] Audit logging working

### Core Flows Working
- [ ] Signup and email verification
- [ ] Create team / join via invite
- [ ] Create and edit practices
- [ ] Assign lineups to practices
- [ ] View schedule as athlete
- [ ] Manage equipment
- [ ] Report equipment issues

### Legal/Business
- [ ] LLC formed
- [ ] Terms of Service published
- [ ] Privacy Policy published
- [ ] Business email working

### User Experience
- [ ] Mobile responsive on all pages
- [ ] Loading states present
- [ ] Error messages are helpful
- [ ] Empty states guide users
- [ ] Core workflows feel smooth

---

## Quick Reference: Common Commands

**Check project status:**
```
/gsd:progress
```

**Start a new milestone:**
```
/gsd:new-milestone
```

**Plan a specific phase:**
```
/gsd:plan-phase [number]
```

**Execute planned work:**
```
/gsd:execute-phase [number]
```

**Debug an issue systematically:**
```
/gsd:debug
```

---

## Priority Order

If time is limited, focus on these in order:

1. **Security audit** - Can't have users on a broken auth system
2. **Core flow testing** - The main use cases must work
3. **Bug fixes** - Fix what's broken before adding features
4. **Onboard test club** - Real users find real issues
5. **UI polish** - Nice to have but not blocking

---

## Notes

- Start with ONE test club, not multiple
- Fix critical bugs same-day during testing
- Keep a running list of "nice to have" for later
- Don't add new features during testing - stabilize first
- Document workarounds for known issues

---

*Created: 2026-01-28*
*Target: Test team live by 2026-02-11*
