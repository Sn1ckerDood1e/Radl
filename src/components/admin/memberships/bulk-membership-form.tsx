'use client';

import { useState, useRef } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle2, XCircle, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { showErrorToast, showSuccessToast } from '@/lib/toast-helpers';
import { useMembershipCSVParser, type ParsedMembershipRow } from '@/hooks/use-membership-csv-parser';

/**
 * Result for a single member in bulk import.
 */
interface MemberResult {
  email: string;
  status: 'added' | 'updated' | 'skipped' | 'failed';
  membershipId?: string;
  userId?: string;
  reason?: string;
  roles?: string[];
}

/**
 * Bulk import response from API.
 */
interface BulkImportResponse {
  success: boolean;
  results: MemberResult[];
  summary: {
    total: number;
    added: number;
    updated: number;
    skipped: number;
    failed: number;
  };
}

interface BulkMembershipFormProps {
  /**
   * The club ID to add members to.
   */
  clubId: string;
  /**
   * The club name for display.
   */
  clubName: string;
}

/**
 * Bulk membership upload form for adding multiple members via CSV.
 *
 * Features:
 * - CSV format guide (email, role columns)
 * - File upload with drag-and-drop support
 * - Preview table showing parsed members
 * - Error display for invalid rows
 * - Duplicate warning display
 * - Submit button with loading state
 * - Results summary (added/updated/skipped/failed)
 * - Detailed results table
 *
 * @example
 * ```tsx
 * <BulkMembershipForm clubId="abc-123" clubName="Rowing Club" />
 * ```
 */
