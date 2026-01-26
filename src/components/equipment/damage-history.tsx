'use client';

import { useState } from 'react';

interface DamageReport {
  id: string;
  reportedBy: string | null;
  reporterName: string;
  location: string;
  description: string;
  severity: 'MINOR' | 'MODERATE' | 'CRITICAL';
  category: string | null;
  photoUrl: string | null;
  status: 'OPEN' | 'RESOLVED';
  resolvedAt: string | null;
  resolvedBy: string | null;
  createdAt: string;
}

interface DamageHistoryProps {
  damageReports: DamageReport[];
  equipmentId: string;
  isCoach: boolean;
}

export function DamageHistory({ damageReports, equipmentId, isCoach }: DamageHistoryProps) {
  const [reports, setReports] = useState(damageReports);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedPhotoId, setExpandedPhotoId] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const handleResolve = async (reportId: string) => {
    setResolvingId(reportId);

    try {
      const response = await fetch(`/api/equipment/${equipmentId}/damage-reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'RESOLVED' }),
      });

      if (response.ok) {
        setReports(prev =>
          prev.map(r =>
            r.id === reportId
              ? { ...r, status: 'RESOLVED' as const, resolvedAt: new Date().toISOString() }
              : r
          )
        );
      }
    } catch (error) {
      console.error('Failed to resolve report:', error);
    } finally {
      setResolvingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (reports.length === 0) {
    return (
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
        <h3 className="text-lg font-medium text-white mb-4">Damage History</h3>
        <div className="text-center py-8">
          <svg
            className="mx-auto h-12 w-12 text-zinc-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="mt-2 text-sm text-zinc-500">No damage reports for this equipment</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
      <h3 className="text-lg font-medium text-white mb-4">
        Damage History
        <span className="ml-2 text-sm font-normal text-zinc-400">
          ({reports.filter(r => r.status === 'OPEN').length} open)
        </span>
      </h3>

      <div className="space-y-4">
        {reports.map(report => (
          <div
            key={report.id}
            className={`border rounded-lg p-4 ${
              report.status === 'OPEN' ? 'border-red-500/30 bg-red-500/5' : 'border-zinc-800 bg-zinc-800/50'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      report.status === 'OPEN'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-emerald-500/20 text-emerald-400'
                    }`}
                  >
                    {report.status === 'OPEN' ? 'Open' : 'Resolved'}
                  </span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      report.severity === 'CRITICAL'
                        ? 'bg-red-600/20 text-red-300'
                        : report.severity === 'MODERATE'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-blue-500/20 text-blue-400'
                    }`}
                  >
                    {report.severity}
                  </span>
                  {report.category && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-700 text-zinc-300">
                      {report.category}
                    </span>
                  )}
                  <span className="text-sm text-zinc-500">{formatDate(report.createdAt)}</span>
                </div>

                <p className="text-sm font-medium text-white mb-1">
                  Location: {report.location}
                </p>

                <p className="text-sm text-zinc-400">
                  {expandedId === report.id
                    ? report.description
                    : report.description.length > 150
                    ? `${report.description.substring(0, 150)}...`
                    : report.description}
                </p>

                {report.description.length > 150 && (
                  <button
                    onClick={() => setExpandedId(expandedId === report.id ? null : report.id)}
                    className="text-sm text-emerald-400 hover:text-emerald-300 mt-1"
                  >
                    {expandedId === report.id ? 'Show less' : 'Show more'}
                  </button>
                )}

                <p className="text-xs text-zinc-500 mt-2">
                  Reported by: {report.reporterName}
                </p>

                {report.status === 'RESOLVED' && report.resolvedAt && (
                  <p className="text-xs text-zinc-500">
                    Resolved: {formatDate(report.resolvedAt)}
                  </p>
                )}
              </div>

              <div className="ml-4 flex flex-col items-end gap-2">
                {report.photoUrl && (
                  <>
                    <button
                      onClick={() =>
                        setExpandedPhotoId(expandedPhotoId === report.id ? null : report.id)
                      }
                      className="relative"
                    >
                      <img
                        src={report.photoUrl}
                        alt="Damage"
                        className="h-16 w-16 object-cover rounded border border-zinc-700 cursor-pointer hover:opacity-80"
                      />
                      <span className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 hover:bg-opacity-30 rounded transition-colors">
                        <svg
                          className="h-6 w-6 text-white opacity-0 hover:opacity-100"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                          />
                        </svg>
                      </span>
                    </button>
                  </>
                )}

                {isCoach && report.status === 'OPEN' && (
                  <button
                    onClick={() => handleResolve(report.id)}
                    disabled={resolvingId === report.id}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-lg text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 transition-colors"
                  >
                    {resolvingId === report.id ? 'Resolving...' : 'Mark Resolved'}
                  </button>
                )}
              </div>
            </div>

            {/* Expanded photo modal */}
            {expandedPhotoId === report.id && report.photoUrl && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90"
                onClick={() => setExpandedPhotoId(null)}
              >
                <div className="relative max-w-4xl max-h-[90vh]">
                  <img
                    src={report.photoUrl}
                    alt="Damage detail"
                    className="max-w-full max-h-[90vh] object-contain rounded"
                  />
                  <button
                    onClick={() => setExpandedPhotoId(null)}
                    className="absolute top-4 right-4 p-2 bg-zinc-800 rounded-full shadow-lg hover:bg-zinc-700 transition-colors"
                  >
                    <svg
                      className="h-6 w-6 text-zinc-300"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
