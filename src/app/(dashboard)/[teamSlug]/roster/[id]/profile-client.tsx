'use client';

import { useState } from 'react';
import { AthleteForm } from '@/components/athletes/athlete-form';

type Role = 'FACILITY_ADMIN' | 'CLUB_ADMIN' | 'COACH' | 'ATHLETE' | 'PARENT';
type Side = 'PORT' | 'STARBOARD' | 'BOTH';

interface AthleteProfile {
  id: string;
  displayName: string | null;
  sidePreference: Side | null;
  canBow: boolean;
  canCox: boolean;
  phone: string | null;
  emergencyName: string | null;
  emergencyPhone: string | null;
  photoUrl: string | null;
}

interface TeamMember {
  id: string;
  userId: string;
  role: Role;
  createdAt: string;
  profile: AthleteProfile | null;
}

interface AthleteProfileClientProps {
  member: TeamMember;
  teamSlug: string;
  canEdit: boolean;
  isSelf: boolean;
}

export function AthleteProfileClient({
  member: initialMember,
  teamSlug,
  canEdit,
  isSelf,
}: AthleteProfileClientProps) {
  const [member, setMember] = useState(initialMember);
  const [isEditing, setIsEditing] = useState(false);

  // Get display name or placeholder
  const displayName = member.profile?.displayName || 'Unnamed';

  // Get initials for avatar
  const initials = displayName
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Format side preference
  const sideDisplay = member.profile?.sidePreference ? {
    PORT: 'Port',
    STARBOARD: 'Starboard',
    BOTH: 'Both',
  }[member.profile.sidePreference] : 'Not set';

  // Role badge styles
  const roleBadgeStyles: Record<Role, string> = {
    FACILITY_ADMIN: 'bg-red-100 text-red-800',
    CLUB_ADMIN: 'bg-orange-100 text-orange-800',
    COACH: 'bg-purple-100 text-purple-800',
    ATHLETE: 'bg-blue-100 text-blue-800',
    PARENT: 'bg-green-100 text-green-800',
  };

  const handleEditSuccess = (updatedProfile: AthleteProfile) => {
    setMember({
      ...member,
      profile: updatedProfile,
    });
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-medium text-gray-900">Edit Profile</h2>
          <button
            onClick={() => setIsEditing(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
        </div>
        <AthleteForm
          memberId={member.id}
          initialProfile={member.profile}
          onSuccess={handleEditSuccess}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-start gap-6">
          {/* Avatar */}
          {member.profile?.photoUrl ? (
            <img
              src={member.profile.photoUrl}
              alt={displayName}
              className="h-24 w-24 rounded-full object-cover"
            />
          ) : (
            <div className="h-24 w-24 rounded-full bg-gray-200 flex items-center justify-center text-2xl font-semibold text-gray-600">
              {initials}
            </div>
          )}

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{displayName}</h1>
              <span className={`text-sm px-3 py-1 rounded-full font-medium ${roleBadgeStyles[member.role]}`}>
                {member.role.charAt(0) + member.role.slice(1).toLowerCase()}
              </span>
            </div>

            {/* Joined date */}
            <p className="text-sm text-gray-500">
              Joined {new Date(member.createdAt).toLocaleDateString()}
            </p>

            {canEdit && (
              <button
                onClick={() => setIsEditing(true)}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                {isSelf ? 'Edit My Profile' : 'Edit Profile'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Rowing info (for athletes) */}
      {member.role === 'ATHLETE' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Rowing Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-500">Side Preference</p>
              <p className="font-medium text-gray-900">{sideDisplay}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Can Bow</p>
              <p className="font-medium text-gray-900">
                {member.profile?.canBow ? 'Yes' : 'No'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Can Coxswain</p>
              <p className="font-medium text-gray-900">
                {member.profile?.canCox ? 'Yes' : 'No'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Contact info */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h2>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-500">Phone</p>
            <p className="font-medium text-gray-900">
              {member.profile?.phone || 'Not provided'}
            </p>
          </div>
        </div>
      </div>

      {/* Emergency contact */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Emergency Contact</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-gray-500">Name</p>
            <p className="font-medium text-gray-900">
              {member.profile?.emergencyName || 'Not provided'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Phone</p>
            <p className="font-medium text-gray-900">
              {member.profile?.emergencyPhone || 'Not provided'}
            </p>
          </div>
        </div>
      </div>

      {/* Self indicator */}
      {isSelf && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            This is your profile. You can edit it anytime to keep your information up to date.
          </p>
        </div>
      )}
    </div>
  );
}
