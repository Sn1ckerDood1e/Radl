# Component Library

## Overview

RowOps uses [shadcn/ui](https://ui.shadcn.com/) as its design system foundation, built on:

- **Tailwind CSS v4** - Utility-first CSS framework with CSS-first configuration
- **Radix UI** - Unstyled, accessible component primitives
- **class-variance-authority (cva)** - Component variant management
- **Zinc color scheme** - Neutral gray palette optimized for dark mode

## Architecture

### Design System Components (`src/components/ui/`)

shadcn/ui components are copy-pasted into the codebase (not a dependency), giving us full ownership and customization control.

**Current components:**
- `button.tsx` - Primary action component with 6 variants
- `dialog.tsx` - Modal dialogs with Radix Dialog primitive
- `dropdown-menu.tsx` - Contextual menus with Radix DropdownMenu primitive
- `input.tsx` - Form text inputs with focus states
- `select.tsx` - Dropdown selects with Radix Select primitive

### Legacy Components

Components in `src/components/` that predate the shadcn/ui migration remain in use. These should be gradually migrated to shadcn/ui equivalents.

**Migration pattern:**
1. When touching a legacy component, assess if a shadcn/ui equivalent exists
2. If yes, migrate to shadcn/ui component
3. If no, consider creating a shadcn/ui component with proper variants
4. Mark old component with `@deprecated` JSDoc tag
5. ESLint will warn on continued usage (see ESLint configuration below)

## Directory Structure

```
src/components/
├── ui/                    # shadcn/ui design system components
│   ├── button.tsx
│   ├── dialog.tsx
│   ├── dropdown-menu.tsx
│   ├── input.tsx
│   └── select.tsx
├── [feature]/             # Feature-specific components
└── README.md              # This file
```

## Migration Status

### Completed Migrations (5 components)

| Component | shadcn/ui Equivalent | Status | Notes |
|-----------|---------------------|--------|-------|
| Buttons | `ui/button.tsx` | ✅ Complete | 6 variants (default, destructive, outline, secondary, ghost, link) |
| Modals | `ui/dialog.tsx` | ✅ Complete | Radix Dialog with accessibility features |
| Dropdowns | `ui/dropdown-menu.tsx` | ✅ Complete | Radix DropdownMenu with full menu system |
| Text Inputs | `ui/input.tsx` | ✅ Complete | Standard form inputs with focus states |
| Select Inputs | `ui/select.tsx` | ✅ Complete | Radix Select with custom styling |

### Not Yet Migrated

All other existing components remain on legacy patterns. Migrate opportunistically when working in related areas.

## Usage Guidelines

### Using shadcn/ui Components

```tsx
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

function MyComponent() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Open Dialog</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Example Dialog</DialogTitle>
        </DialogHeader>
        <p>Dialog content here</p>
      </DialogContent>
    </Dialog>
  );
}
```

### Component Variants

shadcn/ui components use `class-variance-authority` for variant management:

```tsx
// Button variants
<Button variant="default">Default</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Secondary</Button>
<Button variant="ghost">Tertiary</Button>
<Button variant="link">Link Style</Button>

// Button sizes
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
<Button size="icon">Icon Only</Button>
```

### Deprecation Workflow

When migrating a component:

1. **Create shadcn/ui version** in `src/components/ui/`
2. **Mark old component as deprecated**:
```tsx
/**
 * @deprecated Use `Button` from `@/components/ui/button` instead.
 */
export function OldButton() {
  // ...
}
```
3. **ESLint will warn** on continued usage via `@typescript-eslint/no-deprecated` rule
4. **Update imports** across codebase over time
5. **Remove old component** once all usage is migrated

## Theme Integration

### CSS Variables

shadcn/ui components use CSS variables mapped to our existing theme system:

```css
/* globals.css @theme inline block */
--color-primary: var(--team-primary);     /* Maps to existing team colors */
--color-card: var(--surface-2);           /* Maps to zinc surface palette */
--color-border: var(--border);            /* Maps to existing borders */
```

This approach:
- Preserves original CSS variable structure
- Avoids breaking existing components
- Allows shadcn/ui to use our theme automatically
- Maintains team color customization

### Dark Mode

All shadcn/ui components respect the `.dark` class applied to the root element via our theme switcher.

## Mobile Touch Targets

All interactive components automatically meet WCAG 2.5.5 touch target guidelines (44px minimum) on mobile devices via global CSS:

```css
/* globals.css - only applies to screens ≤768px */
@media (max-width: 768px) {
  button, [role="button"], .btn {
    min-height: 44px;
    min-width: 44px;
  }
}
```

Desktop retains compact sizing for information density.

## Adding New shadcn Components

Use the shadcn CLI to add new components:

```bash
npx shadcn@latest add [component-name]
```

**Example:**
```bash
npx shadcn@latest add card
npx shadcn@latest add tabs
npx shadcn@latest add toast
```

The CLI:
1. Downloads component source to `src/components/ui/`
2. Installs required Radix dependencies
3. Configures component to use our theme variables
4. Adds TypeScript types

**After adding:**
1. Review generated code for any customization needs
2. Verify theme variable mapping
3. Test in both light and dark mode
4. Update this README's "Completed Migrations" table

## Utilities

### `cn()` Function

The `lib/utils.ts` file exports a `cn()` utility for combining Tailwind classes:

```tsx
import { cn } from '@/lib/utils';

<button className={cn(
  "base-styles",
  variant === "primary" && "primary-styles",
  variant === "secondary" && "secondary-styles",
  className
)}>
  {children}
</button>
```

Benefits:
- Merges Tailwind classes intelligently (last class wins)
- Handles conditional classes
- Removes duplicate classes
- Powered by `clsx` + `tailwind-merge`

## ESLint Configuration

The project's `eslint.config.mjs` includes the `@typescript-eslint/no-deprecated` rule to warn when deprecated components are used:

```javascript
{
  files: ['src/**/*.ts', 'src/**/*.tsx'],
  languageOptions: {
    parserOptions: {
      projectService: true,
    },
  },
  rules: {
    '@typescript-eslint/no-deprecated': 'warn',
  },
}
```

This helps prevent component drift during migration by surfacing deprecated usage during development.

## Resources

- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [Radix UI Primitives](https://www.radix-ui.com/primitives)
- [Tailwind CSS v4 Docs](https://tailwindcss.com/docs)
- [class-variance-authority](https://cva.style/docs)
