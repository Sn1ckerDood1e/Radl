'use client';

import { useOnboarding } from '@/hooks/use-onboarding';
import { WelcomeStep, RosterStep, PracticeStep, CompleteStep } from './onboarding-steps';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface OnboardingWizardProps {
  teamId: string;
  teamName: string;
}

// ============================================================================
// Progress Dots Component
// ============================================================================

interface ProgressDotsProps {
  currentStep: number;
  totalSteps: number;
}

function ProgressDots({ currentStep, totalSteps }: ProgressDotsProps) {
  return (
    <div className="flex gap-2 justify-center mb-4">
      {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
        <div
          key={step}
          className={cn(
            'h-2 w-2 rounded-full transition-all',
            step === currentStep
              ? 'bg-blue-500 w-6'
              : step < currentStep
              ? 'bg-blue-500/50'
              : 'bg-zinc-700'
          )}
        />
      ))}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function OnboardingWizard({ teamId, teamName }: OnboardingWizardProps) {
  const { state, showOnboarding, nextStep, complete, skip } = useOnboarding(teamId);

  // Don't render if onboarding shouldn't be shown or still loading
  if (!showOnboarding || !state) {
    return null;
  }

  const { currentStep } = state;
  const totalSteps = 4;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 shadow-2xl max-w-2xl w-full relative">
        {/* Skip Button */}
        <Button
          onClick={skip}
          variant="ghost"
          size="icon-sm"
          className="absolute top-4 right-4 text-zinc-400 hover:text-white"
          aria-label="Skip onboarding"
        >
          <X className="h-5 w-5" />
        </Button>

        {/* Content */}
        <div className="p-8 sm:p-12">
          {/* Progress */}
          <div className="mb-8">
            <ProgressDots currentStep={currentStep} totalSteps={totalSteps} />
            <p className="text-sm text-zinc-500 text-center">
              Step {currentStep} of {totalSteps}
            </p>
          </div>

          {/* Step Content */}
          <div className="min-h-[300px] flex items-center justify-center">
            {currentStep === 1 && (
              <WelcomeStep teamName={teamName} onNext={nextStep} />
            )}
            {currentStep === 2 && (
              <RosterStep onNext={nextStep} />
            )}
            {currentStep === 3 && (
              <PracticeStep onNext={nextStep} onComplete={complete} />
            )}
            {currentStep === 4 && (
              <CompleteStep onComplete={complete} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
