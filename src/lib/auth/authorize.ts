import { createClient } from '@/lib/supabase/server';
import { jwtDecode } from 'jwt-decode';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import type { CustomJwtPayload } from './claims';

// Re-export type for consumers that need it
export type { CustomJwtPayload };

export async function getAuthUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

export async function getUserClaims(): Promise<CustomJwtPayload | null> {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  return jwtDecode<CustomJwtPayload>(session.access_token);
}

export async function requireAuth() {
  const user = await getAuthUser();
  if (!user) {
    redirect('/login');
  }
  return user;
}

export async function requireTeam(): Promise<{ user: Awaited<ReturnType<typeof requireAuth>>; claims: CustomJwtPayload }> {
  const user = await requireAuth();
  const jwtClaims = await getUserClaims();

  // If JWT claims don't have team_id, check database directly
  // This handles the case where team was just created but JWT not refreshed
  if (!jwtClaims?.team_id) {
    const teamMember = await prisma.teamMember.findFirst({
      where: { userId: user.id },
      include: { team: true },
    });

    if (!teamMember) {
      redirect('/create-team');
    }

    // Create synthetic claims from database
    const claims: CustomJwtPayload = {
      sub: user.id,
      email: user.email || '',
      facility_id: null,
      team_id: teamMember.teamId,
      user_role: teamMember.role as CustomJwtPayload['user_role'],
    };

    return { user, claims };
  }

  return { user, claims: jwtClaims };
}

export async function requireRole(allowedRoles: CustomJwtPayload['user_role'][]) {
  const { user, claims } = await requireTeam();
  if (!claims.user_role || !allowedRoles.includes(claims.user_role)) {
    redirect('/unauthorized');
  }
  return { user, claims };
}

export function isCoach(role: string | null): boolean {
  return role === 'COACH';
}

export function canViewRoster(role: string | null): boolean {
  return role === 'COACH' || role === 'ATHLETE';
}

export function canViewLineups(role: string | null): boolean {
  return role === 'COACH' || role === 'ATHLETE';
}
