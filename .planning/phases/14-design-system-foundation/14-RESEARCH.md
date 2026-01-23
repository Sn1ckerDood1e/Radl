# Phase 14: Design System Foundation - Research

**Researched:** 2026-01-23
**Domain:** shadcn/ui + Tailwind v4 + Design Systems
**Confidence:** HIGH

## Summary

shadcn/ui now fully supports Tailwind v4 with OKLCH color format, CSS-first configuration using `@theme inline` directives, and React 19 compatibility. The migration from an existing Tailwind v4 setup requires careful CSS variable mapping to maintain both existing theme variables and shadcn's expected variables.

The standard approach is to map existing CSS variables to shadcn's expected namespace using `@theme inline`, which ensures both systems coexist without conflicts. Components are installed via CLI (`npx shadcn@latest add component-name`), which copies source code directly into the project with full ownership. Component dependencies are automatically resolved by the CLI.

For migration tracking, the modern approach uses TypeScript ESLint's built-in `@typescript-eslint/no-deprecated` rule with JSDoc `@deprecated` tags, eliminating the need for custom ESLint rules. Mobile touch targets follow WCAG 2.5.5 (44x44px minimum) and should be applied responsively using media queries.

**Primary recommendation:** Initialize shadcn/ui with `npx shadcn@latest init`, configure components.json for Tailwind v4, map existing CSS variables using `@theme inline` directive, and use TypeScript's `@deprecated` JSDoc tags for component deprecation tracking.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| shadcn/ui | Latest | Component library (copy-paste) | Industry standard for copy-paste component ownership, Tailwind v4 native |
| Tailwind CSS | v4 | CSS framework | Already installed, CSS-first config with @theme directive |
| tw-animate-css | Latest | Animation library | Replaces deprecated tailwindcss-animate in v4 |
| Radix UI | Latest | Headless UI primitives | shadcn/ui's foundation for accessibility and behavior |
| lucide-react | 0.562.0 | Icon library | Already installed, shadcn/ui's default icon library |
| class-variance-authority | Latest | Variant styling | Component variant management |
| tailwind-merge | Latest | Class merging utility | Prevents Tailwind class conflicts |
| clsx | Latest | Conditional class utility | Simplifies className logic |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @typescript-eslint/eslint-plugin | Latest | TypeScript linting | Deprecation warnings via @deprecated |
| react-hook-form | 7.71.1 | Form management | Already installed, pairs with shadcn Form components |
| zod | 4.3.5 | Schema validation | Already installed, form validation with shadcn |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| shadcn/ui | Radix UI directly | More setup, no styling defaults |
| shadcn/ui | Chakra UI / MUI | Runtime dependency, less customization |
| @typescript-eslint/no-deprecated | Custom ESLint rule | More maintenance, reinventing the wheel |
| tw-animate-css | tailwindcss-animate | Deprecated in Tailwind v4 |

**Installation:**
```bash
# Initialize shadcn/ui (creates components.json, adds utils, installs deps)
npx shadcn@latest init

# Install specific components (Button, Dialog, Select, Input, DropdownMenu)
npx shadcn@latest add button dialog select input dropdown-menu
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   ├── ui/                    # shadcn/ui components (CLI-installed)
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   ├── select.tsx
│   │   ├── input.tsx
│   │   └── dropdown-menu.tsx
│   ├── forms/                 # Form components (use shadcn Input/Select)
│   ├── layout/                # Layout components (use shadcn primitives)
│   └── [feature]/             # Feature-specific components
├── lib/
│   └── utils.ts               # cn() utility (shadcn-generated)
├── hooks/                     # Custom React hooks
└── app/
    └── globals.css            # Tailwind + theme variables + @theme inline
```

### Pattern 1: CSS Variable Mapping (Existing + shadcn Coexistence)
**What:** Map existing CSS variables to shadcn's expected namespace using `@theme inline`
**When to use:** When you have existing theme variables and want to preserve them while adding shadcn

