'use client';

import { useCallback, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Calendar, X } from 'lucide-react';
import { format } from 'date-fns';
import { DayPicker, type DateRange } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { AUDITABLE_ACTIONS, AUDIT_ACTION_DESCRIPTIONS, type AuditAction } from '@/lib/audit/actions';
import { ExportAuditButton } from './export-audit-button';

interface AuditFiltersProps {
  initialFilters: {
    action?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
  };
}

/**
 * Audit log filter bar with action dropdown, user ID input, date range picker, and export button.
 *
 * Features:
 * - Action type dropdown (all AUDITABLE_ACTIONS)
 * - User ID text input with debounce
 * - Date range picker using react-day-picker
 * - Export CSV button (passes current filters)
 * - URL-based filtering for bookmarkable views
 */
export function AuditFilters({ initialFilters }: AuditFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Local state for user ID input (debounced)
  const [userIdInput, setUserIdInput] = useState(initialFilters.userId || '');

  // Date range state
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: initialFilters.startDate ? new Date(initialFilters.startDate) : undefined,
    to: initialFilters.endDate ? new Date(initialFilters.endDate) : undefined,
  });
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  /**
   * Update URL with new filter value.
   */
  const updateFilter = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams);

      // Always reset to page 1 when filters change
      params.set('page', '1');

      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }

      startTransition(() => {
        router.push(`/admin/audit?${params.toString()}`);
      });
    },
    [router, searchParams]
  );

  /**
   * Handle action dropdown change.
   */
  const handleActionChange = useCallback(
    (value: string) => {
      updateFilter('action', value === 'all' ? null : value);
    },
    [updateFilter]
  );

  /**
   * Handle user ID input blur (apply filter).
   */
  const handleUserIdBlur = useCallback(() => {
    const trimmed = userIdInput.trim();
    updateFilter('userId', trimmed || null);
  }, [userIdInput, updateFilter]);

  /**
   * Handle user ID input keydown (apply on Enter).
   */
  const handleUserIdKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handleUserIdBlur();
      }
    },
    [handleUserIdBlur]
  );

  /**
   * Clear user ID filter.
   */
  const clearUserId = useCallback(() => {
    setUserIdInput('');
    updateFilter('userId', null);
  }, [updateFilter]);

  /**
   * Apply date range filter.
   */
  const applyDateRange = useCallback(() => {
    const params = new URLSearchParams(searchParams);
    params.set('page', '1');

    if (dateRange?.from) {
      params.set('startDate', dateRange.from.toISOString());
    } else {
      params.delete('startDate');
    }

    if (dateRange?.to) {
      params.set('endDate', dateRange.to.toISOString());
    } else {
      params.delete('endDate');
    }

    setDatePickerOpen(false);
    startTransition(() => {
      router.push(`/admin/audit?${params.toString()}`);
    });
  }, [dateRange, router, searchParams]);

  /**
   * Clear date range filter.
   */
  const clearDateRange = useCallback(() => {
    setDateRange(undefined);
    const params = new URLSearchParams(searchParams);
    params.set('page', '1');
    params.delete('startDate');
    params.delete('endDate');
    setDatePickerOpen(false);
    startTransition(() => {
      router.push(`/admin/audit?${params.toString()}`);
    });
  }, [router, searchParams]);

  // Get all action options
  const actionOptions = Object.keys(AUDITABLE_ACTIONS) as AuditAction[];

  // Format date range display
  const dateRangeDisplay = dateRange?.from
    ? dateRange.to
      ? `${format(dateRange.from, 'MMM d, yyyy')} - ${format(dateRange.to, 'MMM d, yyyy')}`
      : format(dateRange.from, 'MMM d, yyyy')
    : 'Select date range';

  const hasDateFilter = Boolean(initialFilters.startDate || initialFilters.endDate);

  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* Action type dropdown */}
      <Select
        value={initialFilters.action || 'all'}
        onValueChange={handleActionChange}
        disabled={isPending}
      >
        <SelectTrigger className="w-[250px]">
          <SelectValue placeholder="Filter by action" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Actions</SelectItem>
          {actionOptions.map((action) => (
            <SelectItem key={action} value={action}>
              {AUDIT_ACTION_DESCRIPTIONS[action]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* User ID input */}
      <div className="relative">
        <Input
          type="text"
          placeholder="Filter by User ID"
          value={userIdInput}
          onChange={(e) => setUserIdInput(e.target.value)}
          onBlur={handleUserIdBlur}
          onKeyDown={handleUserIdKeyDown}
          className="w-40 pr-8"
          disabled={isPending}
        />
        {userIdInput && (
          <Button
            variant="ghost"
            size="icon-xs"
            className="absolute right-2 top-1/2 -translate-y-1/2"
            onClick={clearUserId}
            aria-label="Clear user ID filter"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Date range picker */}
      <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-auto justify-start text-left font-normal"
            disabled={isPending}
          >
            <Calendar className="mr-2 h-4 w-4" />
            {dateRangeDisplay}
            {hasDateFilter && (
              <X
                className="ml-2 h-3 w-3"
                onClick={(e) => {
                  e.stopPropagation();
                  clearDateRange();
                }}
              />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-3">
            <DayPicker
              mode="range"
              selected={dateRange}
              onSelect={(range) => setDateRange(range)}
              numberOfMonths={2}
            />
            <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-[var(--border-subtle)]">
              <Button variant="outline" size="sm" onClick={clearDateRange}>
                Clear
              </Button>
              <Button size="sm" onClick={applyDateRange}>
                Apply
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Export button (right-aligned) */}
      <div className="ml-auto">
        <ExportAuditButton filters={initialFilters} />
      </div>
    </div>
  );
}