export function BulkMembershipForm({ clubId, clubName }: BulkMembershipFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { parseResult, parseError, isLoading: isParsing, parseFile, clearData } = useMembershipCSVParser();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResults, setSubmitResults] = useState<BulkImportResponse | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSubmitResults(null);
    parseFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0] ?? null;
    setSubmitResults(null);
    parseFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleClear = () => {
    clearData();
    setSubmitResults(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!parseResult || parseResult.validRows.length === 0) return;

    setIsSubmitting(true);
    setSubmitResults(null);

    try {
      const response = await fetch(`/api/admin/clubs/${clubId}/members/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          members: parseResult.validRows.map((row) => ({
            email: row.email,
            roles: row.roles,
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to import members');
      }

      const data: BulkImportResponse = await response.json();
      setSubmitResults(data);

      const addedOrUpdated = data.summary.added + data.summary.updated;
      if (addedOrUpdated > 0) {
        showSuccessToast(
          `Added ${data.summary.added}, updated ${data.summary.updated} member${addedOrUpdated === 1 ? '' : 's'}.`
        );
      }

      if (data.summary.failed > 0) {
        showErrorToast({
          message: `${data.summary.failed} member${data.summary.failed === 1 ? '' : 's'} failed to import`,
        });
      }
    } catch (error) {
      showErrorToast({
        message: error instanceof Error ? error.message : 'Failed to import members',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* CSV Format Guide */}
      <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)] p-4">
        <h3 className="font-medium text-[var(--text-primary)]">CSV Format</h3>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Your CSV file should have the following columns:
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="text-sm">
            <thead>
              <tr className="text-left text-[var(--text-muted)]">
                <th className="pr-6 pb-2">Column</th>
                <th className="pr-6 pb-2">Required</th>
                <th className="pb-2">Description</th>
              </tr>
            </thead>
            <tbody className="text-[var(--text-primary)]">
              <tr>
                <td className="pr-6 py-1 font-mono text-teal-500">email</td>
                <td className="pr-6 py-1">Yes</td>
                <td className="py-1">User&apos;s email (must already exist in system)</td>
              </tr>
              <tr>
                <td className="pr-6 py-1 font-mono text-teal-500">role</td>
                <td className="pr-6 py-1">No</td>
                <td className="py-1">
                  Member role(s). Comma-separated for multiple roles.
                  <br />
                  <span className="text-[var(--text-muted)]">
                    Options: ATHLETE, COACH, CLUB_ADMIN, FACILITY_ADMIN, PARENT
                  </span>
                  <br />
                  <span className="text-[var(--text-muted)]">Default: ATHLETE</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mt-3">
          <p className="text-xs text-[var(--text-muted)]">
            Example: <code className="bg-[var(--surface-2)] px-1 rounded">email,role</code>
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Maximum 100 members per upload. Users must already exist in the system.
          </p>
        </div>
      </div>

      {/* File Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="rounded-lg border-2 border-dashed border-[var(--border-subtle)] bg-[var(--surface-1)] p-8 text-center hover:border-teal-500/50 transition-colors"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          className="hidden"
          id="csv-upload"
        />

        {isParsing ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 text-teal-500 animate-spin" />
            <p className="text-[var(--text-muted)]">Parsing CSV...</p>
          </div>
        ) : parseResult ? (
          <div className="flex flex-col items-center gap-3">
            <FileText className="h-8 w-8 text-teal-500" />
            <p className="text-[var(--text-primary)]">
              {parseResult.validRows.length} valid member{parseResult.validRows.length === 1 ? '' : 's'} found
            </p>
            <Button variant="outline" size="sm" onClick={handleClear}>
              Clear and upload different file
            </Button>
          </div>
        ) : (
          <label htmlFor="csv-upload" className="cursor-pointer">
            <div className="flex flex-col items-center gap-3">
              <Upload className="h-8 w-8 text-[var(--text-muted)]" />
              <div>
                <p className="text-[var(--text-primary)]">
                  Drop your CSV file here or{' '}
                  <span className="text-teal-500 underline">browse</span>
                </p>
                <p className="text-sm text-[var(--text-muted)] mt-1">
                  CSV files only, max 100 members
                </p>
              </div>
            </div>
          </label>
        )}
      </div>

      {/* Parse Error */}
      {parseError && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-500">Parse Error</p>
              <pre className="text-sm text-red-400 mt-1 whitespace-pre-wrap">{parseError}</pre>
            </div>
          </div>
        </div>
      )}

      {/* Validation Errors */}
      {parseResult && parseResult.errors.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-amber-500">
                {parseResult.errors.length} row{parseResult.errors.length === 1 ? '' : 's'} with errors (will be skipped)
              </p>
              <ul className="text-sm text-amber-400 mt-2 space-y-1 max-h-32 overflow-y-auto">
                {parseResult.errors.slice(0, 10).map((err, i) => (
                  <li key={i}>
                    Row {err.row}: {err.message}
                  </li>
                ))}
                {parseResult.errors.length > 10 && (
                  <li className="text-amber-300">
                    ... and {parseResult.errors.length - 10} more errors
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Duplicates Warning */}
      {parseResult && parseResult.duplicates.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-500">
                Duplicate emails found in file
              </p>
              <ul className="text-sm text-amber-400 mt-2 space-y-1">
                {parseResult.duplicates.slice(0, 5).map((dup, i) => (
                  <li key={i}>
                    {dup.email} (rows {dup.rows.join(', ')}) - only first will be imported
                  </li>
                ))}
                {parseResult.duplicates.length > 5 && (
                  <li className="text-amber-300">
                    ... and {parseResult.duplicates.length - 5} more duplicates
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Preview Table */}
      {parseResult && parseResult.validRows.length > 0 && !submitResults && (
        <div className="rounded-lg border border-[var(--border-subtle)] overflow-hidden">
          <div className="bg-[var(--surface-1)] px-4 py-3 border-b border-[var(--border-subtle)]">
            <h3 className="font-medium text-[var(--text-primary)]">
              Preview ({parseResult.validRows.length} members)
            </h3>
          </div>
          <div className="overflow-x-auto max-h-64 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--surface-2)] sticky top-0">
                <tr className="text-left text-[var(--text-muted)]">
                  <th className="px-4 py-2">#</th>
                  <th className="px-4 py-2">Email</th>
                  <th className="px-4 py-2">Roles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {parseResult.validRows.slice(0, 50).map((row, i) => (
                  <PreviewRow key={i} index={i} row={row} />
                ))}
                {parseResult.validRows.length > 50 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-2 text-center text-[var(--text-muted)]">
                      ... and {parseResult.validRows.length - 50} more members
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Results Table */}
      {submitResults && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)] p-4">
            <h3 className="font-medium text-[var(--text-primary)] mb-3">Results Summary</h3>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-green-500">{submitResults.summary.added}</p>
                <p className="text-sm text-[var(--text-muted)]">Added</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-500">{submitResults.summary.updated}</p>
                <p className="text-sm text-[var(--text-muted)]">Updated</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-500">{submitResults.summary.skipped}</p>
                <p className="text-sm text-[var(--text-muted)]">Skipped</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-500">{submitResults.summary.failed}</p>
                <p className="text-sm text-[var(--text-muted)]">Failed</p>
              </div>
            </div>
          </div>

          {/* Detailed Results */}
          <div className="rounded-lg border border-[var(--border-subtle)] overflow-hidden">
            <div className="bg-[var(--surface-1)] px-4 py-3 border-b border-[var(--border-subtle)]">
              <h3 className="font-medium text-[var(--text-primary)]">Detailed Results</h3>
            </div>
            <div className="overflow-x-auto max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-[var(--surface-2)] sticky top-0">
                  <tr className="text-left text-[var(--text-muted)]">
                    <th className="px-4 py-2">Email</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {submitResults.results.map((result, i) => (
                    <ResultRow key={i} result={result} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* New Upload Button */}
          <div className="flex justify-center">
            <Button variant="outline" onClick={handleClear}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Upload Another File
            </Button>
          </div>
        </div>
      )}

      {/* Submit Button */}
      {parseResult && parseResult.validRows.length > 0 && !submitResults && (
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={handleClear}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={isSubmitting}>
            Import {parseResult.validRows.length} Member{parseResult.validRows.length === 1 ? '' : 's'} to {clubName}
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Preview row component for member preview table.
 */
function PreviewRow({ index, row }: { index: number; row: ParsedMembershipRow }) {
  return (
    <tr className="text-[var(--text-primary)]">
      <td className="px-4 py-2 text-[var(--text-muted)]">{index + 1}</td>
      <td className="px-4 py-2">{row.email}</td>
      <td className="px-4 py-2">
        <div className="flex flex-wrap gap-1">
          {row.roles.map((role) => (
            <span
              key={role}
              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[var(--surface-2)] text-[var(--text-secondary)] border border-[var(--border-subtle)]"
            >
              {role}
            </span>
          ))}
        </div>
      </td>
    </tr>
  );
}

/**
 * Result row component for results table.
 */
function ResultRow({ result }: { result: MemberResult }) {
  const getStatusIcon = () => {
    switch (result.status) {
      case 'added':
        return <CheckCircle2 className="h-3 w-3" />;
      case 'updated':
        return <RefreshCw className="h-3 w-3" />;
      case 'skipped':
        return <AlertCircle className="h-3 w-3" />;
      case 'failed':
        return <XCircle className="h-3 w-3" />;
    }
  };

  const getStatusColor = () => {
    switch (result.status) {
      case 'added':
        return 'bg-green-500/20 text-green-500';
      case 'updated':
        return 'bg-blue-500/20 text-blue-500';
      case 'skipped':
        return 'bg-amber-500/20 text-amber-500';
      case 'failed':
        return 'bg-red-500/20 text-red-500';
    }
  };

  const getDetails = () => {
    if (result.reason) {
      return result.reason;
    }
    if (result.status === 'added' && result.roles) {
      return `Added with roles: ${result.roles.join(', ')}`;
    }
    return '-';
  };

  return (
    <tr className="text-[var(--text-primary)]">
      <td className="px-4 py-2">{result.email}</td>
      <td className="px-4 py-2">
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor()}`}
        >
          {getStatusIcon()}
          {result.status}
        </span>
      </td>
      <td className="px-4 py-2 text-[var(--text-muted)]">{getDetails()}</td>
    </tr>
  );
}
