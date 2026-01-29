# Phase 20: Public Issue Reporting - Research

**Researched:** 2026-01-26
**Domain:** Public forms, QR code generation, mobile-first forms, abuse prevention
**Confidence:** HIGH

## Summary

Phase 20 extends the existing public damage reporting system with enhanced form fields (severity, category, required reporter name), improved QR code generation (bulk export to PDF), and coach notifications (in-app + email for critical issues). The codebase already has strong foundations:

1. **Existing infrastructure:** Public `/report/[equipmentId]` route, `qrcode.react` library, `DamageReportForm` component, Upstash rate limiting, notification system
2. **Enhancement focus:** Extend existing form with severity/category/reporter fields, add honeypot bot protection, create bulk QR export feature, integrate email notifications for critical severity
3. **Mobile-first priority:** Form will be accessed via phone after QR scan - responsive design, camera capture, minimal taps

**Primary recommendation:** Extend the existing `DamageReportForm` component with new fields, add `jsPDF` for bulk QR export, integrate Resend for critical issue email notifications, and implement honeypot spam protection.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| qrcode.react | ^4.2.0 | QR code generation | Already in use for equipment QR codes |
| react-hook-form | ^7.71.1 | Form state management | Already used throughout app |
| zod | ^4.3.5 | Schema validation | Standard validation library in codebase |
| @upstash/ratelimit | ^2.0.8 | Rate limiting | Already configured for damage reports |
| sonner | ^2.0.7 | Toast notifications | Already used for success/error feedback |

### Supporting (Need to Install)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| jspdf | ^4.0.0 | PDF generation | Bulk QR code export to printable PDF sheets |
| resend | ^4.x | Email API | Send critical severity notifications to coaches |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| jsPDF | @react-pdf/renderer | jsPDF is simpler for label sheets, react-pdf better for complex documents |
| Resend | SendGrid, Mailgun | Resend has simpler API, better DX, React Email integration |
| Honeypot | reCAPTCHA | Honeypot is invisible to users, no external dependency |

**Installation:**
```bash
npm install jspdf resend
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── report/
│   │   └── [equipmentId]/
│   │       └── page.tsx              # Existing - enhance with new form
│   └── api/
│       ├── equipment/[id]/
│       │   └── damage-reports/
│       │       └── route.ts          # Existing - extend for new fields
│       └── qr-export/
│           └── route.ts              # NEW: Bulk QR PDF generation
├── components/
│   └── equipment/
│       ├── damage-report-form.tsx    # Existing - extend with severity/category
│       ├── qr-code-display.tsx       # Existing - already working
│       └── qr-bulk-export.tsx        # NEW: Bulk export UI
├── lib/
│   ├── validations/
│   │   └── damage-report.ts          # Existing - extend schema
│   └── email/
│       └── send-critical-alert.ts    # NEW: Resend integration
```

### Pattern 1: Public Form with Honeypot Protection
**What:** Invisible spam protection without user friction
**When to use:** All public forms without authentication
**Example:**
```typescript
// Honeypot field - hidden from users, bots fill it
<div className="absolute -left-[9999px]" aria-hidden="true">
  <input
    type="text"
    name="website" // Generic name that attracts bots
    tabIndex={-1}
    autoComplete="one-time-code" // Prevents browser autofill
    {...register('honeypot')}
  />
</div>

// Server-side validation
if (body.honeypot) {
  // Silent rejection - don't reveal honeypot detection
  return NextResponse.json({ success: true }, { status: 201 });
}
```

### Pattern 2: Severity-Based Notification Routing
**What:** Different notification channels based on issue severity
**When to use:** When critical issues need immediate attention
**Example:**
```typescript
// Always create in-app notification
await prisma.notification.createMany({
  data: coachUserIds.map(userId => ({
    teamId,
    userId,
    type: 'DAMAGE_REPORT',
    title: `${severity === 'CRITICAL' ? '[CRITICAL] ' : ''}Damage: ${equipmentName}`,
    message: description.substring(0, 100),
    linkUrl: `/equipment/${equipmentId}`,
  })),
});

// Send email only for critical severity
if (severity === 'CRITICAL') {
  await sendCriticalAlert({
    teamName: equipment.team.name,
    equipmentName: equipment.name,
    reporterName,
    description,
    recipientEmails: coachEmails,
  });
}
```

