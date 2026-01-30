'use client';

import { useState, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';
import { showSuccessToast } from '@/lib/toast-helpers';

interface CopyButtonProps {
  value: string;
  label?: string;
  successMessage?: string;
  className?: string;
  iconOnly?: boolean;
}

/**
 * A button that copies text to clipboard with visual feedback.
 * Shows a checkmark for 2 seconds after successful copy.
 */
export function CopyButton({
  value,
  label = 'Copy',
  successMessage = 'Copied to clipboard',
  className = '',
  iconOnly = false,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      showSuccessToast(successMessage);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }, [value, successMessage]);

  if (iconOnly) {
    return (
      <button
        type="button"
        onClick={handleCopy}
        className={`p-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors ${className}`}
        title={copied ? 'Copied!' : label}
      >
        {copied ? (
          <Check className="h-4 w-4 text-teal-400" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
        copied
          ? 'bg-teal-500/20 text-teal-400'
          : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600 hover:text-white'
      } ${className}`}
    >
      {copied ? (
        <>
          <Check className="h-4 w-4" />
          Copied!
        </>
      ) : (
        <>
          <Copy className="h-4 w-4" />
          {label}
        </>
      )}
    </button>
  );
}
