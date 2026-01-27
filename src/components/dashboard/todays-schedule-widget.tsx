import Link from 'next/link';
import { Calendar, Clock, Users, Plus } from 'lucide-react';

interface Practice {
  id: string;
  name: string;
  startTime: Date;
  endTime: Date;
  athleteCount: number;
  blockCount: number;
}

interface NextPractice {
  id: string;
  name: string;
  date: Date;
  startTime: Date;
}

interface TodaysScheduleWidgetProps {
  teamSlug: string;
  practices: Practice[];
  nextPractice?: NextPractice | null;
}

/**
 * Format time range for display (e.g., "6:00 AM - 8:00 AM").
 */
function formatTimeRange(start: Date, end: Date): string {
  const formatOptions: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  };
  const startStr = start.toLocaleTimeString('en-US', formatOptions);
  const endStr = end.toLocaleTimeString('en-US', formatOptions);
  return `${startStr} - ${endStr}`;
}

/**
 * Format relative date for next practice (e.g., "Tomorrow", "Friday", or "Jan 15").
 */
function formatRelativeDate(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const practiceDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((practiceDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Tomorrow';
  } else if (diffDays > 1 && diffDays <= 6) {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}

/**
 * Today's Schedule hero widget for coach dashboard.
 * Shows today's practices with times and athlete counts,
 * or falls back to showing the next upcoming practice.
 */
export function TodaysScheduleWidget({
  teamSlug,
  practices,
  nextPractice,
}: TodaysScheduleWidgetProps) {
  // Empty state: no practices today AND no next practice
  if (practices.length === 0 && !nextPractice) {
    return (
      <div className="bg-[var(--surface-1)] rounded-xl border border-[var(--border-subtle)]">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Today's Schedule</h2>
          <Link
            href={`/${teamSlug}/practices`}
            className="text-sm text-emerald-500 hover:text-emerald-400 font-medium"
          >
            View all
          </Link>
        </div>
        <div className="p-8 text-center">
          <Calendar className="h-8 w-8 text-[var(--text-muted)] mx-auto mb-3" />
          <p className="text-[var(--text-muted)] mb-4">No upcoming practices</p>
          <Link
            href={`/${teamSlug}/practices/new`}
            className="inline-flex items-center gap-2 text-sm text-emerald-500 hover:text-emerald-400 font-medium"
          >
            <Plus className="h-4 w-4" />
            Create a practice
          </Link>
        </div>
      </div>
    );
  }

  // Fallback: no practices today but have next practice
  if (practices.length === 0 && nextPractice) {
    const relativeDate = formatRelativeDate(nextPractice.date);
    const timeStr = nextPractice.startTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    return (
      <div className="bg-[var(--surface-1)] rounded-xl border border-[var(--border-subtle)]">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Today's Schedule</h2>
          <Link
            href={`/${teamSlug}/practices`}
            className="text-sm text-emerald-500 hover:text-emerald-400 font-medium"
          >
            View all
          </Link>
        </div>
        <div className="p-6">
          <p className="text-[var(--text-muted)] text-sm mb-4">No practices today</p>
          <Link
            href={`/${teamSlug}/practices/${nextPractice.id}`}
            className="block bg-[var(--surface-2)] rounded-lg p-4 hover:bg-[var(--surface-3)] transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/15 flex items-center justify-center flex-shrink-0">
                <Calendar className="h-5 w-5 text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-blue-400 font-medium mb-1">Next Practice</p>
                <h3 className="font-medium text-[var(--text-primary)] truncate">
                  {nextPractice.name || 'Practice'}
                </h3>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  {relativeDate} at {timeStr}
                </p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    );
  }

  // Main state: practices scheduled today
  return (
    <div className="bg-[var(--surface-1)] rounded-xl border border-[var(--border-subtle)]">
      <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Today's Schedule</h2>
        <Link
          href={`/${teamSlug}/practices`}
          className="text-sm text-emerald-500 hover:text-emerald-400 font-medium"
        >
          View all
        </Link>
      </div>
      <div className="divide-y divide-[var(--border-subtle)]">
        {practices.map((practice) => (
          <Link
            key={practice.id}
            href={`/${teamSlug}/practices/${practice.id}`}
            className="flex items-center gap-4 p-4 hover:bg-[var(--surface-2)] transition-colors"
          >
            <div className="h-10 w-10 rounded-lg bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
              <Clock className="h-5 w-5 text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-[var(--text-primary)] truncate">
                {practice.name || 'Practice'}
              </h3>
              <p className="text-sm text-[var(--text-secondary)]">
                {formatTimeRange(practice.startTime, practice.endTime)}
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {practice.blockCount > 0 && (
                <span className="text-xs text-[var(--text-muted)]">
                  {practice.blockCount} block{practice.blockCount !== 1 ? 's' : ''}
                </span>
              )}
              <div className="flex items-center gap-1 bg-[var(--surface-2)] rounded-full px-2 py-1">
                <Users className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                <span className="text-xs font-medium text-[var(--text-secondary)]">
                  {practice.athleteCount}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
