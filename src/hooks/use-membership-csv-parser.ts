import { useState, useCallback } from 'react';
import Papa from 'papaparse';

/**
 * Valid roles for club membership.
 * Matches Prisma Role enum.
 */
const VALID_ROLES = ['FACILITY_ADMIN', 'CLUB_ADMIN', 'COACH', 'ATHLETE', 'PARENT'] as const;

type Role = (typeof VALID_ROLES)[number];

/**
 * Parsed membership row from CSV.
 */
export interface ParsedMembershipRow {
  email: string;
  roles: Role[];
}

/**
 * Validation error for a specific row.
 */
export interface MembershipRowError {
  row: number;
  field: string;
  message: string;
}

/**
 * Result of CSV parsing.
 */
export interface MembershipParseResult {
  validRows: ParsedMembershipRow[];
  errors: MembershipRowError[];
  duplicates: { email: string; rows: number[] }[];
}

/**
 * Email validation regex.
 * Standard format: local@domain.tld
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Parse and validate a role string.
 * Returns null if invalid.
 */
function parseRole(roleStr: string): Role | null {
  const normalized = roleStr.trim().toUpperCase();
  if (VALID_ROLES.includes(normalized as Role)) {
    return normalized as Role;
  }
  return null;
}

/**
 * Parse roles from a string value.
 * Supports comma-separated for multi-role, or single role.
 * Defaults to ['ATHLETE'] if empty.
 */
function parseRoles(value: string | undefined): { roles: Role[]; invalid: string[] } {
  if (!value || !value.trim()) {
    return { roles: ['ATHLETE'], invalid: [] };
  }

  const parts = value.split(',').map((s) => s.trim()).filter(Boolean);
  const roles: Role[] = [];
  const invalid: string[] = [];

  for (const part of parts) {
    const role = parseRole(part);
    if (role) {
      if (!roles.includes(role)) {
        roles.push(role);
      }
    } else {
      invalid.push(part);
    }
  }

  // Default to ATHLETE if no valid roles parsed
  if (roles.length === 0) {
    roles.push('ATHLETE');
  }

  return { roles, invalid };
}

/**
 * Custom hook for parsing CSV files for bulk membership import.
 *
 * Features:
 * - Parses CSV with email, role/roles columns
 * - Validates email format
 * - Validates roles against allowed values
 * - Detects duplicate emails within file
 * - Returns valid rows and errors separately
 *
 * @returns Parse state, error state, and parsing function
 *
 * @example
 * const { parseResult, isLoading, parseFile, clearData } = useMembershipCSVParser();
 *
 * const handleFileChange = (e) => {
 *   parseFile(e.target.files?.[0] ?? null);
 * };
 */
export function useMembershipCSVParser() {
  const [parseResult, setParseResult] = useState<MembershipParseResult | null>(null);
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
        const validRows: ParsedMembershipRow[] = [];
        const errors: MembershipRowError[] = [];

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

          // Parse roles (support both 'role' and 'roles' column names)
          const roleValue = row.roles || row.role || '';
          const { roles, invalid } = parseRoles(roleValue);

          // Warn about invalid roles but don't skip the row
          if (invalid.length > 0) {
            errors.push({
              row: rowNum,
              field: 'roles',
              message: `Invalid role(s): ${invalid.join(', ')}. Valid: ${VALID_ROLES.join(', ')}`,
            });
          }

          validRows.push({
            email,
            roles,
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

        // Remove duplicates from valid rows (keep only first occurrence)
        const duplicateEmails = new Set(duplicates.map((d) => d.email));
        const deduplicatedRows: ParsedMembershipRow[] = [];
        const seenEmails = new Set<string>();

        for (const row of validRows) {
          if (duplicateEmails.has(row.email)) {
            // Only keep first occurrence
            if (!seenEmails.has(row.email)) {
              deduplicatedRows.push(row);
              seenEmails.add(row.email);
            }
          } else {
            deduplicatedRows.push(row);
          }
        }

        // Check if we have any valid rows
        if (deduplicatedRows.length === 0 && errors.length === 0) {
          setParseError('No valid rows found in CSV. Expected columns: email, role (or roles)');
          return;
        }

        setParseResult({
          validRows: deduplicatedRows,
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
