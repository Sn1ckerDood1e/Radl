# Phase 32: Safe Areas & Branding Foundation - Research

**Researched:** 2026-01-29
**Domain:** iOS Safe Areas, Tailwind v4 Theming, PWA Manifest, Branding Implementation
**Confidence:** HIGH

## Summary

This phase establishes proper safe area handling for notched iOS devices and updates the app branding from emerald to teal. The codebase already has partial implementations: safe area utility classes exist in `globals.css` but are not consistently applied, and brand colors are defined as CSS variables but hardcoded emerald classes remain throughout.

Key findings:
1. **Safe Areas:** The `viewport-fit: cover` property is supported via Next.js `Viewport` export and CSS safe area insets are ready but the viewport isn't configured for edge-to-edge display
2. **Color Migration:** 281 instances of hardcoded `emerald-*` classes across 99 files need replacement with CSS variable references
3. **Branding:** Manifest already updated to "Radl", icons exist but may need brand asset replacement when available

**Primary recommendation:** Configure viewport for edge-to-edge, apply safe area padding to bottom navigation, and systematically replace emerald classes with teal or CSS variable references.

## Standard Stack

The phase uses existing technologies - no new dependencies required.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Tailwind CSS | v4 | Styling with `@theme inline` for CSS variables | Already in stack, native CSS-first approach |
| Next.js | 16 | `Viewport` export for meta configuration | Native support for `viewportFit` since 13.2.3 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| CSS `env()` | Native | Safe area inset values | Fixed position elements |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hardcoded colors | CSS variables | More flexible, theming-ready, already partially implemented |
| `emerald-*` classes | `teal-*` classes | Simpler but prevents dynamic theming |

**No installation needed - all required tools already in codebase.**

## Architecture Patterns

### Safe Area Implementation Pattern

**Viewport Configuration (layout.tsx):**
```typescript
// Source: https://nextjs.org/docs/app/api-reference/functions/generate-viewport
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',  // Enable edge-to-edge
  themeColor: '#0d9488',
};
```

**CSS Safe Area Pattern:**
```css
/* Source: globals.css already has these */
.safe-area-inset-top {
  padding-top: env(safe-area-inset-top);
}

.safe-area-inset-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}

/* Combined padding for navigation */
.bottom-nav {
  padding-bottom: calc(0.5rem + env(safe-area-inset-bottom));
}
```

### Tailwind v4 Color Theming Pattern

**Using @theme inline for CSS Variable References:**
```css
/* Source: https://tailwindcss.com/docs/theme */
@import "tailwindcss";

:root {
  --brand-primary: #0d9488;    /* Teal */
  --brand-accent: #f59e0b;     /* Gold */
  --team-primary: #0d9488;     /* Default to brand */
}

@theme inline {
  /* Reference CSS variables for dynamic theming */
  --color-primary: var(--team-primary);
  --color-primary-foreground: #ffffff;
  --color-brand: var(--brand-primary);
  --color-accent: var(--brand-accent);
}
```

**Why `@theme inline`:** When referencing other CSS variables, the `inline` option ensures the variable value is resolved at the point of use, not at definition time. This is critical for team-specific color theming.

### Color Class Migration Pattern

**Before (hardcoded emerald):**
```tsx
className="bg-emerald-500 text-emerald-400 hover:bg-emerald-600"
```

**After (using brand teal):**
```tsx
// Option A: Direct teal classes (simpler)
className="bg-teal-500 text-teal-400 hover:bg-teal-600"

// Option B: CSS variable reference (more flexible, preferred for navigation)
className="bg-[var(--team-primary)] text-[var(--team-primary)] hover:bg-teal-400"

// Option C: Tailwind theme colors (when @theme defines them)
className="bg-primary text-primary-foreground hover:bg-primary/90"
```

### Recommended Project Structure
```
public/
├── icons/
│   ├── icon-192.png           # Standard icon (any purpose)
│   ├── icon-512.png           # Standard icon (any purpose)
│   ├── icon-maskable-192.png  # Maskable icon (with safe zone padding)
│   ├── icon-maskable-512.png  # Maskable icon
│   └── apple-touch-icon.png   # 180x180 for iOS
├── favicon.ico                 # 32x32 multi-size ICO
└── manifest.json
```

