'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Sparkles, Users, Calendar, CheckCircle2 } from 'lucide-react';

// ============================================================================
// Step 1: Welcome
// ============================================================================

interface WelcomeStepProps {
  teamName: string;
  onNext: () => void;
}

export function WelcomeStep({ teamName, onNext }: WelcomeStepProps) {
  return (
    <div className="text-center">
      <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-6">
        <Sparkles className="h-8 w-8 text-blue-400" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-3">
        Welcome to {teamName}!
      </h2>
      <p className="text-zinc-400 mb-8 max-w-md mx-auto">
        Let's take a quick tour to help you get started. This will only take a minute.
      </p>
      <Button onClick={onNext} size="lg">
        Get Started
      </Button>
    </div>
  );
}

// ============================================================================
// Step 2: Roster Overview
// ============================================================================

interface RosterStepProps {
  teamSlug: string;
  onNext: () => void;
}

export function RosterStep({ teamSlug, onNext }: RosterStepProps) {
  return (
    <div className="text-center">
      <div className="h-16 w-16 rounded-full bg-gradient-to-br from-green-500/20 to-teal-500/20 flex items-center justify-center mx-auto mb-6">
        <Users className="h-8 w-8 text-green-400" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-3">
        Your Team Roster
      </h2>
      <p className="text-zinc-400 mb-8 max-w-md mx-auto">
        Manage your team members, send invitations, and keep track of everyone in your rowing club.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button asChild variant="outline">
          <Link href={`/${teamSlug}/roster`}>
            View Roster
          </Link>
        </Button>
        <Button onClick={onNext}>
          Continue
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Step 3: Practice Creation Prompt
// ============================================================================

interface PracticeStepProps {
  teamSlug: string;
  onNext: () => void;
  onComplete: () => void;
}

export function PracticeStep({ teamSlug, onNext, onComplete }: PracticeStepProps) {
  const handleLater = () => {
    onComplete();
  };

  const handleCreatePractice = () => {
    onComplete();
    // Navigation will happen via Link
  };

  return (
    <div className="text-center">
      <div className="h-16 w-16 rounded-full bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center mx-auto mb-6">
        <Calendar className="h-8 w-8 text-orange-400" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-3">
        Schedule Your First Practice
      </h2>
      <p className="text-zinc-400 mb-8 max-w-md mx-auto">
        Create practice sessions, assign lineups, and let your team know when and where to meet.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button onClick={handleLater} variant="outline">
          I'll do this later
        </Button>
        <Button asChild onClick={handleCreatePractice}>
          <Link href={`/${teamSlug}/schedule?create=true`}>
            Create Practice
          </Link>
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Step 4: Completion Celebration
// ============================================================================

interface CompleteStepProps {
  teamSlug: string;
  onComplete: () => void;
}

export function CompleteStep({ teamSlug, onComplete }: CompleteStepProps) {
  return (
    <div className="text-center">
      <div className="h-16 w-16 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mx-auto mb-6">
        <CheckCircle2 className="h-8 w-8 text-purple-400" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-3">
        You're All Set!
      </h2>
      <p className="text-zinc-400 mb-8 max-w-md mx-auto">
        You're ready to start managing your rowing team. Explore the dashboard to get started.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button onClick={onComplete}>
          Go to Dashboard
        </Button>
        <Button asChild variant="outline">
          <Link href={`/${teamSlug}/schedule?create=true`}>
            Create Practice
          </Link>
        </Button>
      </div>
    </div>
  );
}
