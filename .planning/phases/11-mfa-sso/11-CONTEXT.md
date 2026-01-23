# Phase 11: MFA & SSO - Context

**Gathered:** 2026-01-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Enterprise authentication features for admin protection and single sign-on. Facility and club admins can enable multi-factor authentication via authenticator app (TOTP). Enterprise customers can configure SAML SSO with their identity provider. Facility admins can grant temporary elevated permissions. SSO users inherit roles from identity provider claims with configurable mapping.

</domain>

<decisions>
## Implementation Decisions

### MFA Enrollment
- MFA is **optional** for admins — not enforced
- Setup available in **two locations**: user profile settings (personal) and admin security panel (org-wide policies)
- Recovery uses **both backup codes and email**: 10 one-time backup codes generated during setup, email verification as fallback if codes lost
- Facility admins **can reset MFA for club admins** — action is logged in audit trail

### SSO Configuration
- Support **SAML 2.0 only** — covers Okta, Azure AD, Google Workspace
- **Hybrid setup approach**: self-service UI for facility admin with option to request assisted setup from RowOps support
- SSO configured at **facility level only** — all clubs under facility use same IDP
- Password login **remains available** even when SSO is enabled — both authentication methods coexist

### Custom Permissions (Temporary Elevated Access)
- Primary use case: **coach covering for admin** — coach needs admin access while club admin is unavailable
- Expiration is **time-based with preset durations** — auto-revokes when time expires
- User notified via **both email and in-app** when access is about to expire and when it does

### Role Mapping from SSO
- **Configurable mapping** — facility admin defines which IDP groups/claims map to which RowOps roles
- Users with no matching role **default to ATHLETE** — can still access system with basic permissions
- Role updates on **next login** — when IDP role changes, RowOps picks up new claims at next authentication
- Facility admin **can override SSO-derived roles** — local override takes precedence over IDP claim

### Claude's Discretion
- Preset duration options for temporary access (e.g., 1 day, 3 days, 1 week, 2 weeks, 1 month)
- SAML metadata parsing and validation implementation
- MFA setup UI flow and QR code generation
- SSO test connection flow
- Notification timing (e.g., "expires in 24h" warning)

</decisions>

<specifics>
## Specific Ideas

No specific product references — open to standard approaches for enterprise authentication.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 11-mfa-sso*
*Context gathered: 2026-01-23*
