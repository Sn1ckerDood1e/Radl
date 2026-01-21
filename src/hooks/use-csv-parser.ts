import { useState } from 'react';
import Papa from 'papaparse';

export interface ParsedRow {
  name: string;
  email: string;
  role: 'ATHLETE' | 'PARENT';
}

/**
 * Custom hook for parsing CSV files with validation.
 * Handles file type checking, email validation, and role normalization.
 *
 * @returns Parsed data, error state, and parsing function
 */
export function useCSVParser() {
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);

  const parseFile = (file: File | null) => {
    setParseError(null);
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
          setParseError(
            errors.slice(0, 5).join('\n') +
            (errors.length > 5 ? `\n... and ${errors.length - 5} more errors` : '')
          );
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

  const clearData = () => {
    setParsedData([]);
    setParseError(null);
  };

  return {
    parsedData,
    parseError,
    parseFile,
    clearData,
  };
}
