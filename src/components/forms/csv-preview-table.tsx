import { ParsedRow } from '@/hooks/use-csv-parser';

interface CSVPreviewTableProps {
  data: ParsedRow[];
}

/**
 * Preview table for parsed CSV data.
 * Shows first 10 rows with indication of remaining rows.
 */
export function CSVPreviewTable({ data }: CSVPreviewTableProps) {
  if (data.length === 0) return null;

  return (
    <div>
      <h4 className="text-sm font-medium text-zinc-300 mb-2">
        Preview ({data.length} rows)
      </h4>
      <div className="overflow-x-auto max-h-60 border border-zinc-700 rounded-lg">
        <table className="min-w-full divide-y divide-zinc-700">
          <thead className="bg-zinc-800 sticky top-0">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-zinc-400 uppercase">
                Name
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-zinc-400 uppercase">
                Email
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-zinc-400 uppercase">
                Role
              </th>
            </tr>
          </thead>
          <tbody className="bg-zinc-900 divide-y divide-zinc-800">
            {data.slice(0, 10).map((row, i) => (
              <tr key={i} className="hover:bg-zinc-800/50">
                <td className="px-4 py-2 text-sm text-zinc-100">{row.name}</td>
                <td className="px-4 py-2 text-sm text-zinc-100">{row.email}</td>
                <td className="px-4 py-2 text-sm text-zinc-100">{row.role}</td>
              </tr>
            ))}
            {data.length > 10 && (
              <tr>
                <td colSpan={3} className="px-4 py-2 text-sm text-zinc-500 italic">
                  ... and {data.length - 10} more rows
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
