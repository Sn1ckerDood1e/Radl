'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StateDiffDisplay } from './state-diff-display';

/**
 * Audit log item from API.
 */
export interface AuditLogItem {
  id: string;
  createdAt: string;
  action: string;
  actionDescription: string;
  userId: string;
  targetType: string;
  targetId: string | null;
  clubId: string;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: {
    beforeState?: Record<string, unknown>;
    afterState?: Record<string, unknown>;
    [key: string]: unknown;
  };
}

interface AuditLogTableProps {
  logs: AuditLogItem[];
}

/**
 * Format timestamp for display.
 */
function formatTimestamp(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Check if a log entry has state diff (before/after state).
 */
function hasStateDiff(log: AuditLogItem): boolean {
  const metadata = log.metadata;
  return Boolean(metadata?.beforeState || metadata?.afterState);
}

/**
 * Audit log table with expandable rows for state diff viewing.
 *
 * Features:
 * - Timestamp, action, actor, target columns
 * - Expandable rows for entries with before/after state
 * - Side-by-side JSON diff display
 */
export function AuditLogTable({ logs }: AuditLogTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  if (logs.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)] p-8 text-center">
        <p className="text-[var(--text-muted)]">No audit log entries found.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[var(--border-subtle)] overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[var(--border-subtle)] bg-[var(--surface-2)]">
            <th className="p-3 text-left text-sm font-medium text-[var(--text-muted)]">
              Timestamp
            </th>
            <th className="p-3 text-left text-sm font-medium text-[var(--text-muted)]">
              Action
            </th>
            <th className="p-3 text-left text-sm font-medium text-[var(--text-muted)]">
              Actor
            </th>
            <th className="p-3 text-left text-sm font-medium text-[var(--text-muted)]">
              Target
            </th>
            <th className="p-3 text-center text-sm font-medium text-[var(--text-muted)] w-16">
              Details
            </th>
          </tr>
        </thead>
        <tbody className="bg-[var(--surface-1)]">
          {logs.map((log) => {
            const isExpanded = expandedRows.has(log.id);
            const canExpand = hasStateDiff(log);

            return (
              <>
                <tr
                  key={log.id}
                  className="border-b border-[var(--border-subtle)] hover:bg-[var(--surface-2)]/50"
                >
                  <td className="p-3 text-sm text-[var(--text-primary)] whitespace-nowrap">
                    {formatTimestamp(log.createdAt)}
                  </td>
                  <td className="p-3 text-sm text-[var(--text-secondary)]">
                    <div className="flex flex-col">
                      <span className="font-medium">{log.actionDescription}</span>
                      <span className="text-xs text-[var(--text-muted)] font-mono">
                        {log.action}
                      </span>
                    </div>
                  </td>
                  <td className="p-3 text-sm text-[var(--text-secondary)]">
                    <span
                      className="font-mono text-xs truncate max-w-[200px] inline-block"
                      title={log.userId}
                    >
                      {log.userId}
                    </span>
                  </td>
                  <td className="p-3 text-sm text-[var(--text-secondary)]">
                    <div className="flex flex-col">
                      <span>{log.targetType}</span>
                      {log.targetId && (
                        <span
                          className="text-xs text-[var(--text-muted)] font-mono truncate max-w-[200px] inline-block"
                          title={log.targetId}
                        >
                          {log.targetId}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    {canExpand ? (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => toggleRow(log.id)}
                        aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
                        aria-expanded={isExpanded}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    ) : (
                      <span className="text-[var(--text-muted)]">-</span>
                    )}
                  </td>
                </tr>
                {isExpanded && (
                  <tr key={`${log.id}-details`} className="border-b border-[var(--border-subtle)]">
                    <td colSpan={5} className="p-4 bg-[var(--surface-2)]/50">
                      <StateDiffDisplay
                        beforeState={log.metadata?.beforeState ?? null}
                        afterState={log.metadata?.afterState ?? null}
                      />
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
