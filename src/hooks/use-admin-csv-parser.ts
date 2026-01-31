import { useState, useCallback } from 'react';
import Papa from 'papaparse';

/**
 * Parsed user row from CSV for bulk user creation.
 */
export interface ParsedUserRow {
  email: string;
  displayName: string;
  phone: string;
}

/**
 * Validation error for a specific row.
 */
export interface RowError {
  row: number;
  field: string;
  message: string;
}

/**
 * Result of CSV parsing.
 */
export interface ParseResult {
  validUsers: ParsedUserRow[];
  errors: RowError[];
  duplicates: { email: string; rows: number[] }[];
}

/**
 * Email validation regex.
 * Standard format: local@domain.tld
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Custom hook for parsing CSV files for admin bulk user operations.
 *
 * Features:
 * - Parses CSV with email, name/displayName, phone columns
 * - Validates email format
 * - Detects duplicate emails within file
 * - Returns valid users and errors separately
 *
 * @returns Parse state, error state, and parsing function
 *
 * @example
 * const { parseResult, isLoading, parseFile, clearData } = useAdminCSVParser();
 *
 * const handleFileChange = (e) => {
 *   parseFile(e.target.files?.[0] ?? null);
 * };
 */
export function useAdminCSVParser() {
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const parseFile = useCallback((file: File | null) => {
    // Reset state
    setParseError(null);
    setParseResult(null);

    if (!file) return;

    // Validate file extension
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setParseError('Please upload a CSV file');
      return;
    }

    setIsLoading(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase(),
      complete: (results) => {
        setIsLoading(false);

        const data = results.data as Record<string, string>[];
        const validUsers: ParsedUserRow[] = [];
        const errors: RowError[] = [];

        // Track emails for duplicate detection
        const emailOccurrences = new Map<string, number[]>();

        for (let i = 0; i < data.length; i++) {
          const row = data[i];
          const rowNum = i + 2; // Account for header row (1-indexed)

          // Get email (required)
          const email = row.email?.trim().toLowerCase();
          if (!email) {
            errors.push({
              row: rowNum,
              field: 'email',
              message: 'Email is required',
            });
            continue;
          }

          // Validate email format
          if (!EMAIL_REGEX.test(email)) {
            errors.push({
              row: rowNum,
              field: 'email',
              message: 'Invalid email format',
            });
            continue;
          }

          // Track email occurrence for duplicate detection
          const existing = emailOccurrences.get(email) || [];
          existing.push(rowNum);
          emailOccurrences.set(email, existing);

          // Get display name (optional, check multiple column names)
          const displayName = (
            row.displayname ||
            row.display_name ||
            row.name ||
            row.fullname ||
            row.full_name ||
            ''
          ).trim();

          // Get phone (optional)
          const phone = row.phone?.trim() || '';

          validUsers.push({
            email,
            displayName,
            phone,
          });
        }

        // Detect duplicates
        const duplicates: { email: string; rows: number[] }[] = [];
        for (const [email, rows] of emailOccurrences) {
          if (rows.length > 1) {
            duplicates.push({ email, rows });
            // Mark all but first occurrence as duplicate errors
            for (let i = 1; i < rows.length; i++) {
              errors.push({
                row: rows[i],
                field: 'email',
                message: `Duplicate email (first appears on row ${rows[0]})`,
              });
            }
          }
        }

        // Remove duplicates from valid users (keep only first occurrence)
        const duplicateEmails = new Set(duplicates.map((d) => d.email));
        const deduplicatedUsers: ParsedUserRow[] = [];
        const seenEmails = new Set<string>();

        for (const user of validUsers) {
          if (duplicateEmails.has(user.email)) {
            // Only keep first occurrence
            if (!seenEmails.has(user.email)) {
              deduplicatedUsers.push(user);
              seenEmails.add(user.email);
            }
          } else {
            deduplicatedUsers.push(user);
          }
        }

        // Check if we have any valid users
        if (deduplicatedUsers.length === 0 && errors.length === 0) {
          setParseError('No valid rows found in CSV. Expected columns: email, name (or displayName), phone');
          return;
        }

        setParseResult({
          validUsers: deduplicatedUsers,
          errors,
          duplicates,
        });
      },
      error: (error) => {
        setIsLoading(false);
        setParseError(`Failed to parse CSV: ${error.message}`);
      },
    });
  }, []);

  const clearData = useCallback(() => {
    setParseResult(null);
    setParseError(null);
    setIsLoading(false);
  }, []);

  return {
    parseResult,
    parseError,
    isLoading,
    parseFile,
    clearData,
  };
}
