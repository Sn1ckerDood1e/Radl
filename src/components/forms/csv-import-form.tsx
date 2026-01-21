'use client';

import { useState, useRef } from 'react';
import Papa from 'papaparse';

interface ParsedRow {
  name: string;
  email: string;
  role: 'ATHLETE' | 'PARENT';
}

interface ImportResult {
  created: number;
  failed: Array<{ email: string; reason: string }>;
}

interface CSVImportFormProps {
  onSuccess?: () => void;
}

export function CSVImportForm({ onSuccess }: CSVImportFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setParseError(null);
    setImportResult(null);
    setParsedData([]);

    if (!file) return;

    // Check file type
    if (!file.name.endsWith('.csv')) {
      setParseError('Please upload a CSV file');
      return;
    }

    // Parse CSV
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase(),
      complete: (results) => {
        const data = results.data as Record<string, string>[];
        const parsed: ParsedRow[] = [];
        const errors: string[] = [];

        for (let i = 0; i < data.length; i++) {
          const row = data[i];
          const rowNum = i + 2; // Account for header row

          // Check required fields
          if (!row.name?.trim()) {
            errors.push(`Row ${rowNum}: Missing name`);
            continue;
          }
          if (!row.email?.trim()) {
            errors.push(`Row ${rowNum}: Missing email`);
            continue;
          }

          // Validate email format
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(row.email.trim())) {
            errors.push(`Row ${rowNum}: Invalid email format`);
            continue;
          }

          // Determine role (default to ATHLETE)
          let role: 'ATHLETE' | 'PARENT' = 'ATHLETE';
          if (row.role) {
            const normalizedRole = row.role.trim().toUpperCase();
            if (normalizedRole === 'PARENT') {
              role = 'PARENT';
            } else if (normalizedRole !== 'ATHLETE') {
              errors.push(`Row ${rowNum}: Invalid role (use ATHLETE or PARENT)`);
              continue;
            }
          }

          parsed.push({
            name: row.name.trim(),
            email: row.email.trim(),
            role,
          });
        }

        if (errors.length > 0) {
          setParseError(errors.slice(0, 5).join('\n') + (errors.length > 5 ? `\n... and ${errors.length - 5} more errors` : ''));
        }

        if (parsed.length === 0 && errors.length === 0) {
          setParseError('No valid rows found in CSV');
          return;
        }

        setParsedData(parsed);
      },
      error: (error) => {
        setParseError(`Failed to parse CSV: ${error.message}`);
      },
    });
  };

  const handleImport = async () => {
    if (parsedData.length === 0) return;

    setIsSubmitting(true);
    setSubmitError(null);
    setImportResult(null);

    try {
      const response = await fetch('/api/invitations/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitations: parsedData }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to import invitations');
      }

      setImportResult(result.result);
      setParsedData([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onSuccess?.();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClear = () => {
    setParsedData([]);
    setParseError(null);
    setImportResult(null);
    setSubmitError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadTemplate = () => {
    const csvContent = 'name,email,role\nJohn Doe,john@example.com,ATHLETE\nJane Smith,jane@example.com,ATHLETE';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'invite-template.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {submitError && (
        <div className="p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg">
          {submitError}
        </div>
      )}

      {importResult && (
        <div className={`p-3 text-sm rounded-lg border ${importResult.created > 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'}`}>
          <p className="font-medium">
            {importResult.created > 0 ? `Successfully created ${importResult.created} invitation(s)` : 'No invitations created'}
          </p>
          {importResult.failed.length > 0 && (
            <div className="mt-2">
              <p className="font-medium">Failed ({importResult.failed.length}):</p>
              <ul className="list-disc list-inside mt-1 text-zinc-300">
                {importResult.failed.slice(0, 5).map((f, i) => (
                  <li key={i}>{f.email}: {f.reason}</li>
                ))}
                {importResult.failed.length > 5 && (
                  <li>... and {importResult.failed.length - 5} more</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Download Template */}
      <div>
        <button
          type="button"
          onClick={downloadTemplate}
          className="text-sm text-emerald-400 hover:text-emerald-300 underline transition-colors"
        >
          Download CSV Template
        </button>
      </div>

      {/* File Input */}
      <div>
        <label htmlFor="csvFile" className="block text-sm font-medium text-zinc-300">
          Upload CSV File
        </label>
        <input
          type="file"
          id="csvFile"
          ref={fileInputRef}
          accept=".csv"
          onChange={handleFileChange}
          className="mt-1 block w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-zinc-700 file:text-zinc-200 hover:file:bg-zinc-600 file:cursor-pointer file:transition-colors"
        />
        <p className="mt-1 text-xs text-zinc-500">
          Required columns: name, email. Optional: role (ATHLETE or PARENT, defaults to ATHLETE)
        </p>
      </div>

      {parseError && (
        <div className="p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg whitespace-pre-line">
          {parseError}
        </div>
      )}

      {/* Preview Table */}
      {parsedData.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-zinc-300 mb-2">
            Preview ({parsedData.length} rows)
          </h4>
          <div className="overflow-x-auto max-h-60 border border-zinc-700 rounded-lg">
            <table className="min-w-full divide-y divide-zinc-700">
              <thead className="bg-zinc-800 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-zinc-400 uppercase">Name</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-zinc-400 uppercase">Email</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-zinc-400 uppercase">Role</th>
                </tr>
              </thead>
              <tbody className="bg-zinc-900 divide-y divide-zinc-800">
                {parsedData.slice(0, 10).map((row, i) => (
                  <tr key={i} className="hover:bg-zinc-800/50">
                    <td className="px-4 py-2 text-sm text-zinc-100">{row.name}</td>
                    <td className="px-4 py-2 text-sm text-zinc-100">{row.email}</td>
                    <td className="px-4 py-2 text-sm text-zinc-100">{row.role}</td>
                  </tr>
                ))}
                {parsedData.length > 10 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-2 text-sm text-zinc-500 italic">
                      ... and {parsedData.length - 10} more rows
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {parsedData.length > 0 && (
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleImport}
            disabled={isSubmitting}
            className="flex-1 py-2 px-4 border border-transparent rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Importing...' : `Import ${parsedData.length} Invitations`}
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={isSubmitting}
            className="py-2 px-4 border border-zinc-700 rounded-lg text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 focus:ring-zinc-500 disabled:opacity-50 transition-colors"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
