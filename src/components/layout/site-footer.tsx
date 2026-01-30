import Link from 'next/link';

/**
 * Site footer with copyright and legal links.
 * Rendered on all authenticated dashboard pages.
 */
export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--border-subtle)] bg-[var(--surface-1)]">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-[var(--text-muted)]">
          {/* Copyright */}
          <span>&copy; 2026 Radl, Inc.</span>

          {/* Legal Links */}
          <nav className="flex items-center gap-4">
            <Link
              href="/terms"
              className="hover:text-teal-600 transition-colors"
            >
              Terms of Service
            </Link>
            <Link
              href="/privacy"
              className="hover:text-teal-600 transition-colors"
            >
              Privacy Policy
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