### Anti-Patterns to Avoid
- **Mixing emerald and teal:** All accent colors should use one palette - teal #0d9488
- **Using `purpose: "any maskable"`:** Split into separate icons for correct rendering
- **Applying safe-area-inset to scrollable content:** Only apply to fixed position elements

## Don't Hand-Roll

Problems that have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Safe area detection | JavaScript detection | CSS `env(safe-area-inset-*)` | Native, always up-to-date |
| Viewport meta | Manual meta tag | Next.js `Viewport` export | Type-safe, managed by framework |
| Color palette generation | Manual hex picking | Tailwind's teal palette | Consistent lightness/saturation scale |
| Maskable icon generation | Manual Photoshop | maskable.app tool | Validates safe zone automatically |

**Key insight:** Safe area handling is purely CSS - no JavaScript detection or polyfills needed. The `env()` function returns 0 on non-notched devices automatically.

## Common Pitfalls

### Pitfall 1: Safe Area Not Activating
**What goes wrong:** `env(safe-area-inset-bottom)` returns 0 even on notched devices
**Why it happens:** Missing `viewport-fit: cover` in viewport meta
**How to avoid:** Always set `viewportFit: 'cover'` in Next.js viewport export
**Warning signs:** Bottom navigation doesn't have extra padding on iPhone X+

### Pitfall 2: Bottom Nav Overlapping Home Indicator
**What goes wrong:** Tap targets conflict with iOS home indicator gesture
**Why it happens:** Only adding padding, not accounting for interaction
**How to avoid:** Apply safe area padding to the bottom navigation wrapper, not individual items
**Warning signs:** Users report difficulty tapping bottom nav items

### Pitfall 3: Inconsistent Color Migration
**What goes wrong:** Some areas still show emerald, others show teal
**Why it happens:** Find-replace misses conditional classes, dynamic concatenation
**How to avoid:** Use grep with context to find all patterns, verify visually
**Warning signs:** 281 emerald occurrences across 99 files

### Pitfall 4: Maskable Icons with Wrong Safe Zone
**What goes wrong:** Icon gets clipped on Android, important content cut off
**Why it happens:** Using same icon for `any` and `maskable` purposes
**How to avoid:** Create separate maskable icon with 40% radius safe zone
**Warning signs:** Logo cut off in Android launcher

### Pitfall 5: Apple Touch Icon Transparency
**What goes wrong:** iOS shows black background behind icon
**Why it happens:** Apple Touch Icons don't support transparency
**How to avoid:** Export apple-touch-icon.png with solid background (teal or dark)
**Warning signs:** Icon looks broken on iOS home screen

## Code Examples

### 1. Viewport Configuration
```typescript
// src/app/layout.tsx
// Source: https://nextjs.org/docs/app/api-reference/functions/generate-viewport
import type { Viewport } from "next";

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0d9488',
};
```

### 2. Bottom Navigation with Safe Area
```tsx
// src/app/(dashboard)/[teamSlug]/layout.tsx
// Current line 96 - needs safe area padding

// Before:
<nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
  <BottomNavigation teamSlug={teamSlug} />
</nav>

// After:
<nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden pb-[env(safe-area-inset-bottom)]">
  <BottomNavigation teamSlug={teamSlug} />
</nav>
```

### 3. Color Migration in Navigation
```tsx
// src/components/layout/bottom-navigation.tsx line 76
// Before:
${active ? 'text-emerald-500' : 'text-[var(--text-muted)]'}

// After:
${active ? 'text-teal-500' : 'text-[var(--text-muted)]'}
```

