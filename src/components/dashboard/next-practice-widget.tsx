// ============================================================================
// NextPracticeWidget Component
// ============================================================================
// Athlete hero widget showing their next practice and assignment details.
// Displays boat/seat for water blocks, group for erg/land blocks.

import Link from 'next/link';
import { Calendar, Clock, Ship, Dumbbell, Users, MapPin } from 'lucide-react';
import { format, isToday, isTomorrow, differenceInDays } from 'date-fns';

// ============================================================================
// Types
// ============================================================================

interface AthleteAssignment {
  blockType: 'WATER' | 'ERG' | 'LAND' | 'MEETING';
  // Water block specifics
  boatName?: string;
  boatClass?: string;
  seatPosition?: number;
  seatSide?: 'PORT' | 'STARBOARD' | null;
  // Land/erg block specifics
  groupName?: string;
}

interface NextPracticeWidgetProps {
  teamSlug: string;
  practice: {
    id: string;
    name: string;
    date: Date;
    startTime: Date;
    endTime: Date;
  } | null;
  assignment: AthleteAssignment | null;
  unassignedPracticeCount?: number;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Format the practice date with relative countdown.
 * Examples: "Today at 6:00 AM", "Tomorrow at 6:00 AM", "Friday at 6:00 AM (in 2 days)"
 */
function formatPracticeTime(date: Date, startTime: Date): string {
  const timeStr = format(startTime, 'h:mm a');

  if (isToday(date)) {
    return `Today at ${timeStr}`;
  }

  if (isTomorrow(date)) {
    return `Tomorrow at ${timeStr}`;
  }

  const daysUntil = differenceInDays(date, new Date());
  const dayName = format(date, 'EEEE');

  if (daysUntil <= 7) {
    return `${dayName} at ${timeStr} (in ${daysUntil} days)`;
  }

  return `${format(date, 'MMM d')} at ${timeStr}`;
}

/**
 * Get the assignment display text based on block type.
 */
function formatAssignment(assignment: AthleteAssignment): string {
  switch (assignment.blockType) {
    case 'WATER': {
      if (!assignment.boatName) {
        return 'Water session';
      }

      const parts = [assignment.boatName];

      if (assignment.seatPosition === 0) {
        // Coxswain
        parts.push('Coxswain');
      } else if (assignment.seatPosition) {
        // Rower with seat position
        const seatStr = `Seat ${assignment.seatPosition}`;
        if (assignment.seatSide) {
          parts.push(`${seatStr} (${assignment.seatSide === 'PORT' ? 'Port' : 'Starboard'})`);
        } else {
          parts.push(seatStr);
        }
      }

      return parts.join(' - ');
    }

    case 'ERG':
      return assignment.groupName
        ? `Erg Group: ${assignment.groupName}`
        : 'Erg Session';

    case 'LAND':
      return assignment.groupName
        ? `Land Training: ${assignment.groupName}`
        : 'Land Training';

    case 'MEETING':
      return 'Team Meeting';

    default:
      return 'Practice session';
  }
}

/**
 * Get the icon for the assignment type.
 */
function getAssignmentIcon(blockType: AthleteAssignment['blockType']) {
  switch (blockType) {
    case 'WATER':
      return Ship;
    case 'ERG':
      return Dumbbell;
    case 'LAND':
      return MapPin;
    case 'MEETING':
      return Users;
    default:
      return Calendar;
  }
}

// ============================================================================
// Component
// ============================================================================

/**
 * Hero widget for athletes showing their next practice and assignment.
 *
 * Display states:
 * 1. Practice with assignment: Shows full details with boat/seat or group
 * 2. Practice without assignment: Shows practice info with "Assignment pending"
 * 3. No practice but unassignedPracticeCount > 0: Shows count of upcoming practices
 * 4. No practice at all: Shows friendly "No upcoming practices" message
 */
export function NextPracticeWidget({
  teamSlug,
  practice,
  assignment,
  unassignedPracticeCount = 0,
}: NextPracticeWidgetProps) {
  // State 4: No practice at all
  if (!practice && unassignedPracticeCount === 0) {
    return (
      <div className="bg-[var(--surface-1)] rounded-xl border border-[var(--border-subtle)]">
        <div className="p-6 md:p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-teal-500/10 mb-4">
            <Calendar className="h-8 w-8 text-teal-400" />
          </div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
            No Upcoming Practices
          </h2>
          <p className="text-[var(--text-muted)]">
            Enjoy your time off! Check back later for new practice schedules.
          </p>
        </div>
      </div>
    );
  }

  // State 3: No practice but there are practices they're not assigned to
  if (!practice && unassignedPracticeCount > 0) {
    return (
      <div className="bg-[var(--surface-1)] rounded-xl border border-[var(--border-subtle)]">
        <div className="p-6 md:p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/10 mb-4">
            <Calendar className="h-8 w-8 text-amber-400" />
          </div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
            No Assignment Yet
          </h2>
          <p className="text-[var(--text-muted)] mb-4">
            {unassignedPracticeCount === 1
              ? "There's 1 upcoming practice"
              : `There are ${unassignedPracticeCount} upcoming practices`}
            {' '}&mdash; check with your coach for your assignment.
          </p>
          <Link
            href={`/${teamSlug}/practices`}
            className="inline-flex items-center gap-2 text-sm text-teal-500 hover:text-teal-400 font-medium"
          >
            View practices
          </Link>
        </div>
      </div>
    );
  }

  // State 1 or 2: Practice exists
  const Icon = assignment ? getAssignmentIcon(assignment.blockType) : Calendar;
  const hasAssignment = assignment !== null;

  return (
    <div className="bg-[var(--surface-1)] rounded-xl border border-[var(--border-subtle)] overflow-hidden">
      {/* Header with accent bar */}
      <div className="bg-teal-500/10 border-b border-teal-500/20 px-6 py-4 md:px-8 md:py-5">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-teal-500/20">
            <Calendar className="h-5 w-5 text-teal-400" />
          </div>
          <div>
            <div className="text-sm text-teal-400 font-medium">Next Practice</div>
            <h2 className="text-xl md:text-2xl font-semibold text-[var(--text-primary)]">
              {formatPracticeTime(practice!.date, practice!.startTime)}
            </h2>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 md:p-8">
        {/* Practice name */}
        <h3 className="text-lg font-medium text-[var(--text-primary)] mb-4">
          {practice!.name}
        </h3>

        {/* Time range */}
        <div className="flex items-center gap-2 text-[var(--text-secondary)] mb-4">
          <Clock className="h-4 w-4" />
          <span>
            {format(practice!.startTime, 'h:mm a')} &ndash; {format(practice!.endTime, 'h:mm a')}
          </span>
        </div>

        {/* Assignment details */}
        <div className={`rounded-lg p-4 ${hasAssignment ? 'bg-[var(--surface-2)]' : 'bg-amber-500/10 border border-amber-500/20'}`}>
          <div className="flex items-center gap-3">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full ${hasAssignment ? 'bg-teal-500/20' : 'bg-amber-500/20'}`}>
              <Icon className={`h-5 w-5 ${hasAssignment ? 'text-teal-400' : 'text-amber-400'}`} />
            </div>
            <div>
              <div className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-0.5">
                {hasAssignment ? 'Your Assignment' : 'Assignment Status'}
              </div>
              <div className={`font-medium ${hasAssignment ? 'text-[var(--text-primary)]' : 'text-amber-400'}`}>
                {hasAssignment ? formatAssignment(assignment) : 'Assignment pending'}
              </div>
            </div>
          </div>
        </div>

        {/* Action link */}
        <div className="mt-6 pt-4 border-t border-[var(--border-subtle)]">
          <Link
            href={`/${teamSlug}/practices/${practice!.id}`}
            className="inline-flex items-center gap-2 text-sm text-teal-500 hover:text-teal-400 font-medium"
          >
            View practice details
          </Link>
        </div>
      </div>
    </div>
  );
}