### Pattern 3: Mobile-First Form Design
**What:** Form optimized for phone scanning workflow
**When to use:** Forms accessed primarily via mobile QR scan
**Example:**
```typescript
// Large touch targets for mobile
<input
  className="w-full h-12 text-base px-4 rounded-lg" // 48px height, 16px text
  inputMode="text" // Appropriate keyboard
/>

// Camera capture with environment (back) camera preferred
<input
  type="file"
  accept="image/jpeg,image/png,image/webp"
  capture="environment" // Back camera for damage photos
/>

// Radio buttons with large touch areas
<label className="flex items-center gap-3 p-4 rounded-lg border cursor-pointer">
  <input type="radio" value="minor" className="w-5 h-5" />
  <span className="text-base">Minor - Cosmetic damage</span>
</label>
```

### Anti-Patterns to Avoid
- **Multi-step forms:** Keep it single page - people report quickly then move on
- **Required account creation:** Public form must work without login
- **Complex dropdowns:** Use radio buttons for severity (3 options), simple dropdown for category
- **Auto-save drafts:** Not needed - simple one-time submission

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| QR code rendering | Canvas drawing | qrcode.react | Error correction, proper encoding, SVG/Canvas options |
| PDF generation | DOM-to-PDF hacks | jsPDF | Multi-page support, proper sizing, print-ready output |
| Rate limiting | In-memory counters | @upstash/ratelimit | Distributed, persistent, production-ready |
| Form validation | Manual checks | zod + react-hook-form | Type safety, consistent error messages |
| Email sending | Direct SMTP | Resend | Deliverability, React templates, webhooks |
| Bot detection | Complex captcha | Honeypot field | Zero user friction, effective against basic bots |

**Key insight:** The codebase already has most of these patterns established - extend, don't replace.

## Common Pitfalls

### Pitfall 1: QR Code URL Length
**What goes wrong:** Encoding too much data makes QR codes unscannable
**Why it happens:** Temptation to embed equipment metadata in QR code
**How to avoid:** Encode URL only - `{baseUrl}/report/{equipmentId}` - fetch details on page load
**Warning signs:** QR code becomes dense/complex, scanning fails on older phones

### Pitfall 2: Public Storage Uploads Without Limits
**What goes wrong:** Malicious users upload huge files, exhaust storage quota
**Why it happens:** Skipping file validation on "simple" public forms
**How to avoid:** Existing DamageReportForm already has 10MB limit and type validation - keep this
**Warning signs:** Storage costs spike, bucket fills unexpectedly

### Pitfall 3: Silent Failures on Rate Limit
**What goes wrong:** Legitimate users confused when submission fails silently
**Why it happens:** Returning generic error to hide rate limiting from bots
**How to avoid:** Show clear "too many submissions" message with retry time
**Warning signs:** Support tickets about "form not working"

### Pitfall 4: Email Notification Storms
**What goes wrong:** Multiple coaches get multiple emails per report
**Why it happens:** Sending to all coaches without deduplication
**How to avoid:** Use TeamSettings.damageNotifyUserIds (already exists) or default to team coaches
**Warning signs:** Coach complaints about email overload

### Pitfall 5: Bulk Export Memory Issues
**What goes wrong:** Browser crashes generating PDF with many QR codes
**Why it happens:** Loading all QR codes into memory at once
**How to avoid:** Generate QR codes in batches, process 10-20 at a time
**Warning signs:** Browser tab crashes on "Export All" with 100+ items

## Code Examples

Verified patterns from existing codebase:

### Public Form Page Structure
```typescript
// Source: /home/hb/radl/src/app/report/[equipmentId]/page.tsx
export default async function ReportDamagePage({ params }: Props) {
  const { equipmentId } = await params;

  const equipment = await prisma.equipment.findUnique({
    where: { id: equipmentId },
    include: { team: { select: { name: true, primaryColor: true, logoUrl: true } } },
  });

  if (!equipment || !equipment.team || !equipment.teamId) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-md mx-auto">
        {/* Team branding */}
        {/* Equipment info */}
        <DamageReportForm equipmentId={equipment.id} teamId={equipment.teamId} />
      </div>
    </div>
  );
}
```

### Rate Limiting Pattern
```typescript
// Source: /home/hb/radl/src/lib/rate-limit/index.ts
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

// In API route - FIRST thing before any DB operations
const clientIp = getClientIp(request);
const rateLimit = await checkRateLimit(clientIp, 'damage-report');

if (!rateLimit.success) {
  return NextResponse.json(
    { error: 'Too many damage reports. Please try again later.' },
    {
      status: 429,
      headers: {
        'Retry-After': String(Math.ceil((rateLimit.reset - Date.now()) / 1000)),
        'X-RateLimit-Limit': String(rateLimit.limit),
        'X-RateLimit-Remaining': String(rateLimit.remaining),
      }
    }
  );
}
```