### 4. PWA Manifest with Separate Icons
```json
{
  "name": "Radl - Crew Team Management",
  "short_name": "Radl",
  "description": "Diligence wins. Manage your rowing team's schedule, lineups, and equipment.",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0a0a0a",
  "theme_color": "#0d9488",
  "orientation": "portrait-primary",
  "scope": "/",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-maskable-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "/icons/icon-maskable-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

### 5. Apple Web App Metadata
```typescript
// src/app/layout.tsx - update appleWebApp
export const metadata: Metadata = {
  title: "Radl - Rowing Team Management",
  description: "Diligence wins. Manage your rowing team's schedule, lineups, and equipment.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",  // Changed from "default"
    title: "Radl",
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};
```

## Current State Analysis

### What's Already Done
| Item | Status | Location |
|------|--------|----------|
| Brand name "Radl" | Complete | manifest.json, layout.tsx, dashboard-header.tsx |
| Brand colors CSS vars | Complete | globals.css lines 9-12 |
| Safe area utility classes | Complete | globals.css lines 217-222 |
| Teal theme color | Complete | layout.tsx line 29, manifest.json |

### What Needs Work
| Item | Scope | Effort |
|------|-------|--------|
| viewport-fit: cover | 1 file | Small |
| Bottom nav safe area | 1-2 files | Small |
| emerald -> teal migration | 99 files, 281 occurrences | Medium |
| PWA icon split (any/maskable) | manifest.json + generate icons | Medium |
| Apple touch icon | Generate 180x180 | Small |
| Crest in header (when available) | dashboard-header.tsx | Small |

### Emerald Occurrences by Category
| Pattern | Count | Action |
|---------|-------|--------|
| `emerald-500` (main accent) | ~150 | Replace with `teal-500` |
| `emerald-600` (darker) | ~50 | Replace with `teal-600` |
| `emerald-400` (lighter) | ~40 | Replace with `teal-400` |
| `emerald-500/20` (backgrounds) | ~30 | Replace with `teal-500/20` |
| Other emerald variants | ~11 | Context-specific replacement |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| emerald accent color | teal brand color | This phase | Visual consistency with brand |
| `purpose: "any maskable"` | Separate `any` and `maskable` icons | PWA best practice | Correct icon rendering on all platforms |
| `statusBarStyle: "default"` | `"black-translucent"` | iOS PWA | Full-screen edge-to-edge appearance |

**Deprecated/outdated:**
- Using single icon with dual purpose - causes incorrect masking on some platforms

## Open Questions

1. **Brand Crest Asset**
   - What we know: BRANDING.md specifies shield-only for app icons, full crest for larger uses
   - What's unclear: Are the actual crest assets available yet?
   - Recommendation: Implement header placeholder, add crest when asset is provided (BRND-05 notes "when asset is available")

2. **Team Color Override Scope**
   - What we know: CSS vars support `--team-primary` for per-team theming
   - What's unclear: Should all emerald replacements use `teal-*` directly or `var(--team-primary)`?
   - Recommendation: Use `teal-*` for brand elements (logo, app chrome), `var(--team-primary)` for team-contextual elements (active states in team views)

## Sources

### Primary (HIGH confidence)
- [Tailwind CSS Theme Variables](https://tailwindcss.com/docs/theme) - @theme directive, inline option, color namespaces
- [Next.js generateViewport](https://nextjs.org/docs/app/api-reference/functions/generate-viewport) - Viewport export, viewportFit support
- [Next.js Discussion #46542](https://github.com/vercel/next.js/discussions/46542) - viewportFit confirmed supported since 13.2.3

### Secondary (MEDIUM confidence)
- [MDN Define App Icons](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Define_app_icons) - PWA icon requirements
- [PWA Icon Requirements](https://logofoundry.app/blog/pwa-icon-requirements-safe-areas) - Maskable safe zone (40% radius)
- [shadcn/ui Theming](https://ui.shadcn.com/docs/theming) - CSS variable conventions

### Tertiary (LOW confidence)
- [tweakcn Theme Editor](https://tweakcn.com/) - Tool for generating theme variations (useful but optional)

## Metadata

**Confidence breakdown:**
- Safe area implementation: HIGH - Native CSS, well-documented, already partially in codebase
- Color migration: HIGH - Straightforward find-replace with visual verification
- PWA manifest: HIGH - Well-documented standards, current implementation close
- Viewport configuration: HIGH - Next.js official documentation confirms support

**Research date:** 2026-01-29
**Valid until:** 90 days (stable patterns, no expected changes)
