'use client';

import { createContextualCan } from '@casl/react';
import type { AnyAbility } from '@casl/ability';
import { AbilityContext } from './ability-provider';

/**
 * Bound Can component for permission-based rendering.
 *
 * Uses AbilityContext to get the current ability instance.
 * Renders children only if user has the specified permission.
 *
 * Usage:
 * ```tsx
 * // Hide element if no permission
 * <Can I="create" a="Practice">
 *   <Button>Create Practice</Button>
 * </Can>
 *
 * // Render function for more control (e.g., disabled state)
 * <Can I="create" a="Practice" passThrough>
 *   {(allowed) => (
 *     <Button disabled={!allowed}>Create Practice</Button>
 *   )}
 * </Can>
 *
 * // With specific subject instance for field-level checks
 * <Can I="update" this={practice}>
 *   <EditButton />
 * </Can>
 * ```
 *
 * Note: Must be used inside AbilityProvider. If used outside, ability will be null
 * and all permission checks will fail (safe default behavior).
 */
export const Can = createContextualCan(AbilityContext.Consumer as React.Consumer<AnyAbility>);
