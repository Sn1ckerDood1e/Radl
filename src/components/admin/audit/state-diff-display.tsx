'use client';

interface StateDiffDisplayProps {
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
}

/**
 * Side-by-side JSON display for audit log before/after state diff.
 *
 * Displays the state before and after an action in a two-column layout
 * with formatted JSON for easy comparison.
 */
export function StateDiffDisplay({ beforeState, afterState }: StateDiffDisplayProps) {
  if (!beforeState && !afterState) {
    return (
      <div className="text-sm text-[var(--text-muted)] italic">
        No state changes recorded
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Before state */}
      <div>
        <h4 className="text-sm font-medium text-[var(--text-primary)] mb-2">Before</h4>
        {beforeState ? (
          <pre className="bg-[var(--surface-2)] p-3 rounded text-xs overflow-auto max-h-60 text-[var(--text-secondary)]">
            {JSON.stringify(beforeState, null, 2)}
          </pre>
        ) : (
          <div className="bg-[var(--surface-2)] p-3 rounded text-xs text-[var(--text-muted)] italic">
            No previous state (new record)
          </div>
        )}
      </div>

      {/* After state */}
      <div>
        <h4 className="text-sm font-medium text-[var(--text-primary)] mb-2">After</h4>
        {afterState ? (
          <pre className="bg-[var(--surface-2)] p-3 rounded text-xs overflow-auto max-h-60 text-[var(--text-secondary)]">
            {JSON.stringify(afterState, null, 2)}
          </pre>
        ) : (
          <div className="bg-[var(--surface-2)] p-3 rounded text-xs text-[var(--text-muted)] italic">
            Record deleted
          </div>
        )}
      </div>
    </div>
  );
}