### QR Code Display Component
```typescript
// Source: /home/hb/radl/src/components/equipment/qr-code-display.tsx
import { QRCodeSVG } from 'qrcode.react';

export function QRCodeDisplay({ equipmentId, size = 128 }: QRCodeDisplayProps) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== 'undefined' ? window.location.origin : '');
  const reportUrl = `${baseUrl}/report/${equipmentId}`;

  return (
    <QRCodeSVG
      value={reportUrl}
      size={size}
      level="M" // Medium error correction
    />
  );
}
```

### Photo Upload with Camera Capture
```typescript
// Source: /home/hb/radl/src/components/equipment/damage-report-form.tsx
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

<input
  type="file"
  accept="image/jpeg,image/jpg,image/png,image/webp"
  capture="environment" // Back camera for damage photos
  onChange={handlePhotoChange}
/>

const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    setPhotoError('Please select a JPG, PNG, or WebP image');
    return;
  }
  if (file.size > MAX_FILE_SIZE) {
    setPhotoError('Photo must be less than 10MB');
    return;
  }
  // ...
};
```

### Notification Creation Pattern
```typescript
// Source: /home/hb/radl/src/app/api/equipment/[id]/damage-reports/route.ts
// Get recipients from settings or default to coaches
let notifyUserIds: string[] = [];
const settings = await prisma.teamSettings.findUnique({
  where: { teamId },
  select: { damageNotifyUserIds: true },
});

if (settings?.damageNotifyUserIds?.length) {
  notifyUserIds = settings.damageNotifyUserIds;
} else {
  const coaches = await prisma.teamMember.findMany({
    where: { teamId, role: 'COACH' },
    select: { userId: true },
  });
  notifyUserIds = coaches.map(c => c.userId);
}

// Create notifications
await prisma.notification.createMany({
  data: notifyUserIds.map(userId => ({
    teamId,
    userId,
    type: 'DAMAGE_REPORT',
    title: `Damage reported: ${equipment.name}`,
    message: description.substring(0, 100) + (description.length > 100 ? '...' : ''),
    linkUrl: `/equipment/${equipment.id}`,
  })),
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| reCAPTCHA v2 | Honeypot + rate limiting | 2024+ | Better UX, no external dependency |
| html2canvas for PDF | jsPDF direct | Stable | More control, better print quality |
| Multiple email services | Resend + React Email | 2023+ | Simpler API, better DX |
| Anonymous forms | Required reporter name | Phase decision | Accountability for reports |

**Deprecated/outdated:**
- `qrcode` (CLI tool) - use `qrcode.react` for React integration
- `html2pdf.js` - use jsPDF directly for better control
- Captcha widgets - honeypot is sufficient for low-risk forms

## Open Questions

Things that couldn't be fully resolved:

1. **Email infrastructure setup**
   - What we know: Resend is the recommended library, needs API key and verified domain
   - What's unclear: Whether Resend is already configured or needs setup
   - Recommendation: Add RESEND_API_KEY to env, create lib/email/client.ts, gracefully degrade if not configured

2. **Issue categories list**
   - What we know: Context allows Claude's discretion (Hull, Rigging, Hardware, Other suggested)
   - What's unclear: Whether rowing-specific categories needed (e.g., Fin, Rudder, Oarlock)
   - Recommendation: Start with generic categories, expand based on usage

3. **Notification badge persistence**
   - What we know: In-app notifications use existing Notification model
   - What's unclear: Whether badge count should include public reports specifically
   - Recommendation: Use existing notification system - badge already shows unread count

## Sources

### Primary (HIGH confidence)
- **Existing codebase** - `/home/hb/radl/src/app/report/[equipmentId]/page.tsx`, damage-report-form.tsx, qr-code-display.tsx, rate-limit/index.ts
- **package.json** - qrcode.react ^4.2.0 already installed
- **Prisma schema** - DamageReport, Notification, TeamSettings models exist

### Secondary (MEDIUM confidence)
- [qrcode.react npm](https://www.npmjs.com/package/qrcode.react) - API reference for QR generation
- [jsPDF npm](https://www.npmjs.com/package/jspdf) - v4.0.0 for PDF generation
- [Resend Next.js docs](https://resend.com/docs/send-with-nextjs) - Email integration pattern
- [DEV.to honeypot article](https://dev.to/felipperegazio/how-to-create-a-simple-honeypot-to-protect-your-web-forms-from-spammers--25n8) - Spam protection pattern

### Tertiary (LOW confidence)
- Web search for "Next.js 16 public routes" - confirmed route structure unchanged
- Web search for "jsPDF multiple pages" - confirmed multi-page support exists

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already in use or well-documented
- Architecture: HIGH - patterns directly from existing codebase
- Pitfalls: HIGH - based on actual code review and common issues

**Research date:** 2026-01-26
**Valid until:** 2026-03-26 (60 days - stable domain, existing patterns)
