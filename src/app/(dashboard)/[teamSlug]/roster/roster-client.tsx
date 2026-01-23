'use client';

import { useState } from 'react';
import { AthleteCard } from '@/components/athletes/athlete-card';
import { ExportButton } from '@/components/ui/export-button';
import { toCSV, downloadCSV } from '@/lib/export/csv';

type Role = 'FACILITY_ADMIN' | 'CLUB_ADMIN' | 'COACH' | 'ATHLETE' | 'PARENT';

interface AthleteProfile {
  id: string;
  displayName: string | null;
  sidePreference: 'PORT' | 'STARBOARD' | 'BOTH' | null;
  canBow: boolean;
  canCox: boolean;
  phone: string | null;
  photoUrl: string | null;
}

interface TeamMember {
  id: string;
  userId: string;
  role: Role;
  createdAt: string;
  profile: AthleteProfile | null;
}

interface RosterClientProps {
  members: TeamMember[];
  teamSlug: string;
  isCoach?: boolean;
}

type FilterTab = 'ALL' | 'COACH' | 'ATHLETE' | 'PARENT';

export function RosterClient({ members, teamSlug }: RosterClientProps) {
  const [activeFilter, setActiveFilter] = useState<FilterTab>('ALL');

  // Count members by role
  const counts = {
    ALL: members.length,
    COACH: members.filter(m => m.role === 'COACH').length,
    ATHLETE: members.filter(m => m.role === 'ATHLETE').length,
    PARENT: members.filter(m => m.role === 'PARENT').length,
  };

  // Filter members
  const filteredMembers = activeFilter === 'ALL'
    ? members
    : members.filter(m => m.role === activeFilter);

  const tabs: { id: FilterTab; label: string }[] = [
    { id: 'ALL', label: 'All' },
    { id: 'COACH', label: 'Coaches' },
    { id: 'ATHLETE', label: 'Athletes' },
    { id: 'PARENT', label: 'Parents' },
  ];

  const handleExport = () => {
    const exportData = members.map(m => ({
      name: m.profile?.displayName || 'Unknown',
      role: m.role,
      sidePreference: m.profile?.sidePreference || '',
      canBow: m.profile?.canBow ? 'Yes' : 'No',
      canCox: m.profile?.canCox ? 'Yes' : 'No',
      phone: m.profile?.phone || '',
      joinedAt: new Date(m.createdAt).toLocaleDateString(),
    }));

    const csv = toCSV(exportData, [
      { key: 'name', header: 'Name' },
      { key: 'role', header: 'Role' },
      { key: 'sidePreference', header: 'Side Preference' },
      { key: 'canBow', header: 'Can Bow' },
      { key: 'canCox', header: 'Can Cox' },
      { key: 'phone', header: 'Phone' },
      { key: 'joinedAt', header: 'Joined' },
    ]);
    const date = new Date().toISOString().split('T')[0];
    downloadCSV(csv, `roster-${date}.csv`);
  };

  return (
    <div className="space-y-6">
      {/* Filter tabs and export */}
      <div className="border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <nav className="-mb-px flex space-x-6 overflow-x-auto">
            {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                activeFilter === tab.id
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:border-zinc-600'
              }`}
            >
              {tab.label}
              <span className={`ml-2 ${
                activeFilter === tab.id
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-zinc-800 text-zinc-400'
              } px-2 py-0.5 rounded-full text-xs`}>
                {counts[tab.id]}
              </span>
            </button>
          ))}
          </nav>
          <ExportButton onExport={handleExport} label="Export" />
        </div>
      </div>

      {/* Member cards grid */}
      {filteredMembers.length === 0 ? (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-8 text-center">
          <p className="text-zinc-500">
            No {activeFilter.toLowerCase() === 'all' ? 'members' : `${activeFilter.toLowerCase()}s`} found.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMembers.map(member => (
            <AthleteCard
              key={member.id}
              id={member.id}
              userId={member.userId}
              role={member.role}
              profile={member.profile}
              teamSlug={teamSlug}
            />
          ))}
        </div>
      )}
    </div>
  );
}
