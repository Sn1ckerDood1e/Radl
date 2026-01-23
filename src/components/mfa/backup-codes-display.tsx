'use client';

import { useState } from 'react';
import { Copy, Download, Check } from 'lucide-react';

interface BackupCodesDisplayProps {
  codes: string[];
  onDone?: () => void;
}

/**
 * Display MFA backup codes with copy and download functionality.
 * Shows codes in a grid layout with clear instructions.
 * Codes are only shown once during MFA enrollment.
 */
export function BackupCodesDisplay({ codes, onDone }: BackupCodesDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  const handleCopy = async () => {
    const text = codes.join('\n');
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const text = [
      'RowOps MFA Backup Codes',
      '========================',
      '',
      'Keep these codes safe. Each code can only be used once.',
      'If you lose access to your authenticator app, use one of these codes to sign in.',
      '',
      ...codes.map((code, i) => `${i + 1}. ${code}`),
      '',
      `Generated: ${new Date().toISOString()}`,
    ].join('\n');

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rowops-backup-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
        <p className="text-sm text-amber-400 font-medium">
          Save these backup codes in a secure location
        </p>
        <p className="text-sm text-amber-400/80 mt-1">
          These codes can be used to access your account if you lose your authenticator device.
          Each code can only be used once.
        </p>
      </div>

      {/* Codes grid */}
      <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
        <div className="grid grid-cols-2 gap-2">
          {codes.map((code, index) => (
            <div
              key={index}
              className="font-mono text-sm text-zinc-200 bg-zinc-900 px-3 py-2 rounded border border-zinc-700"
            >
              <span className="text-zinc-500 mr-2">{index + 1}.</span>
              {code}
            </div>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleCopy}
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-zinc-300 bg-zinc-800 border border-zinc-700 rounded-lg hover:bg-zinc-700 hover:text-white transition-colors"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 text-emerald-500" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              Copy
            </>
          )}
        </button>
        <button
          type="button"
          onClick={handleDownload}
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-zinc-300 bg-zinc-800 border border-zinc-700 rounded-lg hover:bg-zinc-700 hover:text-white transition-colors"
        >
          <Download className="h-4 w-4" />
          Download
        </button>
      </div>

      {/* Acknowledgment checkbox */}
      {onDone && (
        <div className="pt-2">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-zinc-900"
            />
            <span className="text-sm text-zinc-400">
              I have saved my backup codes in a secure location
            </span>
          </label>

          <button
            type="button"
            onClick={onDone}
            disabled={!acknowledged}
            className="mt-4 w-full py-2.5 px-4 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Continue
          </button>
        </div>
      )}
    </div>
  );
}
