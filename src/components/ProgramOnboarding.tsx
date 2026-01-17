'use client';

import { useState } from 'react';
import { ProgramPersonalization } from '@/lib/types';

interface ProgramOnboardingProps {
  onComplete: (personalization: ProgramPersonalization) => void;
  onCancel: () => void;
}

type Step = 'race-date' | 'fitness-level' | 'days-per-week' | 'confirm';

export default function ProgramOnboarding({ onComplete, onCancel }: ProgramOnboardingProps) {
  const [currentStep, setCurrentStep] = useState<Step>('race-date');
  const [raceDate, setRaceDate] = useState<string>('');
  const [hasRace, setHasRace] = useState<boolean | null>(null);
  const [fitnessLevel, setFitnessLevel] = useState<'beginner' | 'intermediate' | 'advanced' | null>(null);
  const [daysPerWeek, setDaysPerWeek] = useState<3 | 4 | 5 | 6>(4);

  const steps: Step[] = ['race-date', 'fitness-level', 'days-per-week', 'confirm'];
  const currentStepIndex = steps.indexOf(currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const canProceed = () => {
    switch (currentStep) {
      case 'race-date':
        return hasRace !== null && (hasRace === false || raceDate !== '');
      case 'fitness-level':
        return fitnessLevel !== null;
      case 'days-per-week':
        return true;
      case 'confirm':
        return true;
    }
  };

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex]);
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex]);
    } else {
      onCancel();
    }
  };

  const handleComplete = () => {
    if (!fitnessLevel) return;

    const personalization: ProgramPersonalization = {
      fitnessLevel,
      daysPerWeek,
      raceDate: hasRace && raceDate ? raceDate : undefined,
    };
    onComplete(personalization);
  };

  const getWeeksUntilRace = () => {
    if (!raceDate) return null;
    const race = new Date(raceDate);
    const now = new Date();
    const diffMs = race.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return Math.ceil(diffDays / 7);
  };

  const getProgramType = () => {
    const weeks = getWeeksUntilRace();
    if (weeks === null || weeks > 10) {
      return fitnessLevel === 'beginner' ? '12-week' : '8-week';
    }
    return '8-week';
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'race-date':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-black text-white mb-2">Do you have a race coming up?</h2>
              <p className="text-gray-400">
                We&apos;ll tailor your program to peak at the right time.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => setHasRace(true)}
                className={`w-full p-4 rounded-lg text-left transition-all ${
                  hasRace === true
                    ? 'bg-[#ffed00]/20 border-2 border-[#ffed00]'
                    : 'bg-[#1f1f1f] border-2 border-[#333] hover:border-[#404040]'
                }`}
              >
                <span className={`font-semibold ${hasRace === true ? 'text-[#ffed00]' : 'text-white'}`}>
                  Yes, I have a HYROX race
                </span>
              </button>
              <button
                onClick={() => {
                  setHasRace(false);
                  setRaceDate('');
                }}
                className={`w-full p-4 rounded-lg text-left transition-all ${
                  hasRace === false
                    ? 'bg-[#ffed00]/20 border-2 border-[#ffed00]'
                    : 'bg-[#1f1f1f] border-2 border-[#333] hover:border-[#404040]'
                }`}
              >
                <span className={`font-semibold ${hasRace === false ? 'text-[#ffed00]' : 'text-white'}`}>
                  No specific race date
                </span>
                <p className="text-sm text-gray-500 mt-1">
                  General fitness program
                </p>
              </button>
            </div>

            {hasRace && (
              <div className="mt-6">
                <label className="block text-gray-400 text-sm mb-2">Race Date</label>
                <input
                  type="date"
                  value={raceDate}
                  onChange={(e) => setRaceDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full p-4 bg-[#1f1f1f] border-2 border-[#333] rounded-lg text-white focus:border-[#ffed00] focus:outline-none"
                />
                {raceDate && (
                  <>
                    <p className="text-sm text-gray-500 mt-2">
                      {getWeeksUntilRace()} weeks until race day
                    </p>
                    {getWeeksUntilRace() !== null && getWeeksUntilRace()! < 4 && (
                      <div className="mt-3 p-3 bg-orange-500/20 border border-orange-500/50 rounded-lg">
                        <p className="text-orange-400 text-sm font-medium">
                          Warning: Less than 4 weeks to race!
                        </p>
                        <p className="text-gray-400 text-sm mt-1">
                          This is a short timeframe for a full program. We&apos;ll focus on race-specific preparation and tapering.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        );

      case 'fitness-level':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-black text-white mb-2">What&apos;s your fitness level?</h2>
              <p className="text-gray-400">
                This helps us set the right intensity for your workouts.
              </p>
            </div>

            <div className="space-y-3">
              {[
                {
                  level: 'beginner' as const,
                  title: 'Beginner',
                  description: 'New to HYROX or hybrid training. Building a fitness foundation.',
                },
                {
                  level: 'intermediate' as const,
                  title: 'Intermediate',
                  description: 'Regular training background. Some race or competition experience.',
                },
                {
                  level: 'advanced' as const,
                  title: 'Advanced',
                  description: 'Competitive athlete. Consistent high-volume training history.',
                },
              ].map(({ level, title, description }) => (
                <button
                  key={level}
                  onClick={() => setFitnessLevel(level)}
                  className={`w-full p-4 rounded-lg text-left transition-all ${
                    fitnessLevel === level
                      ? 'bg-[#ffed00]/20 border-2 border-[#ffed00]'
                      : 'bg-[#1f1f1f] border-2 border-[#333] hover:border-[#404040]'
                  }`}
                >
                  <span className={`font-semibold ${fitnessLevel === level ? 'text-[#ffed00]' : 'text-white'}`}>
                    {title}
                  </span>
                  <p className="text-sm text-gray-500 mt-1">{description}</p>
                </button>
              ))}
            </div>
          </div>
        );

      case 'days-per-week':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-black text-white mb-2">How many days can you train?</h2>
              <p className="text-gray-400">
                We&apos;ll build a schedule that fits your availability.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {([3, 4, 5, 6] as const).map((days) => (
                <button
                  key={days}
                  onClick={() => setDaysPerWeek(days)}
                  className={`p-6 rounded-lg text-center transition-all ${
                    daysPerWeek === days
                      ? 'bg-[#ffed00]/20 border-2 border-[#ffed00]'
                      : 'bg-[#1f1f1f] border-2 border-[#333] hover:border-[#404040]'
                  }`}
                >
                  <span className={`text-3xl font-black ${daysPerWeek === days ? 'text-[#ffed00]' : 'text-white'}`}>
                    {days}
                  </span>
                  <p className="text-sm text-gray-500 mt-1">days/week</p>
                </button>
              ))}
            </div>

            <div className="bg-[#1f1f1f]/50 border border-[#404040] rounded-lg p-4">
              <p className="text-gray-400 text-sm">
                {daysPerWeek === 3 && 'Minimum commitment - focused on key workouts'}
                {daysPerWeek === 4 && 'Balanced approach - strength and conditioning'}
                {daysPerWeek === 5 && 'Serious training - comprehensive preparation'}
                {daysPerWeek === 6 && 'Full program - maximum race readiness'}
              </p>
            </div>
          </div>
        );

      case 'confirm':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-black text-white mb-2">Your Program</h2>
              <p className="text-gray-400">
                Here&apos;s what we&apos;ll create for you.
              </p>
            </div>

            <div className="bg-[#1f1f1f] rounded-lg p-6 space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-[#333]">
                <span className="text-gray-400">Program Type</span>
                <span className="text-[#ffed00] font-bold uppercase">{getProgramType()}</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-[#333]">
                <span className="text-gray-400">Training Days</span>
                <span className="text-white font-semibold">{daysPerWeek} days/week</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-[#333]">
                <span className="text-gray-400">Fitness Level</span>
                <span className="text-white font-semibold capitalize">{fitnessLevel}</span>
              </div>
              {hasRace && raceDate && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Race Date</span>
                  <span className="text-white font-semibold">
                    {new Date(raceDate).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              )}
            </div>

            <div className="bg-[#ffed00]/10 border border-[#ffed00]/30 rounded-lg p-4">
              <p className="text-[#ffed00] text-sm font-medium">
                Your program includes running workouts, strength training, and HYROX-specific station practice.
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 overflow-y-auto">
      <div className="min-h-screen px-4 py-8">
        <div className="max-w-lg mx-auto">
          {/* Progress bar */}
          <div className="mb-8">
            <div className="h-1 bg-[#262626] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#ffed00] transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-gray-500 text-sm mt-2">
              Step {currentStepIndex + 1} of {steps.length}
            </p>
          </div>

          {/* Step content */}
          <div className="mb-8">
            {renderStep()}
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            <button
              onClick={handleBack}
              className="flex-1 py-4 bg-[#262626] hover:bg-[#333] rounded-lg font-medium text-gray-300 transition-colors"
            >
              {currentStepIndex === 0 ? 'Cancel' : 'Back'}
            </button>
            {currentStep === 'confirm' ? (
              <button
                onClick={handleComplete}
                disabled={!canProceed()}
                className="flex-1 py-4 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-black text-white uppercase tracking-wide transition-colors"
              >
                Start Program
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={!canProceed()}
                className="flex-1 py-4 bg-[#ffed00] hover:bg-[#e6d600] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-black text-black uppercase tracking-wide transition-colors"
              >
                Continue
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
