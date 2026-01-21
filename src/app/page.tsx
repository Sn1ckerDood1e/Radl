import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // Not logged in - redirect to login
    redirect('/login');
  }

  // User is logged in - find their team
  const teamMember = await prisma.teamMember.findFirst({
    where: { userId: user.id },
    include: { team: true },
  });

  if (teamMember?.team) {
    // Has a team - redirect to team dashboard
    redirect(`/${teamMember.team.slug}`);
  }

  // No team yet - redirect to create team
  redirect('/create-team');
}
