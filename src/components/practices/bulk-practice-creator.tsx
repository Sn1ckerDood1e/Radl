'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { DayPicker } from 'react-day-picker';
import { eachDayOfInterval, getDay, format, addWeeks } from 'date-fns';
import { Calendar, Clock, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PracticeTemplate {
  id: string;
  name: string;
  defaultStartTime: string;
  defaultEndTime: string;
}

interface Season {
  id: string;
  name: string;
}

interface BulkPracticeCreatorProps {
  /** Team slug for navigation */
  teamSlug: string;
  /** Available seasons */
  seasons: Season[];
  /** Available practice templates */
  templates: PracticeTemplate[];
  /** Initial date for single-practice creation (from calendar click) */
  initialDate?: string;
  /** Initial season ID for pre-selection */
  initialSeasonId?: string;
}

type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Bulk practice creator with date range picker and day selection.
 *
 * CONTEXT.md decisions:
 * - Date range picker (start/end dates)
 * - Day + time picker (Mon, Wed, Fri at 6:00 AM)
 * - Optional template: can apply practice template or create empty practices
 */
export function BulkPracticeCreator({
  teamSlug,
  seasons,
  templates,
  initialDate,
  initialSeasonId,
}: BulkPracticeCreatorProps) {
  const router = useRouter();

  // Parse initial date if provided (for single-practice creation from calendar)
  const parsedInitialDate = initialDate ? new Date(initialDate) : undefined;
  const validInitialDate = parsedInitialDate && !isNaN(parsedInitialDate.getTime())
    ? parsedInitialDate
    : undefined;

  // For single-date mode, set both start and end to same date
  const [startDate, setStartDate] = useState<Date | undefined>(validInitialDate);
  const [endDate, setEndDate] = useState<Date | undefined>(validInitialDate);

  // If single date provided, select all days of week to ensure that day is included
  const initialDaysOfWeek: DayOfWeek[] = validInitialDate
    ? [getDay(validInitialDate) as DayOfWeek]
    : [1, 3, 5]; // Mon, Wed, Fri default for multi-day mode
  const [selectedDays, setSelectedDays] = useState<DayOfWeek[]>(initialDaysOfWeek);

  const [startTime, setStartTime] = useState('06:00');
  const [endTime, setEndTime] = useState('08:00');
  // Use initialSeasonId if provided and valid, otherwise first season
  const validInitialSeasonId = initialSeasonId && seasons.some(s => s.id === initialSeasonId)
    ? initialSeasonId
    : seasons[0]?.id || '';
  const [seasonId, setSeasonId] = useState(validInitialSeasonId);
  const [templateId, setTemplateId] = useState<string>('');
  const [namePattern, setNamePattern] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Calculate matching dates
  const practiceDates = useMemo(() => {
    if (!startDate || !endDate || startDate > endDate) return [];

    const allDates = eachDayOfInterval({ start: startDate, end: endDate });
    return allDates.filter(date => selectedDays.includes(getDay(date) as DayOfWeek));
  }, [startDate, endDate, selectedDays]);

  // Toggle day selection
  const toggleDay = (day: DayOfWeek) => {
    setSelectedDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day].sort()
    );
  };

  // Apply template defaults
  const handleTemplateChange = (id: string) => {
    setTemplateId(id);
    if (id) {
      const template = templates.find(t => t.id === id);
      if (template) {
        setStartTime(template.defaultStartTime);
        setEndTime(template.defaultEndTime);
      }
    }
  };

  // Handle date selection
  const handleDayClick = (day: Date) => {
    if (!startDate || (startDate && endDate)) {
      // Start fresh selection
      setStartDate(day);
      setEndDate(undefined);
    } else if (day < startDate) {
      // Selected before start, make it new start
      setStartDate(day);
    } else {
      // Selected after start, set as end
      setEndDate(day);
    }
  };

  // Quick preset: next 4 weeks
  const handleNext4Weeks = () => {
    const today = new Date();
    setStartDate(today);
    setEndDate(addWeeks(today, 4));
  };

  // Quick preset: next 8 weeks
  const handleNext8Weeks = () => {
    const today = new Date();
    setStartDate(today);
    setEndDate(addWeeks(today, 8));
  };

  // Create practices
  const handleCreate = async () => {
    if (!seasonId) {
      toast.error('Please select a season');
      return;
    }

    if (practiceDates.length === 0) {
      toast.error('No practices to create', {
        description: 'Select a date range and at least one day of the week',
      });
      return;
    }

    if (practiceDates.length > 100) {
      toast.error('Too many practices', {
        description: 'Maximum 100 practices can be created at once',
      });
      return;
    }

    setIsCreating(true);

    try {
      const response = await fetch('/api/practices/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seasonId,
          dates: practiceDates.map(d => d.toISOString()),
          startTime,
          endTime,
          namePattern: namePattern || undefined,
          templateId: templateId || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create practices');
      }

      toast.success(`Created ${data.count} practices`);
      router.push(`/${teamSlug}/practices`);
      router.refresh();
    } catch (error) {
      toast.error('Failed to create practices', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Modifier for selected range
  const modifiers = {
    selected: practiceDates,
    rangeStart: startDate,
    rangeEnd: endDate,
    inRange: startDate && endDate
      ? eachDayOfInterval({ start: startDate, end: endDate })
      : [],
  };

  // Determine if single-date mode (start and end are same date)
  const isSingleDate = startDate && endDate &&
    startDate.toDateString() === endDate.toDateString();

  // Dynamic header based on selection
  const headerText = isSingleDate
    ? `Create Practice for ${format(startDate, 'MMM d, yyyy')}`
    : practiceDates.length > 0
      ? `Create Practices (${practiceDates.length} date${practiceDates.length !== 1 ? 's' : ''})`
      : 'Create Practices';

  return (
    <div className="space-y-6">
      {/* Dynamic header */}
      <h1 className="text-2xl font-bold text-white">
        {headerText}
      </h1>

      {/* Season selector */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          Season
        </label>
        <select
          value={seasonId}
          onChange={(e) => setSeasonId(e.target.value)}
          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
        >
          {seasons.map(season => (
            <option key={season.id} value={season.id}>
              {season.name}
            </option>
          ))}
        </select>
      </div>

      {/* Date range picker */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          <Calendar className="inline h-4 w-4 mr-1" />
          Date Range
        </label>
        <div className="flex gap-2 mb-3">
          <button
            type="button"
            onClick={handleNext4Weeks}
            className="px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-zinc-300 transition-colors"
          >
            Next 4 weeks
          </button>
          <button
            type="button"
            onClick={handleNext8Weeks}
            className="px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-zinc-300 transition-colors"
          >
            Next 8 weeks
          </button>
        </div>
        <div className="bg-zinc-800 rounded-lg p-4 border border-zinc-700">
          <DayPicker
            mode="single"
            required={false}
            selected={startDate}
            onSelect={(day) => day && handleDayClick(day)}
            disabled={{ before: new Date() }}
            modifiers={modifiers}
            modifiersClassNames={{
              selected: 'bulk-selected-day',
              rangeStart: 'bulk-range-start',
              rangeEnd: 'bulk-range-end',
              inRange: 'bulk-in-range',
            }}
            classNames={{
              root: 'w-full',
              months: 'w-full',
              month: 'w-full',
              month_caption: 'flex justify-center py-2',
              caption_label: 'text-sm font-medium text-zinc-200',
              nav: 'flex items-center justify-between',
              button_previous: 'p-1 hover:bg-zinc-700 rounded text-zinc-400',
              button_next: 'p-1 hover:bg-zinc-700 rounded text-zinc-400',
              weekdays: 'grid grid-cols-7 mb-2',
              weekday: 'text-center text-xs font-medium text-zinc-500 py-2',
              weeks: 'w-full',
              week: 'grid grid-cols-7',
              day: 'p-1 text-center',
              day_button: 'bulk-day-btn',
              today: 'bulk-today',
              outside: 'bulk-outside',
              disabled: 'bulk-disabled',
            }}
          />
        </div>
        {startDate && (
          <p className="text-sm text-zinc-400 mt-2">
            {format(startDate, 'MMM d, yyyy')}
            {endDate && ` - ${format(endDate, 'MMM d, yyyy')}`}
            {!endDate && ' (select end date)'}
          </p>
        )}
      </div>

      {/* Day of week selector */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          Days of Week
        </label>
        <div className="flex flex-wrap gap-2">
          {dayNames.map((name, index) => (
            <button
              key={name}
              type="button"
              onClick={() => toggleDay(index as DayOfWeek)}
              className={cn(
                'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                selectedDays.includes(index as DayOfWeek)
                  ? 'bg-emerald-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700'
              )}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* Time inputs */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            <Clock className="inline h-4 w-4 mr-1" />
            Start Time
          </label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none [color-scheme:dark]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            End Time
          </label>
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none [color-scheme:dark]"
          />
        </div>
      </div>

      {/* Template selector */}
      {templates.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            <FileText className="inline h-4 w-4 mr-1" />
            Practice Template (optional)
          </label>
          <select
            value={templateId}
            onChange={(e) => handleTemplateChange(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
          >
            <option value="">No template - create empty practices</option>
            {templates.map(template => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Practice name pattern */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          Practice Name (optional)
        </label>
        <input
          type="text"
          value={namePattern}
          onChange={(e) => setNamePattern(e.target.value)}
          placeholder="e.g., Morning Practice"
          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
        />
        <p className="text-xs text-zinc-500 mt-1">
          Leave empty to auto-generate names with dates
        </p>
      </div>

      {/* Preview and create */}
      <div className="pt-4 border-t border-zinc-800">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-zinc-400">
            {practiceDates.length} practice{practiceDates.length !== 1 ? 's' : ''} will be created
          </span>
          {practiceDates.length > 0 && (
            <span className="text-sm text-zinc-500">
              First: {format(practiceDates[0], 'MMM d')}
              {practiceDates.length > 1 && ` - Last: ${format(practiceDates[practiceDates.length - 1], 'MMM d')}`}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleCreate}
          disabled={isCreating || practiceDates.length === 0}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium text-white transition-colors flex items-center justify-center gap-2"
        >
          {isCreating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>Create {practiceDates.length} Practice{practiceDates.length !== 1 ? 's' : ''}</>
          )}
        </button>
      </div>

      {/* Custom styles for DayPicker dark theme */}
      <style jsx global>{`
        .bulk-day-btn {
          width: 100%;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          font-size: 14px;
          color: #d4d4d8;
          transition: background-color 0.15s;
        }
        .bulk-day-btn:hover:not(:disabled) {
          background-color: #3f3f46;
        }
        .bulk-disabled .bulk-day-btn {
          color: #52525b;
          cursor: not-allowed;
        }
        .bulk-outside .bulk-day-btn {
          color: #52525b;
        }
        .bulk-today .bulk-day-btn {
          border: 2px solid #10b981;
          font-weight: 600;
        }
        .bulk-in-range .bulk-day-btn {
          background-color: #10b98133;
        }
        .bulk-range-start .bulk-day-btn,
        .bulk-range-end .bulk-day-btn {
          background-color: #10b981 !important;
          color: white !important;
          font-weight: 600;
        }
        .bulk-selected-day .bulk-day-btn {
          background-color: #059669;
          color: white;
        }
      `}</style>
    </div>
  );
}
