'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BoatClass, Side, SeatSide } from '@/generated/prisma';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { getSeatsForBoatClass } from '@/lib/lineup/position-labels';

interface Athlete {
  id: string;
  displayName: string | null;
  sidePreference?: Side | null;
}

interface Seat {
  position: number;
  side: SeatSide;
  athlete: Athlete | null;
}

interface Template {
  id: string;
  name: string;
  boatClass: BoatClass;
  seats: Array<{
    position: number;
    side: SeatSide;
    athlete: Athlete | null;
  }>;
  defaultBoat: { id: string; name: string; boatClass: BoatClass | null } | null;
}

interface Props {
  template: Template;
  athletes: Athlete[];
  boats: Array<{ id: string; name: string; boatClass: BoatClass | null }>;
  isCoach: boolean;
  teamSlug: string;
}

export function LineupTemplateDetailClient({
  template,
  athletes,
  boats,
  isCoach,
  teamSlug,
}: Props) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [name, setName] = useState(template.name);
  const [selectedBoatId, setSelectedBoatId] = useState(template.defaultBoat?.id || '');
  const [seats, setSeats] = useState(template.seats);

  // Get seat template for this boat class
  const seatTemplate = getSeatsForBoatClass(template.boatClass);

  async function handleSave() {
    const response = await fetch(`/api/lineup-templates/${template.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        defaultBoatId: selectedBoatId || null,
        seats: seats.map(s => ({
          position: s.position,
          side: s.side,
          athleteId: s.athlete?.id || null,
        })),
      }),
    });

    if (response.ok) {
      router.refresh();
      setIsEditing(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this template?')) return;
    setIsDeleting(true);

    const response = await fetch(`/api/lineup-templates/${template.id}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      router.push(`/${teamSlug}/lineup-templates`);
    } else {
      setIsDeleting(false);
    }
  }

  function updateSeatAthlete(position: number, athleteId: string | null) {
    setSeats(prev =>
      prev.map(s =>
        s.position === position
          ? { ...s, athlete: athleteId ? athletes.find(a => a.id === athleteId) || null : null }
          : s
      )
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="text-sm">
        <ol className="flex items-center gap-2 text-zinc-400">
          <li>
            <Link href={`/${teamSlug}`} className="hover:text-emerald-400 transition-colors">
              Dashboard
            </Link>
          </li>
          <li>/</li>
          <li>
            <Link href={`/${teamSlug}/lineup-templates`} className="hover:text-emerald-400 transition-colors">
              Lineup Templates
            </Link>
          </li>
          <li>/</li>
          <li className="text-white truncate max-w-[200px]">{template.name}</li>
        </ol>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={`/${teamSlug}/lineup-templates`}
            className="p-2 text-zinc-400 hover:text-zinc-300 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          {isEditing ? (
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-2xl font-bold bg-transparent border-b border-zinc-600 focus:border-zinc-400 outline-none text-zinc-100"
            />
          ) : (
            <h1 className="text-2xl font-bold text-zinc-100">{template.name}</h1>
          )}
        </div>

        {isCoach && (
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setName(template.name);
                    setSelectedBoatId(template.defaultBoat?.id || '');
                    setSeats(template.seats);
                  }}
                  className="px-4 py-2 text-zinc-400 hover:text-zinc-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white transition-colors"
                >
                  Save
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 text-zinc-400 hover:text-zinc-300 transition-colors"
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex items-center gap-2 px-4 py-2 text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Boat class and default boat */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <p className="text-sm text-zinc-500">Boat Class</p>
        <p className="text-zinc-200">{template.boatClass.replace(/_/g, ' ')}</p>

        <div className="mt-4">
          <p className="text-sm text-zinc-500 mb-1">Default Boat</p>
          {isEditing ? (
            <select
              value={selectedBoatId}
              onChange={(e) => setSelectedBoatId(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm"
            >
              <option value="">No default boat</option>
              {boats.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          ) : (
            <p className="text-zinc-200">
              {template.defaultBoat?.name || 'None'}
            </p>
          )}
        </div>
      </div>

      {/* Seat assignments */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <h3 className="font-medium text-zinc-200 mb-4">Default Athletes</h3>

        <div className="space-y-2">
          {seatTemplate.map(seat => {
            const templateSeat = seats.find(s => s.position === seat.position);
            const athlete = templateSeat?.athlete;

            return (
              <div
                key={seat.position}
                className="flex items-center gap-4 p-2 bg-zinc-800/50 rounded"
              >
                <div className="w-16 text-sm text-zinc-400">
                  {seat.label}
                  {seat.side !== 'NONE' && (
                    <span className={`ml-1 text-xs ${seat.side === 'PORT' ? 'text-blue-400' : 'text-green-400'}`}>
                      ({seat.side[0]})
                    </span>
                  )}
                </div>

                {isEditing ? (
                  <select
                    value={athlete?.id || ''}
                    onChange={(e) => updateSeatAthlete(seat.position, e.target.value || null)}
                    className="flex-1 px-2 py-1 bg-zinc-700 border border-zinc-600 rounded text-sm"
                  >
                    <option value="">Unassigned</option>
                    {athletes.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.displayName || 'Unnamed'}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="flex-1 text-sm text-zinc-300">
                    {athlete?.displayName || <span className="text-zinc-600">Unassigned</span>}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
