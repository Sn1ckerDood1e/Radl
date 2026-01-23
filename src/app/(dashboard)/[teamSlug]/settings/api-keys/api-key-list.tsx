'use client';

import { useState } from 'react';

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  createdBy: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

interface ApiKeyListProps {
  initialKeys: ApiKey[];
}

export function ApiKeyList({ initialKeys }: ApiKeyListProps) {
  const [keys, setKeys] = useState(initialKeys);
  const [isCreating, setIsCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!newKeyName.trim()) return;

    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create API key');
      }

      const data = await response.json();
      setNewKeyValue(data.key);
      setKeys([data, ...keys]);
      setNewKeyName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create API key');
    } finally {
      setIsCreating(false);
    }
  }

  async function handleRevoke(id: string) {
    if (!confirm('Are you sure you want to revoke this API key? This cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/api-keys/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to revoke API key');
      }

      setKeys(keys.filter(k => k.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke API key');
    }
  }

  return (
    <div className="space-y-6">
      {/* Create new key */}
      <div className="bg-[var(--surface-2)] rounded-lg p-4">
        <h2 className="font-medium text-[var(--text-primary)] mb-3">
          Create New API Key
        </h2>
        <div className="flex gap-3">
          <input
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="Key name (e.g., Mobile App)"
            className="flex-1 px-3 py-2 bg-[var(--surface-1)] border border-[var(--border)] rounded-lg text-[var(--text-primary)]"
          />
          <button
            onClick={handleCreate}
            disabled={isCreating || !newKeyName.trim()}
            className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg disabled:opacity-50"
          >
            {isCreating ? 'Creating...' : 'Create Key'}
          </button>
        </div>

        {error && (
          <p className="text-red-500 text-sm mt-2">{error}</p>
        )}

        {newKeyValue && (
          <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <p className="text-yellow-400 font-medium mb-2">
              Copy your API key now - it won't be shown again!
            </p>
            <code className="block p-2 bg-[var(--surface-1)] rounded text-sm font-mono break-all">
              {newKeyValue}
            </code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(newKeyValue);
                setNewKeyValue(null);
              }}
              className="mt-2 text-sm text-[var(--accent)]"
            >
              Copy and dismiss
            </button>
          </div>
        )}
      </div>

      {/* Existing keys */}
      <div className="bg-[var(--surface-2)] rounded-lg">
        <h2 className="font-medium text-[var(--text-primary)] p-4 border-b border-[var(--border)]">
          Active API Keys
        </h2>

        {keys.length === 0 ? (
          <p className="p-4 text-[var(--text-muted)]">
            No API keys yet. Create one above.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {keys.map((key) => (
              <li key={key.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium text-[var(--text-primary)]">
                    {key.name}
                  </div>
                  <div className="text-sm text-[var(--text-muted)]">
                    <code>{key.keyPrefix}...</code>
                    {' '}
                    {key.lastUsedAt ? (
                      <>Last used {formatDate(key.lastUsedAt)}</>
                    ) : (
                      <>Never used</>
                    )}
                    {key.expiresAt && (
                      <> | Expires {formatDate(key.expiresAt)}</>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleRevoke(key.id)}
                  className="text-red-500 hover:text-red-400 text-sm"
                >
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
