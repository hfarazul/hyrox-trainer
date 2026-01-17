'use client';

import { useState } from 'react';
import { TrainingProgram, ProgramPersonalization } from '@/lib/types';
import { TRAINING_PROGRAMS } from '@/lib/training-programs';
import ProgramOnboarding from './ProgramOnboarding';

interface Props {
  onStartProgram: (programId: string) => void;
  onCreatePersonalized: (personalization: ProgramPersonalization) => Promise<void>;
  currentProgramId?: string;
  isCreating?: boolean;
}

export default function ProgramSelector({
  onStartProgram,
  onCreatePersonalized,
  currentProgramId,
  isCreating = false,
}: Props) {
  const [showOnboarding, setShowOnboarding] = useState(false);

  const handlePersonalizedComplete = async (personalization: ProgramPersonalization) => {
    await onCreatePersonalized(personalization);
    setShowOnboarding(false);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-500';
      case 'intermediate': return 'bg-yellow-500';
      case 'advanced': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'Beginner';
      case 'intermediate': return 'Intermediate';
      case 'advanced': return 'Advanced';
      default: return difficulty;
    }
  };

  return (
    <>
      {showOnboarding && (
        <ProgramOnboarding
          onComplete={handlePersonalizedComplete}
          onCancel={() => setShowOnboarding(false)}
        />
      )}

      <div className="bg-[#141414] rounded-xl p-4 sm:p-6">
        <h2 className="text-lg sm:text-2xl font-bold text-white mb-2">Training Programs</h2>
        <p className="text-gray-400 text-sm mb-6">
          Choose a structured program to guide your HYROX preparation
        </p>

        {/* Personalized Program Card */}
        <div className="mb-6">
          <div className="relative p-4 sm:p-6 rounded-xl border-2 border-[#ffed00] bg-gradient-to-br from-[#ffed00]/10 to-transparent">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-white">Create Personalized Program</h3>
                <p className="text-gray-400 text-sm mt-1">
                  Build a custom training plan based on your goals
                </p>
              </div>
              <div className="text-3xl">
                <svg className="w-8 h-8 text-[#ffed00]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
            </div>

            <ul className="text-sm text-gray-400 space-y-2 mb-4">
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-[#ffed00]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Set your race date for peak performance timing
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-[#ffed00]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Choose your fitness level and training days
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-[#ffed00]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Get periodized running, strength, and station workouts
              </li>
            </ul>

            <button
              onClick={() => setShowOnboarding(true)}
              disabled={isCreating}
              className="w-full py-3 bg-[#ffed00] hover:bg-[#e6d600] disabled:opacity-50 text-black rounded-lg font-black uppercase tracking-wide transition-all"
            >
              {isCreating ? 'Creating...' : 'Get Started'}
            </button>
          </div>
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#333]"></div>
          </div>
          <div className="relative flex justify-center">
            <span className="px-4 bg-[#141414] text-gray-500 text-sm">or choose a template</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {TRAINING_PROGRAMS.map((program: TrainingProgram) => {
          const isCurrent = program.id === currentProgramId;

          return (
            <div
              key={program.id}
              className={`relative p-4 sm:p-6 rounded-xl border-2 transition-all ${
                isCurrent
                  ? 'border-[#ffed00] bg-[#ffed00]/10'
                  : 'border-[#262626] bg-[#1f1f1f] hover:border-gray-600'
              }`}
            >
              {/* Current badge */}
              {isCurrent && (
                <div className="absolute -top-3 left-4 px-3 py-1 bg-[#ffed00] rounded-full text-xs font-bold text-black">
                  CURRENT PROGRAM
                </div>
              )}

              {/* Program header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-white">{program.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold text-white ${getDifficultyColor(program.difficulty)}`}>
                      {getDifficultyLabel(program.difficulty)}
                    </span>
                    <span className="text-gray-400 text-sm">
                      {program.weeks} weeks
                    </span>
                  </div>
                </div>
                <div className="text-3xl">
                  {program.difficulty === 'beginner' ? (
                    <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                    </svg>
                  ) : (
                    <svg className="w-8 h-8 text-[#ffed00]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <circle cx="12" cy="12" r="10" />
                      <circle cx="12" cy="12" r="6" />
                      <circle cx="12" cy="12" r="2" />
                    </svg>
                  )}
                </div>
              </div>

              {/* Description */}
              <p className="text-gray-400 text-sm mb-4">
                {program.description}
              </p>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 bg-[#141414]/50 rounded-lg text-center">
                  <div className="text-xl font-bold text-[#ffed00]">{program.workoutsPerWeek}</div>
                  <div className="text-xs text-gray-500">workouts/week</div>
                </div>
                <div className="p-3 bg-[#141414]/50 rounded-lg text-center">
                  <div className="text-xl font-bold text-[#ffed00]">{program.weeks * program.workoutsPerWeek}</div>
                  <div className="text-xs text-gray-500">total workouts</div>
                </div>
              </div>

              {/* Action button */}
              {isCurrent ? (
                <button
                  disabled
                  className="w-full py-3 bg-[#262626] text-gray-400 rounded-lg font-semibold cursor-not-allowed"
                >
                  Currently Active
                </button>
              ) : (
                <button
                  onClick={() => onStartProgram(program.id)}
                  className="w-full py-3 bg-[#ffed00] hover:bg-[#e6d600] text-black rounded-lg font-semibold text-white transition-all"
                >
                  Start Program
                </button>
              )}
            </div>
          );
        })}
      </div>

        {/* Info section */}
        <div className="mt-6 p-4 bg-[#1f1f1f]/50 rounded-lg">
          <h4 className="text-sm font-semibold text-white mb-2">How Programs Work</h4>
          <ul className="text-sm text-gray-400 space-y-1">
            <li>• Each week has scheduled workouts tailored to your fitness level</li>
            <li>• Workouts adapt to your available equipment</li>
            <li>• Track your progress through the weekly calendar</li>
            <li>• Programs progressively increase in difficulty</li>
          </ul>
        </div>
      </div>
    </>
  );
}
