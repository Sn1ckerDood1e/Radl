import { Metadata } from 'next';
import { CreateTeamForm } from '@/components/forms/create-team-form';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Create Your Team | Radl',
  description: 'Set up your rowing team with branding and invite your members.',
};

export default function CreateTeamPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] p-4">
      <div className="max-w-lg w-full">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Create Your Team
          </h1>
          <p className="mt-2 text-[var(--text-secondary)]">
            Set up your team with a name, colors, and logo.
            You can always change these later.
          </p>
        </div>

        <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-lg p-6">
          <CreateTeamForm />
        </div>

        <p className="mt-4 text-sm text-[var(--text-secondary)] text-center">
          <Link href="/onboarding" className="text-[var(--accent)] hover:underline">
            Back to options
          </Link>
        </p>
      </div>
    </div>
  );
}
