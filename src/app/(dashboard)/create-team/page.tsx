import { Metadata } from 'next';
import { CreateTeamForm } from '@/components/forms/create-team-form';

export const metadata: Metadata = {
  title: 'Create Your Team | RowOps',
  description: 'Set up your rowing team with branding and invite your members.',
};

export default function CreateTeamPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Create Your Team
        </h1>
        <p className="mt-2 text-gray-600">
          Set up your team with a name, colors, and logo.
          You can always change these later.
        </p>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <CreateTeamForm />
      </div>
    </div>
  );
}
