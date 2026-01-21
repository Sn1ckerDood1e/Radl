'use client';

import { useState, useEffect, useCallback } from 'react';
import { DayPicker } from 'react-day-picker';
import {
  format,
  startOfMonth,
  endOfMonth,
  isSameDay,
  addMonths,
  subMonths,
} from 'date-fns';
import Link from 'next/link';
import { PracticeCard } from './practice-card';
import { RegattaCard } from './regatta-card';
import type { ScheduleEvent } from '@/app/api/schedule/route';

interface UnifiedCalendarProps {
  teamSlug: string;
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
  isCoach,
  seasons,
  initialSeasonId,
}: UnifiedCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [seasonId, setSeasonId] = useState(initialSeasonId || '');

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
        setEvents(data.events || []);
      }
    } catch (error) {
      console.error('Failed to fetch schedule:', error);
    } finally {
      setLoading(false);
    }
  }, [seasonId]);

  // Fetch events when month or season changes
  useEffect(() => {
    fetchEvents(currentMonth);
  }, [currentMonth, fetchEvents]);

  // Get events for a specific date
  const getEventsForDate = (date: Date): ScheduleEvent[] => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return events.filter((e) => e.date === dateStr);
  };

  // Get dates that have events (for highlighting)
  const eventDates = events.map((e) => new Date(e.date));

  // Events for selected date
  const selectedEvents = selectedDate ? getEventsForDate(selectedDate) : [];

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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Calendar section */}
      <div className="lg:col-span-2">
        {/* Season selector */}
        {seasons.length > 1 && (
          <div className="mb-4">
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
        )}

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
          <h2 className="text-lg font-semibold text-white">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
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
              hasEvent: eventDates,
            }}
            modifiersClassNames={{
              hasEvent: 'has-event',
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
          `}</style>
        </div>
      </div>

      {/* Selected day events */}
      <div className="lg:col-span-1">
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

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto"></div>
              <p className="text-zinc-500 text-sm mt-2">Loading events...</p>
            </div>
          ) : selectedEvents.length > 0 ? (
            <div className="space-y-3">
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
    </div>
  );
}
