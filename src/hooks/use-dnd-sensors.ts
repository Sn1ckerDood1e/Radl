'use client';

import {
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';

/**
 * Pre-configured dnd-kit sensors for mouse and touch devices.
 *
 * - PointerSensor: 8px distance threshold for mouse (prevents accidental drags)
 * - TouchSensor: 250ms hold delay with 5px tolerance (prevents scroll interference)
 *
 * @example
 * ```tsx
 * function MyDndContext() {
 *   const sensors = useDndSensors();
 *   return <DndContext sensors={sensors}>...</DndContext>;
 * }
 * ```
 */
export function useDndSensors() {
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8, // 8px movement threshold for mouse
    },
  });

  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 250,     // 250ms hold before drag activates
      tolerance: 5,   // 5px movement tolerance during delay
    },
  });

  return useSensors(pointerSensor, touchSensor);
}
