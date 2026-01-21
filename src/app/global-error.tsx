'use client';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <html>
      <body>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f9fafb',
          padding: '1rem',
        }}>
          <div style={{
            maxWidth: '28rem',
            width: '100%',
            textAlign: 'center',
          }}>
            <h1 style={{
              fontSize: '3.75rem',
              fontWeight: 'bold',
              color: '#111827',
              marginBottom: '1rem',
            }}>
              Error
            </h1>
            <h2 style={{
              fontSize: '1.25rem',
              color: '#4b5563',
              marginBottom: '0.5rem',
            }}>
              Application Error
            </h2>
            <p style={{
              color: '#6b7280',
              marginBottom: '1.5rem',
            }}>
              A critical error occurred. Please refresh the page.
            </p>

            {error.digest && (
              <p style={{
                fontSize: '0.875rem',
                color: '#9ca3af',
                marginBottom: '1.5rem',
              }}>
                Error Reference: <code style={{
                  backgroundColor: '#f3f4f6',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '0.25rem',
                }}>{error.digest}</code>
              </p>
            )}

            <button
              onClick={reset}
              style={{
                width: '100%',
                padding: '0.5rem 1rem',
                backgroundColor: '#2563eb',
                color: 'white',
                borderRadius: '0.5rem',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1rem',
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
