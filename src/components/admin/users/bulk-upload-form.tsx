'use client';

import { useState, useRef } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { showErrorToast, showSuccessToast } from '@/lib/toast-helpers';
import { useAdminCSVParser, type ParsedUserRow } from '@/hooks/use-admin-csv-parser';

/**
 * Result for a single user in bulk creation.
 */
interface UserResult {
  email: string;
  status: 'created' | 'skipped' | 'failed';
  userId?: string;
  reason?: string;
  inviteSent?: boolean;
}

/**
 * Bulk creation response from API.
 */
interface BulkCreateResponse {
  success: boolean;
  results: UserResult[];
  summary: {
    total: number;
    created: number;
    skipped: number;
    failed: number;
  };
}

/**
 * Bulk upload form for creating multiple users via CSV.
 *
 * Features:
 * - CSV format guide with downloadable template
 * - File upload with drag-and-drop support
 * - Preview table showing parsed users
 * - Error display for invalid rows
 * - Submit button with loading state
 * - Results summary (created/skipped/failed)
 */
export function BulkUploadForm() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { parseResult, parseError, isLoading: isParsing, parseFile, clearData } = useAdminCSVParser();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResults, setSubmitResults] = useState<BulkCreateResponse | null>(null);

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
    if (!parseResult || parseResult.validUsers.length === 0) return;

    setIsSubmitting(true);
    setSubmitResults(null);

    try {
      const response = await fetch('/api/admin/users/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          users: parseResult.validUsers.map((u) => ({
            email: u.email,
            displayName: u.displayName || undefined,
            phone: u.phone || undefined,
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create users');
      }

      const data: BulkCreateResponse = await response.json();
      setSubmitResults(data);

      if (data.summary.created > 0) {
        showSuccessToast(
          `Created ${data.summary.created} user${data.summary.created === 1 ? '' : 's'}. Password setup emails sent.`
        );
      }

      if (data.summary.failed > 0) {
        showErrorToast({
          message: `${data.summary.failed} user${data.summary.failed === 1 ? '' : 's'} failed to create`,
        });
      }
    } catch (error) {
      showErrorToast({
        message: error instanceof Error ? error.message : 'Failed to create users',
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
                <td className="py-1">User&apos;s email address</td>
              </tr>
              <tr>
                <td className="pr-6 py-1 font-mono text-teal-500">name</td>
                <td className="pr-6 py-1">No</td>
                <td className="py-1">Display name (also accepts displayName, full_name)</td>
              </tr>
              <tr>
                <td className="pr-6 py-1 font-mono text-teal-500">phone</td>
                <td className="pr-6 py-1">No</td>
                <td className="py-1">Phone number</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mt-3">
          <p className="text-xs text-[var(--text-muted)]">
            Example: <code className="bg-[var(--surface-2)] px-1 rounded">email,name,phone</code>
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Maximum 100 users per upload. Existing users will be skipped.
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
              {parseResult.validUsers.length} valid user{parseResult.validUsers.length === 1 ? '' : 's'} found
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
                  CSV files only, max 100 users
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
                    {dup.email} (rows {dup.rows.join(', ')}) - only first will be created
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
      {parseResult && parseResult.validUsers.length > 0 && !submitResults && (
        <div className="rounded-lg border border-[var(--border-subtle)] overflow-hidden">
          <div className="bg-[var(--surface-1)] px-4 py-3 border-b border-[var(--border-subtle)]">
            <h3 className="font-medium text-[var(--text-primary)]">
              Preview ({parseResult.validUsers.length} users)
            </h3>
          </div>
          <div className="overflow-x-auto max-h-64 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--surface-2)] sticky top-0">
                <tr className="text-left text-[var(--text-muted)]">
                  <th className="px-4 py-2">#</th>
                  <th className="px-4 py-2">Email</th>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Phone</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {parseResult.validUsers.slice(0, 50).map((user, i) => (
                  <PreviewRow key={i} index={i} user={user} />
                ))}
                {parseResult.validUsers.length > 50 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-2 text-center text-[var(--text-muted)]">
                      ... and {parseResult.validUsers.length - 50} more users
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
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-green-500">{submitResults.summary.created}</p>
                <p className="text-sm text-[var(--text-muted)]">Created</p>
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
              Upload Another File
            </Button>
          </div>
        </div>
      )}

      {/* Submit Button */}
      {parseResult && parseResult.validUsers.length > 0 && !submitResults && (
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={handleClear}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={isSubmitting}>
            Create {parseResult.validUsers.length} User{parseResult.validUsers.length === 1 ? '' : 's'}
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Preview row component for user preview table.
 */
function PreviewRow({ index, user }: { index: number; user: ParsedUserRow }) {
  return (
    <tr className="text-[var(--text-primary)]">
      <td className="px-4 py-2 text-[var(--text-muted)]">{index + 1}</td>
      <td className="px-4 py-2">{user.email}</td>
      <td className="px-4 py-2">{user.displayName || <span className="text-[var(--text-muted)]">-</span>}</td>
      <td className="px-4 py-2">{user.phone || <span className="text-[var(--text-muted)]">-</span>}</td>
    </tr>
  );
}

/**
 * Result row component for results table.
 */
function ResultRow({ result }: { result: UserResult }) {
  return (
    <tr className="text-[var(--text-primary)]">
      <td className="px-4 py-2">{result.email}</td>
      <td className="px-4 py-2">
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
            result.status === 'created'
              ? 'bg-green-500/20 text-green-500'
              : result.status === 'skipped'
              ? 'bg-amber-500/20 text-amber-500'
              : 'bg-red-500/20 text-red-500'
          }`}
        >
          {result.status === 'created' && <CheckCircle2 className="h-3 w-3" />}
          {result.status === 'skipped' && <AlertCircle className="h-3 w-3" />}
          {result.status === 'failed' && <XCircle className="h-3 w-3" />}
          {result.status}
        </span>
      </td>
      <td className="px-4 py-2 text-[var(--text-muted)]">
        {result.status === 'created' && result.inviteSent && 'Password email sent'}
        {result.status === 'created' && !result.inviteSent && 'Created (email failed)'}
        {result.status === 'skipped' && result.reason}
        {result.status === 'failed' && result.reason}
      </td>
    </tr>
  );
}
