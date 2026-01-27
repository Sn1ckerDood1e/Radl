'use client';

import { useState, useEffect, useCallback } from 'react';
import { DayPicker } from 'react-day-picker';
import {
  format,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  differenceInDays,
} from 'date-fns';
import Link from 'next/link';
import { PracticeCard } from './practice-card';
import { RegattaCard } from './regatta-card';
import { RegattaDetailCard } from './regatta-detail-card';
import { StalenessIndicator } from '@/components/pwa/staleness-indicator';
import { useOfflineSchedules, useCacheFreshness } from '@/lib/db/hooks';
import { cacheSchedules } from '@/lib/db/cache-manager';
import { ExportButton } from '@/components/ui/export-button';
import { toCSV, downloadCSV } from '@/lib/export/csv';
import type { ScheduleEvent } from '@/app/api/schedule/route';
import type { RCPublicRegatta } from '@/lib/regatta-central/types';

interface UnifiedCalendarProps {
  teamSlug: string;
  teamId: string;
  isCoach: boolean;
  seasons: { id: string; name: string }[];
  initialSeasonId?: string;
}

/**
 * Main unified calendar component using react-day-picker.
 * Shows practices and regattas with day selection and month navigation.
 */
export function UnifiedCalendar({
  teamSlug,
  teamId,
  isCoach,
  seasons,
  initialSeasonId,
}: UnifiedCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [seasonId, setSeasonId] = useState(initialSeasonId || '');
  const [isOffline, setIsOffline] = useState(false);

  // RC regatta state
  const [rcRegattas, setRcRegattas] = useState<RCPublicRegatta[]>([]);
  const [selectedRegatta, setSelectedRegatta] = useState<RCPublicRegatta | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_rcCachedAt, setRcCachedAt] = useState<string | null>(null);

  // Reactive offline data for fallback
  const offlineSchedules = useOfflineSchedules(teamId);
  const { isStale, lastUpdated } = useCacheFreshness(
    `schedules:${teamId}`,
    24 * 60 * 60 * 1000 // 24 hour stale threshold
  );

  // Fetch events for current month view
  const fetchEvents = useCallback(async (month: Date) => {
    setLoading(true);
    try {
      const start = startOfMonth(month);
      const end = endOfMonth(month);

      const params = new URLSearchParams({
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      });

      if (seasonId) {
        params.set('seasonId', seasonId);
      }

      const response = await fetch(`/api/schedule?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        const fetchedEvents = data.events || [];
        setEvents(fetchedEvents);
        setIsOffline(false);

        // Cache practice events to IndexedDB for offline use
        const practices = fetchedEvents
          .filter((e: ScheduleEvent) => e.type === 'practice')
          .map((e: ScheduleEvent) => ({
            id: e.id,
            name: e.name,
            date: e.date,
            startTime: e.startTime,
            endTime: e.endTime || e.startTime,
            status: e.status || 'PUBLISHED',
            seasonId: '', // Not available in schedule API response
          }));

        if (practices.length > 0) {
          await cacheSchedules(teamId, practices);
        }
      }
    } catch (error) {
      console.error('Failed to fetch schedule:', error);
      // Check if we're offline
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setIsOffline(true);
      }
    } finally {
      setLoading(false);
    }
  }, [seasonId, teamId]);

  // Fetch events when month or season changes
  useEffect(() => {
    fetchEvents(currentMonth);
  }, [currentMonth, fetchEvents]);

  // Fetch RC regattas (once on mount, not per-month)
  const fetchRcRegattas = useCallback(async () => {
    try {
      const response = await fetch('/api/regattas/upcoming');
      if (response.ok) {
        const data = await response.json();
        if (data.regattas) {
          setRcRegattas(data.regattas.map((r: RCPublicRegatta) => ({
            ...r,
            startDate: new Date(r.startDate),
            endDate: r.endDate ? new Date(r.endDate) : null,
          })));
          setRcCachedAt(data.cachedAt);
        }
      }
    } catch (error) {
      console.error('Failed to fetch RC regattas:', error);
    }
  }, []);

  useEffect(() => {
    fetchRcRegattas();
  }, [fetchRcRegattas]);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      fetchEvents(currentMonth); // Refresh when back online
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [fetchEvents, currentMonth]);

  // Use offline data as fallback when offline and no API events
  const displayEvents: ScheduleEvent[] = isOffline && events.length === 0 && offlineSchedules.length > 0
    ? offlineSchedules.map((s) => ({
        id: s.id,
        type: 'practice' as const,
        name: s.name,
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
        status: s.status,
      }))
    : events;

  // Get events for a specific date
  const getEventsForDate = (date: Date): ScheduleEvent[] => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return displayEvents.filter((e) => e.date === dateStr);
  };

  // Get RC regattas for a specific date (includes multi-day spanning)
  const getRcRegattasForDate = (date: Date): RCPublicRegatta[] => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return rcRegattas.filter((r) => {
      const start = format(r.startDate, 'yyyy-MM-dd');
      const end = r.endDate ? format(r.endDate, 'yyyy-MM-dd') : start;
      return dateStr >= start && dateStr <= end;
    });
  };

  // Get RC regatta dates for current month (expands multi-day to individual dates)
  const getRcRegattaDatesForMonth = (month: Date): Date[] => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);

    return rcRegattas.flatMap((r) => {
      const dates: Date[] = [];
      const current = new Date(r.startDate);
      const end = r.endDate || r.startDate;

      while (current <= end) {
        if (current >= monthStart && current <= monthEnd) {
          dates.push(new Date(current));
        }
        current.setDate(current.getDate() + 1);
      }

      return dates;
    });
  };

  // Get dates that have events (for highlighting)
  const practiceEventDates = displayEvents.map((e) => new Date(e.date));
  const rcRegattaDates = getRcRegattaDatesForMonth(currentMonth);

  // Build spanning modifiers for multi-day regattas
  const spanStartDates: Date[] = [];
  const spanMiddleDates: Date[] = [];
  const spanEndDates: Date[] = [];

  rcRegattas.forEach((r) => {
    if (!r.endDate || differenceInDays(r.endDate, r.startDate) === 0) return;

    const current = new Date(r.startDate);
    const end = r.endDate;
    let isFirst = true;
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);

    while (current <= end) {
      if (current >= monthStart && current <= monthEnd) {
        if (isFirst) {
          spanStartDates.push(new Date(current));
          isFirst = false;
        } else if (format(current, 'yyyy-MM-dd') === format(end, 'yyyy-MM-dd')) {
          spanEndDates.push(new Date(current));
        } else {
          spanMiddleDates.push(new Date(current));
        }
      }
      current.setDate(current.getDate() + 1);
    }
  });

  // Dates with practice events only (for green dots)
  const hasEventDates = practiceEventDates;

  // Dates with RC regattas (for blue dots on single-day regattas)
  const hasRegattaDates = rcRegattaDates.filter((d) => {
    const dateStr = format(d, 'yyyy-MM-dd');
    // Only show blue dot for single-day regattas (not spanning)
    return !spanStartDates.some((s) => format(s, 'yyyy-MM-dd') === dateStr) &&
           !spanMiddleDates.some((s) => format(s, 'yyyy-MM-dd') === dateStr) &&
           !spanEndDates.some((s) => format(s, 'yyyy-MM-dd') === dateStr);
  });

  // Events for selected date
  const selectedEvents = selectedDate ? getEventsForDate(selectedDate) : [];
  const selectedRcRegattas = selectedDate ? getRcRegattasForDate(selectedDate) : [];

  // Handle month navigation
  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  // Handle season change
  const handleSeasonChange = (newSeasonId: string) => {
    setSeasonId(newSeasonId);
  };

  // Export schedule
  const handleExport = () => {
    const exportData = displayEvents.map(e => ({
      date: e.date,
      name: e.name,
      type: e.type === 'practice' ? 'Practice' : 'Regatta',
      startTime: e.startTime || '',
      endTime: e.endTime || '',
      location: e.location || '',
      status: e.status || '',
    }));

    const csv = toCSV(exportData, [
      { key: 'date', header: 'Date' },
      { key: 'name', header: 'Name' },
      { key: 'type', header: 'Type' },
      { key: 'startTime', header: 'Start Time' },
      { key: 'endTime', header: 'End Time' },
      { key: 'location', header: 'Location' },
      { key: 'status', header: 'Status' },
    ]);
    const monthStr = format(currentMonth, 'yyyy-MM');
    downloadCSV(csv, `schedule-${monthStr}.csv`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
      {/* Calendar section */}
      <div className="min-w-0">
        {/* Season selector and export */}
        <div className="flex items-center justify-between mb-4">
          {seasons.length > 1 ? (
            <div>
              <label htmlFor="season-select" className="sr-only">
                Select season
              </label>
              <select
                id="season-select"
                value={seasonId}
                onChange={(e) => handleSeasonChange(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="">All seasons</option>
                {seasons.map((season) => (
                  <option key={season.id} value={season.id}>
                    {season.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div />
          )}
          <ExportButton onExport={handleExport} label="Export" />
        </div>

        {/* Month navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={handlePrevMonth}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
            aria-label="Previous month"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="text-center">
            <h2 className="text-lg font-semibold text-white">
              {format(currentMonth, 'MMMM yyyy')}
            </h2>
            <StalenessIndicator
              lastUpdated={lastUpdated}
              isStale={isStale}
              isOffline={isOffline}
              className="justify-center"
            />
          </div>
          <button
            onClick={handleNextMonth}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
            aria-label="Next month"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Calendar */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            month={currentMonth}
            onMonthChange={setCurrentMonth}
            modifiers={{
              hasEvent: hasEventDates,
              hasRegatta: hasRegattaDates,
              regattaSpanStart: spanStartDates,
              regattaSpanMiddle: spanMiddleDates,
              regattaSpanEnd: spanEndDates,
            }}
            modifiersClassNames={{
              hasEvent: 'has-event',
              hasRegatta: 'has-regatta',
              regattaSpanStart: 'regatta-span-start',
              regattaSpanMiddle: 'regatta-span-middle',
              regattaSpanEnd: 'regatta-span-end',
              selected: 'selected-day',
              today: 'today-day',
            }}
            classNames={{
              root: 'w-full',
              months: 'w-full',
              month: 'w-full',
              month_caption: 'hidden',
              nav: 'hidden',
              weekdays: 'grid grid-cols-7 mb-2',
              weekday: 'text-center text-xs font-medium text-zinc-500 py-2',
              weeks: 'w-full',
              week: 'grid grid-cols-7',
              day: 'p-1 text-center',
              day_button: 'calendar-day-btn',
              selected: 'calendar-selected',
              today: 'calendar-today',
              outside: 'calendar-outside',
            }}
          />
          <style jsx global>{`
            .calendar-day-btn {
              width: 100%;
              height: 44px;
              display: flex;
              align-items: center;
              justify-content: center;
              border-radius: 8px;
              font-size: 14px;
              color: #d4d4d8;
              transition: background-color 0.15s;
              position: relative;
            }
            .calendar-day-btn:hover {
              background-color: #3f3f46;
            }
            .calendar-day-btn:disabled {
              color: #52525b;
            }
            .calendar-day-btn:disabled:hover {
              background-color: transparent;
            }
            .calendar-outside .calendar-day-btn {
              color: #52525b;
            }
            .calendar-today .calendar-day-btn {
              background-color: #18181b;
              border: 2px solid #10b981;
              font-weight: 600;
            }
            .calendar-selected .calendar-day-btn {
              background-color: #10b981 !important;
              color: white !important;
              font-weight: 600;
            }
            .calendar-selected .calendar-day-btn:hover {
              background-color: #059669 !important;
            }
            .has-event .calendar-day-btn::after {
              content: '';
              position: absolute;
              bottom: 4px;
              left: 50%;
              transform: translateX(-50%);
              width: 6px;
              height: 6px;
              border-radius: 50%;
              background-color: #10b981;
            }
            .calendar-selected.has-event .calendar-day-btn::after {
              background-color: white;
            }
            /* RC Regatta blue dot indicator */
            .has-regatta .calendar-day-btn::before {
              content: '';
              position: absolute;
              bottom: 4px;
              left: 50%;
              transform: translateX(-50%);
              width: 6px;
              height: 6px;
              border-radius: 50%;
              background-color: #3b82f6;
            }
            /* When both practice and regatta on same day */
            .has-event.has-regatta .calendar-day-btn::after {
              left: calc(50% - 5px);
            }
            .has-event.has-regatta .calendar-day-btn::before {
              left: calc(50% + 5px);
            }
            .calendar-selected.has-regatta .calendar-day-btn::before {
              background-color: white;
            }
            /* Multi-day regatta spanning bar */
            .regatta-span-start .calendar-day-btn::before {
              content: '';
              position: absolute;
              top: 2px;
              left: 50%;
              right: -4px;
              width: auto;
              height: 4px;
              background-color: #3b82f6;
              border-radius: 2px 0 0 2px;
              bottom: auto;
              transform: none;
            }
            .regatta-span-middle .calendar-day-btn::before {
              content: '';
              position: absolute;
              top: 2px;
              left: -4px;
              right: -4px;
              width: auto;
              height: 4px;
              background-color: #3b82f6;
              border-radius: 0;
              bottom: auto;
              transform: none;
            }
            .regatta-span-end .calendar-day-btn::before {
              content: '';
              position: absolute;
              top: 2px;
              left: -4px;
              right: 50%;
              width: auto;
              height: 4px;
              background-color: #3b82f6;
              border-radius: 0 2px 2px 0;
              bottom: auto;
              transform: none;
            }
            /* Spanning bars override regatta dot styling */
            .regatta-span-start.has-regatta .calendar-day-btn::before,
            .regatta-span-middle.has-regatta .calendar-day-btn::before,
            .regatta-span-end.has-regatta .calendar-day-btn::before {
              bottom: auto;
              top: 2px;
            }
          `}</style>
        </div>
      </div>

      {/* Selected day events */}
      <div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 sticky top-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">
              {selectedDate ? format(selectedDate, 'EEEE, MMM d') : 'Select a date'}
            </h3>
            {isCoach && selectedDate && (
              <Link
                href={`/${teamSlug}/practices/new?date=${format(selectedDate, 'yyyy-MM-dd')}`}
                className="p-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-lg transition-colors"
                title="Add practice"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </Link>
            )}
          </div>

          {loading && displayEvents.length === 0 ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto"></div>
              <p className="text-zinc-500 text-sm mt-2">Loading events...</p>
            </div>
          ) : selectedEvents.length > 0 || selectedRcRegattas.length > 0 ? (
            <div className="space-y-3">
              {/* RC Regattas first (blue styling) */}
              {selectedRcRegattas.map((regatta) => (
                <button
                  key={`rc-${regatta.id}`}
                  onClick={() => setSelectedRegatta(regatta)}
                  className="w-full text-left p-3 rounded-lg border bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <svg
                      className="h-4 w-4 flex-shrink-0 text-blue-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"
                      />
                    </svg>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-blue-300 truncate">
                        {regatta.name}
                      </p>
                      <p className="text-xs text-blue-400/70">
                        {regatta.endDate && differenceInDays(regatta.endDate, regatta.startDate) > 0
                          ? `${format(regatta.startDate, 'MMM d')} - ${format(regatta.endDate, 'MMM d')}`
                          : format(regatta.startDate, 'h:mm a')}
                        {regatta.location && ` • ${regatta.location}`}
                      </p>
                    </div>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-400">
                      RC
                    </span>
                  </div>
                </button>
              ))}

              {/* Practices and local regattas */}
              {selectedEvents.map((event) =>
                event.type === 'practice' ? (
                  <PracticeCard
                    key={event.id}
                    id={event.id}
                    name={event.name}
                    startTime={event.startTime}
                    endTime={event.endTime}
                    status={event.status}
                    teamSlug={teamSlug}
                  />
                ) : (
                  <RegattaCard
                    key={event.id}
                    id={event.id}
                    name={event.name}
                    startTime={event.startTime}
                    endTime={event.endTime}
                    location={event.location}
                  />
                )
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <svg
                className="mx-auto h-10 w-10 text-zinc-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <p className="text-zinc-500 text-sm mt-2">No events</p>
              {isCoach && selectedDate && (
                <Link
                  href={`/${teamSlug}/practices/new?date=${format(selectedDate, 'yyyy-MM-dd')}`}
                  className="inline-flex items-center mt-4 px-3 py-1.5 text-sm text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 hover:border-emerald-500/50 rounded-lg transition-colors"
                >
                  <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Practice
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Regatta detail popup */}
      {selectedRegatta && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedRegatta(null);
            }
          }}
        >
          <div className="relative">
            <RegattaDetailCard
              regatta={selectedRegatta}
              onClose={() => setSelectedRegatta(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
