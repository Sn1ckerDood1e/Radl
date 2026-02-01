'use client';

/**
 * Available membership roles with descriptions.
 */
const ROLES = [
  {
    value: 'FACILITY_ADMIN',
    label: 'Facility Admin',
    description: 'Full facility access',
  },
  {
    value: 'CLUB_ADMIN',
    label: 'Club Admin',
    description: 'Manage club settings and members',
  },
  {
    value: 'COACH',
    label: 'Coach',
    description: 'Create practices and lineups',
  },
  {
    value: 'ATHLETE',
    label: 'Athlete',
    description: 'View assigned practices',
  },
  {
    value: 'PARENT',
    label: 'Parent',
    description: 'View athlete information',
  },
] as const;

interface RoleSelectorProps {
  /**
   * Currently selected roles.
   */
  value: string[];
  /**
   * Callback when role selection changes.
   */
  onChange: (roles: string[]) => void;
  /**
   * Whether the selector is disabled.
   */
  disabled?: boolean;
}

/**
 * Multi-role checkbox selector for membership roles.
 *
 * Displays all available roles with descriptions.
 * Uses native checkboxes with custom styling (checkbox UI not available in project).
 *
 * @example
 * ```tsx
 * <RoleSelector
 *   value={selectedRoles}
 *   onChange={setSelectedRoles}
 * />
 * ```
 */
export function RoleSelector({ value, onChange, disabled = false }: RoleSelectorProps) {
  const toggleRole = (role: string) => {
    if (value.includes(role)) {
      onChange(value.filter((r) => r !== role));
    } else {
      onChange([...value, role]);
    }
  };

  return (
    <div className="space-y-2">
      {ROLES.map((role) => (
        <label
          key={role.value}
          className={`flex items-start gap-3 p-3 rounded-lg border border-[var(--border-subtle)] cursor-pointer hover:bg-[var(--surface-2)] transition-colors ${
            disabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <input
            type="checkbox"
            checked={value.includes(role.value)}
            onChange={() => toggleRole(role.value)}
            disabled={disabled}
            className="mt-0.5 h-4 w-4 rounded border-[var(--border-subtle)] text-teal-500 focus:ring-teal-500 focus:ring-offset-0 cursor-pointer disabled:cursor-not-allowed"
          />
          <div className="flex-1">
            <p className="font-medium text-[var(--text-primary)]">{role.label}</p>
            <p className="text-sm text-[var(--text-muted)]">{role.description}</p>
          </div>
        </label>
      ))}
    </div>
  );
}