**Example:**
```css
/* globals.css */
@import "tailwindcss";
@import "tw-animate-css";

/* Existing variables (keep as-is) */
:root {
  --background: #0a0a0a;
  --foreground: #ededed;
  --surface-1: #18181b;
  --surface-2: #27272a;
  --surface-3: #3f3f46;
  --border: #3f3f46;
  --border-subtle: #27272a;
  --text-primary: #fafafa;
  --text-secondary: #a1a1aa;
  --text-muted: #71717a;
  --team-primary: #10b981;
  --team-secondary: #6ee7b7;
}

.light {
  --background: #fafafa;
  --foreground: #18181b;
  --surface-1: #ffffff;
  --surface-2: #f4f4f5;
  --surface-3: #e4e4e7;
  --border: #d4d4d8;
  --border-subtle: #e4e4e7;
  --text-primary: #18181b;
  --text-secondary: #52525b;
  --text-muted: #71717a;
}

.dark {
  --background: #0a0a0a;
  --foreground: #ededed;
  --surface-1: #18181b;
  --surface-2: #27272a;
  --surface-3: #3f3f46;
  --border: #3f3f46;
  --border-subtle: #27272a;
  --text-primary: #fafafa;
  --text-secondary: #a1a1aa;
  --text-muted: #71717a;
}

/* Map to shadcn namespace using @theme inline */
@theme inline {
  /* Core shadcn variables */
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--surface-2);
  --color-card-foreground: var(--text-primary);
  --color-popover: var(--surface-2);
  --color-popover-foreground: var(--text-primary);
  --color-primary: var(--team-primary);
  --color-primary-foreground: #ffffff;
  --color-secondary: var(--surface-3);
  --color-secondary-foreground: var(--text-primary);
  --color-muted: var(--surface-3);
  --color-muted-foreground: var(--text-muted);
  --color-accent: var(--surface-3);
  --color-accent-foreground: var(--text-primary);
  --color-destructive: oklch(0.55 0.22 25);
  --color-destructive-foreground: #ffffff;
  --color-border: var(--border);
  --color-input: var(--border);
  --color-ring: var(--team-primary);

  /* Border radius */
  --radius: 0.5rem;
}
```
**Source:** [shadcn/ui Theming](https://ui.shadcn.com/docs/theming), [Tailwind v4 Theme Docs](https://tailwindcss.com/docs/theme)

### Pattern 2: Component Installation Order (Dependencies Matter)
**What:** Install components in dependency order to avoid missing primitives
**When to use:** When installing multiple shadcn/ui components

**Example:**
```bash
# Button has no dependencies - install first
npx shadcn@latest add button

# Dialog depends on Button (for close button)
npx shadcn@latest add dialog

# Select is independent
npx shadcn@latest add select

# Input is independent
npx shadcn@latest add input

# DropdownMenu depends on Button (for trigger)
npx shadcn@latest add dropdown-menu

# Or install all at once - CLI resolves dependencies automatically
npx shadcn@latest add button dialog select input dropdown-menu
```
**Source:** [shadcn/ui Installation](https://ui.shadcn.com/docs/installation)

### Pattern 3: Responsive Touch Targets (Mobile-First)
**What:** Apply 44px touch targets on mobile breakpoints only
**When to use:** For all interactive elements (buttons, inputs, selects)

**Example:**
```css
/* globals.css - after @theme inline */
@media (max-width: 768px) {
  /* Buttons */
  button,
  [role="button"],
  .btn {
    min-height: 44px;
    min-width: 44px;
    padding: 12px 16px;
  }

  /* Form inputs */
  input[type="text"],
  input[type="email"],
  input[type="password"],
  input[type="number"],
  input[type="date"],
  input[type="time"],
  select,
  textarea {
    min-height: 44px;
  }

  /* Icon-only buttons need explicit sizing */
  button:has(svg:only-child),
  [role="button"]:has(svg:only-child) {
    width: 44px;
    height: 44px;
    padding: 0;
  }
}
```
**Source:** [WCAG 2.5.5 Target Size](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html), [Smashing Magazine Accessible Tap Targets](https://www.smashingmagazine.com/2023/04/accessible-tap-target-sizes-rage-taps-clicks/)

### Pattern 4: Component Deprecation with TypeScript
**What:** Use JSDoc `@deprecated` tags with TypeScript ESLint's built-in rule
**When to use:** When marking old custom components as deprecated during migration

**Example:**
```typescript
// components/old/CustomButton.tsx
/**
 * @deprecated Use `@/components/ui/button` from shadcn/ui instead.
 * This custom implementation will be removed in the next major version.
 */
export function CustomButton({ children, ...props }: ButtonProps) {
  // old implementation
}

// eslint.config.js (ESLint flat config)
import tseslint from '@typescript-eslint/eslint-plugin';

export default [
  {
    plugins: {
      '@typescript-eslint': tseslint
    },
    rules: {
      '@typescript-eslint/no-deprecated': 'warn' // Warns when deprecated code is used
    }
  }
];
```
**Source:** [TypeScript ESLint no-deprecated](https://typescript-eslint.io/rules/no-deprecated/), [ESLint Custom Rules](https://eslint.org/docs/latest/extend/custom-rules)

### Anti-Patterns to Avoid

- **Don't modify shadcn/ui component files directly after installation** — Copy and rename instead; shadcn updates will overwrite your changes
- **Don't use `@theme` without `inline` for variable references** — Causes CSS variable resolution issues in nested contexts
- **Don't mix HSL and OKLCH formats** — Tailwind v4 uses OKLCH; convert all colors for consistency
- **Don't override `--team-primary` with shadcn's `--primary`** — Keep dynamic team colors separate from static app accent colors
- **Don't skip `components.json` configuration** — CLI relies on it for correct file placement and import aliases

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Accessible dialogs/modals | Custom overlay + focus trap + ESC handling | shadcn Dialog (Radix Dialog) | Focus management, scroll locking, portal rendering, keyboard navigation (ESC, Tab), ARIA attributes all built-in |
| Form inputs with validation | Custom styled inputs + error states | shadcn Input + react-hook-form + zod | Already in stack, integrates seamlessly, handles validation, error states, accessibility |
| Dropdown menus | Custom popover positioning | shadcn DropdownMenu (Radix DropdownMenu) | Collision detection, viewport boundary awareness, keyboard navigation, nested menus |
| Select components | Styled `<select>` or custom dropdown | shadcn Select (Radix Select) | Searchable, accessible, keyboard navigation, custom rendering, mobile-friendly |
| Component variants (sizes, colors) | Manual className props | class-variance-authority | Type-safe variants, better DX, less boilerplate |
| Dark mode toggle | Manual localStorage + class toggling | Existing ThemeProvider + shadcn DropdownMenu | Already implemented, just needs UI component |
| CSS class merging | Manual string concatenation | tailwind-merge + clsx | Prevents Tailwind class conflicts, handles conditional logic |
| Touch target enforcement | Manual padding/sizing | Responsive CSS utility classes | Centralized, consistent, easier to maintain |

**Key insight:** Accessibility is the hidden complexity. shadcn/ui components built on Radix UI handle ARIA attributes, focus management, keyboard navigation, screen reader support, and edge cases that are easy to miss in custom implementations.

## Common Pitfalls

### Pitfall 1: CSS Variable Namespace Conflicts
**What goes wrong:** shadcn expects `--color-*` namespace for color utilities, but existing variables use different names (`--surface-1`, `--text-primary`), causing components to have no styling or wrong colors.

**Why it happens:** Tailwind v4's `@theme` directive generates utilities from CSS variables with specific namespaces. Variables not in `--color-*` namespace won't generate color utilities.

**How to avoid:**
- Use `@theme inline` to map existing variables to shadcn's expected names
- Keep existing variables unchanged (for backward compatibility)
- Map both light and dark mode variables inside `@theme inline` block

**Warning signs:**
- shadcn components render with no background color
- Utilities like `bg-card` or `text-muted-foreground` have no effect
- Console warnings about undefined CSS variables

**Example fix:**
```css
/* WRONG - shadcn variables override existing ones */
:root {
  --color-background: #0a0a0a; /* Conflicts with existing --background */
}

/* RIGHT - map existing to shadcn namespace */
@theme inline {
  --color-background: var(--background); /* References existing variable */
}
```

### Pitfall 2: Animation Library Mismatch
**What goes wrong:** Components that use animations don't animate, or build fails with "tailwindcss-animate plugin not found" error.

**Why it happens:** Tailwind v4 deprecated `tailwindcss-animate` in favor of `tw-animate-css`. shadcn/ui now uses `tw-animate-css` by default, but documentation or old guides may reference the old plugin.

**How to avoid:**
- During `shadcn init`, ensure `tw-animate-css` is installed (it should be automatic)
- Verify `globals.css` has `@import "tw-animate-css";` not `@plugin 'tailwindcss-animate';`
- If migrating existing project, remove `tailwindcss-animate` from dependencies

**Warning signs:**
- Dialog fade-in animations don't work
- Select dropdown doesn't slide in
- Build error: "Cannot find module 'tailwindcss-animate'"

**Example fix:**
```css
/* WRONG - old Tailwind v3 approach */
@import "tailwindcss";
@plugin "tailwindcss-animate";

/* RIGHT - Tailwind v4 approach */
@import "tailwindcss";
@import "tw-animate-css";
```

### Pitfall 3: components.json Locked Settings
**What goes wrong:** Trying to change `style`, `tailwind.baseColor`, or `tailwind.cssVariables` after initialization has no effect or breaks components.

**Why it happens:** These settings are "locked" after initialization because they fundamentally change how components are generated. Switching requires reinstalling all components.

**How to avoid:**
- Carefully choose settings during `shadcn init`:
  - `style: "new-york"` (compact, modern)
  - `tailwind.baseColor: "zinc"` (matches existing palette)
  - `tailwind.cssVariables: true` (enables CSS variable theming)
- If you need to change later, commit current work, delete components/ui directory, update components.json, and reinstall components

**Warning signs:**
- Changing components.json has no effect on new components
- Components have inconsistent styling
- Type errors in component files after config change

**Source:** [shadcn/ui components.json](https://ui.shadcn.com/docs/components-json)

### Pitfall 4: OKLCH Color Format Confusion
**What goes wrong:** Colors look wrong, gradients break, or color pickers don't work in dev tools.

**Why it happens:** Tailwind v4 uses OKLCH instead of HSL. OKLCH has different syntax and color space (perceptual uniformity), so direct HSL-to-OKLCH conversion without tools can result in different perceived colors.

**How to avoid:**
- Use color conversion tools (e.g., [shadcn Color Converter](https://www.shadcn.studio/resources/tools/color-converter))
- For existing HSL colors, convert to OKLCH during migration
- Understand OKLCH syntax: `oklch(lightness chroma hue)` where lightness is 0-1, chroma is 0-0.4, hue is 0-360

**Warning signs:**
- Colors appear more vibrant or muted than expected
- VSCode color picker shows wrong preview
- Chrome DevTools color picker doesn't work with OKLCH

**Example fix:**
```css
/* WRONG - mixing HSL and OKLCH */
:root {
  --background: hsl(0 0% 4%);           /* HSL format */
  --foreground: oklch(0.93 0.01 106);  /* OKLCH format */
}

/* RIGHT - consistent OKLCH format */
:root {
  --background: oklch(0.04 0 0);       /* OKLCH format */
  --foreground: oklch(0.93 0.01 106);  /* OKLCH format */
}
```

**Source:** [shadcn/ui Tailwind v4 Migration](https://ui.shadcn.com/docs/tailwind-v4), [Tailwind Colors OKLCH](https://ui.shadcn.com/colors)

### Pitfall 5: Mobile Touch Targets on Desktop
**What goes wrong:** Desktop UI looks bloated with oversized buttons and inputs, wasting screen space.

**Why it happens:** Applying 44px minimum touch targets globally instead of using responsive breakpoints.

**How to avoid:**
- Use media queries to apply touch targets only on mobile (`@media (max-width: 768px)`)
- Desktop can use smaller sizes (32-36px) for compact UI
- Use Tailwind's responsive utilities: `min-h-9 md:min-h-11` (36px desktop, 44px mobile)

**Warning signs:**
- Desktop users complain about "too much whitespace"
- Buttons look comically large on large screens
- UI density feels wrong compared to other web apps

**Example fix:**
```css
/* WRONG - global 44px minimum */
button {
  min-height: 44px;
}

/* RIGHT - responsive sizing */
@media (max-width: 768px) {
  button {
    min-height: 44px;
  }
}
/* Desktop uses default sizing (32-36px) */
```

**Source:** [WCAG 2.5.5 Target Size](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html)

### Pitfall 6: Overwriting Installed Components
**What goes wrong:** Running `shadcn add` for already-installed component overwrites customizations without warning.

**Why it happens:** shadcn CLI copies files directly to `components/ui/`. Re-running `add` replaces the file.

**How to avoid:**
- Commit before adding/updating components
- If customizing, copy component to different directory (e.g., `components/custom/`)
- Use `--overwrite` flag intentionally when updating: `npx shadcn@latest add button --overwrite`

**Warning signs:**
- Custom button variant disappears after running `shadcn add button`
- Git shows unexpected changes in components/ui/ files

**Source:** [shadcn/ui Philosophy](https://ui.shadcn.com/)

### Pitfall 7: Missing `use client` Directives
**What goes wrong:** Next.js App Router errors: "You're importing a component that needs useState. It only works in a Client Component..."

**Why it happens:** shadcn components use React hooks (`useState`, `useEffect`) and must be client components. The CLI adds `use client` automatically, but manual edits or RSC confusion can cause issues.

**How to avoid:**
- Let shadcn CLI install components (ensures correct directives)
- Set `rsc: true` in components.json for Next.js App Router
- If manually editing, add `'use client';` at top of file for any component using hooks

**Warning signs:**
- Runtime error about hooks in Server Components
- Components don't render in App Router pages
- Build fails with "use client" related errors

**Source:** [shadcn/ui Next.js Installation](https://ui.shadcn.com/docs/installation/next)

## Code Examples

Verified patterns from official sources:

### Basic Button Usage
```typescript
// Source: https://ui.shadcn.com/docs/components/button
import { Button } from "@/components/ui/button";

export function ButtonDemo() {
  return (
    <>
      <Button>Default</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="destructive">Destructive</Button>

      {/* Sizes */}
      <Button size="sm">Small</Button>
      <Button size="default">Default</Button>
      <Button size="lg">Large</Button>
      <Button size="icon">
        <ChevronRight className="h-4 w-4" />
      </Button>

      {/* As link */}
      <Button asChild>
        <a href="/login">Login</a>
      </Button>
    </>
  );
}
```

### Dialog with Form
```typescript
// Source: https://ui.shadcn.com/docs/components/dialog
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function DialogDemo() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Edit Profile</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>
            Make changes to your profile here. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Input id="name" placeholder="Name" />
          <Input id="username" placeholder="Username" />
        </div>
        <Button type="submit">Save changes</Button>
      </DialogContent>
    </Dialog>
  );
}
```

### Select with Form
```typescript
// Source: https://ui.shadcn.com/docs/components/select
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function SelectDemo() {
  return (
    <Select>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select theme" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="light">Light</SelectItem>
        <SelectItem value="dark">Dark</SelectItem>
        <SelectItem value="system">System</SelectItem>
      </SelectContent>
    </Select>
  );
}
```

### DropdownMenu for Theme Toggle
```typescript
// Source: https://ui.shadcn.com/docs/components/dropdown-menu
import { Moon, Sun, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/components/providers/theme-provider";

export function ThemeToggle() {
  const { setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun className="mr-2 h-4 w-4" />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon className="mr-2 h-4 w-4" />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <Monitor className="mr-2 h-4 w-4" />
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

### Touch Target Responsive Utilities
```typescript
// Source: WCAG 2.5.5 + Tailwind responsive design
// Apply via className for component-level control
export function ResponsiveTouchButton() {
  return (
    <Button
      size="sm"
      className="min-h-9 md:min-h-11" // 36px desktop, 44px mobile
    >
      Click me
    </Button>
  );
}

// For icon-only buttons
export function IconButton() {
  return (
    <Button
      size="icon"
      className="size-9 md:size-11" // 36x36px desktop, 44x44px mobile
    >
      <Settings className="h-4 w-4" />
    </Button>
  );
}
```

### ESLint Config for Deprecation Warnings
```javascript
// Source: https://typescript-eslint.io/rules/no-deprecated/
// eslint.config.js (ESLint flat config)
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: true,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      '@typescript-eslint/no-deprecated': 'warn', // Warn on deprecated component usage
    },
  },
];

// Mark old components as deprecated
/**
 * @deprecated Use `Button` from `@/components/ui/button` instead.
 * This component will be removed in v2.0.
 */
export function OldButton(props: ButtonProps) {
  // ...
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| HSL color format | OKLCH color format | Tailwind v4 (Dec 2024) | Better perceptual uniformity, consistent lightness across hues |
| tailwindcss-animate plugin | tw-animate-css | Tailwind v4 (Mar 2025) | Native v4 compatibility, no plugin config needed |
| JavaScript tailwind.config.js | CSS-first @theme directive | Tailwind v4 (Dec 2024) | No build step for theme changes, native CSS features |
| React.forwardRef | Direct component props | React 19 (Apr 2025) | Simpler API, automatic ref forwarding |
| @theme (without inline) | @theme inline for variable refs | Tailwind v4 (Dec 2024) | Fixes nested variable resolution issues |
| shadcn "default" style | shadcn "new-york" style | Jan 2025 | More compact, modern design; "default" deprecated |
| Custom ESLint rules | @typescript-eslint/no-deprecated | Built-in (always existed) | Leverages TypeScript's native @deprecated JSDoc tag |
| eslint-plugin-local | Direct plugin definition in flat config | ESLint v9 (2024) | Simpler local rule setup, no extra dependency |

**Deprecated/outdated:**
- **tailwindcss-animate**: Replaced by tw-animate-css in Tailwind v4 (still works in v3 projects)
- **shadcn "default" style**: Deprecated in favor of "new-york" style (Jan 2025)
- **HSL color values in Tailwind v4**: OKLCH is now standard for better color science
- **React.forwardRef**: No longer needed in React 19, though still works
- **@plugin directive**: Tailwind v4 uses @import for plugins instead

## Open Questions

Things that couldn't be fully resolved:

1. **Exact OKLCH values for existing HSL colors**
   - What we know: Existing colors are HSL, shadcn uses OKLCH, conversion tools exist
   - What's unclear: Whether to convert exact HSL values or use shadcn's default OKLCH palette
   - Recommendation: Use conversion tool for team colors (need exact match), use shadcn defaults for neutrals (better accessibility)

2. **Impact of 44px touch targets on form-dense pages**
   - What we know: WCAG recommends 44px, responsive approach applies only on mobile
   - What's unclear: How this affects pages with many form inputs (e.g., event creation form with 15+ fields)
   - Recommendation: Test on mobile devices, consider multi-step forms if single page becomes too long

3. **Migration timeline for 59 existing components**
   - What we know: Incremental migration is recommended, ESLint warnings guide updates
   - What's unclear: Which components beyond top 5 are highest priority
   - Recommendation: Track usage analytics (if available) or grep for most-imported components; prioritize by frequency of use

4. **Compatibility with existing MFA dialog**
   - What we know: Custom MFA dialog exists, shadcn Dialog should replace it
   - What's unclear: Whether MFA-specific logic (QR code, backup codes) is easily portable
   - Recommendation: Audit src/components/mfa/ before migration; may need custom Dialog content

## Sources

### Primary (HIGH confidence)
- [shadcn/ui Tailwind v4 Migration Guide](https://ui.shadcn.com/docs/tailwind-v4) - Official migration steps, OKLCH conversion, animation library changes
- [shadcn/ui Theming Documentation](https://ui.shadcn.com/docs/theming) - CSS variables, color configuration, @theme inline usage
- [Tailwind CSS v4 Theme Documentation](https://tailwindcss.com/docs/theme) - @theme directive, @theme inline, CSS variable namespaces
- [shadcn/ui components.json Schema](https://ui.shadcn.com/docs/components-json) - Configuration options, locked settings, aliases
- [shadcn/ui Component Docs](https://ui.shadcn.com/docs/components/button) - Button, Dialog, Select, Input, DropdownMenu installation and usage
- [TypeScript ESLint no-deprecated Rule](https://typescript-eslint.io/rules/no-deprecated/) - Built-in deprecation warnings
- [ESLint Custom Rules Documentation](https://eslint.org/docs/latest/extend/custom-rules) - Custom rule creation (for reference)
- [WCAG 2.5.5 Target Size](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html) - Official 44x44px recommendation

### Secondary (MEDIUM confidence)
- [Updating shadcn/ui to Tailwind 4 - Shadcnblocks](https://www.shadcnblocks.com/blog/tailwind4-shadcn-themeing/) - Real-world migration experience, CSS variable mapping patterns
- [Tailwind v4 Best Practices Discussion](https://github.com/tailwindlabs/tailwindcss/discussions/18471) - Community patterns for @theme inline
- [Smashing Magazine Accessible Tap Targets](https://www.smashingmagazine.com/2023/04/accessible-tap-target-sizes-rage-taps-clicks/) - Touch target best practices, responsive sizing
- [ESLint Flat Config with Custom Rules - Medium](https://medium.com/@ignatovich.dm/creating-and-using-custom-local-eslint-rules-with-eslint-plugin-local-rules-428d510db78f) - Modern ESLint flat config patterns

### Tertiary (LOW confidence)
- WebSearch results for "shadcn/ui component installation dependencies" - General ecosystem information, not verified against official docs
- Community discussions on GitHub issues - Anecdotal migration experiences

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official docs confirm all libraries, versions verified against package.json
- Architecture patterns: HIGH - All patterns sourced from official shadcn/ui and Tailwind docs
- CSS variable mapping: HIGH - Verified with official Tailwind v4 @theme inline documentation
- ESLint deprecation: HIGH - TypeScript ESLint official docs, well-established pattern
- Touch targets: HIGH - WCAG official standard, multiple authoritative sources agree
- Pitfalls: MEDIUM - Mix of official docs (animation library, color format) and community reports (component overwriting, touch target sizing)

**Research date:** 2026-01-23
**Valid until:** 2026-02-23 (30 days - stable ecosystem, Tailwind v4 and shadcn/ui mature)
