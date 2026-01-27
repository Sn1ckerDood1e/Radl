'use client';

import { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface InlineTextareaProps {
  /** Current value */
  value: string;
  /** Called on blur with new value */
  onSave: (value: string) => void;
  /** Placeholder when empty */
  placeholder?: string;
  /** Whether save is in progress */
  isPending?: boolean;
  /** Additional class names */
  className?: string;
  /** Whether field is disabled */
  disabled?: boolean;
  /** Number of rows */
  rows?: number;
  /** Maximum length */
  maxLength?: number;
  /** ARIA label */
  'aria-label'?: string;
  /** Auto-resize height based on content */
  autoResize?: boolean;
}

/**
 * Inline editable textarea with autosave on blur.
 *
 * @example
 * <InlineTextarea
 *   value={block.notes || ''}
 *   onSave={(notes) => updateBlock({ notes })}
 *   placeholder="Add notes..."
 *   rows={2}
 *   autoResize
 * />
 */
export function InlineTextarea({
  value,
  onSave,
  placeholder = 'Add notes...',
  isPending = false,
  className,
  disabled = false,
  rows = 2,
  maxLength = 1000,
  'aria-label': ariaLabel,
  autoResize = false,
}: InlineTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [localValue, setLocalValue] = useState(value);
  const [error, setError] = useState<string | null>(null);

  // Sync local value when prop changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Auto-resize effect
  useEffect(() => {
    if (autoResize && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [localValue, autoResize]);

  const handleBlur = () => {
    setError(null);
    const trimmed = localValue.trim();

    // Validate max length
    if (maxLength && trimmed.length > maxLength) {
      setError(`Maximum ${maxLength} characters`);
      setLocalValue(value);
      return;
    }

    // Only save if changed
    if (trimmed !== value) {
      onSave(trimmed);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Escape cancels
    if (e.key === 'Escape') {
      setLocalValue(value);
      textareaRef.current?.blur();
    }
    // Cmd/Ctrl+Enter triggers save
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      textareaRef.current?.blur();
    }
  };

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled || isPending}
        rows={rows}
        maxLength={maxLength}
        aria-label={ariaLabel}
        aria-invalid={!!error}
        className={cn(
          // Base styles
          'w-full bg-transparent border border-transparent rounded-md px-2 py-1',
          'text-zinc-100 placeholder-zinc-500 resize-none',
          // Hover
          'hover:border-zinc-700',
          // Focus
          'focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500',
          // States
          isPending && 'opacity-50 cursor-wait',
          disabled && 'cursor-not-allowed opacity-40',
          error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
          className
        )}
      />
      {error && (
        <p className="absolute -bottom-5 left-0 text-xs text-red-400">
          {error}
        </p>
      )}
      {maxLength && (
        <p className={cn(
          'absolute -bottom-5 right-0 text-xs',
          localValue.length > maxLength * 0.9 ? 'text-amber-400' : 'text-zinc-500'
        )}>
          {localValue.length}/{maxLength}
        </p>
      )}
    </div>
  );
}
