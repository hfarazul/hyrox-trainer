'use client';

import { TrainingProgram } from '@/lib/types';
import { TRAINING_PROGRAMS } from '@/lib/training-programs';

interface Props {
  onStartProgram: (programId: string) => void;
  currentProgramId?: string;
}

export default function ProgramSelector({ onStartProgram, currentProgramId }: Props) {
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
    <div className="bg-gray-900 rounded-xl p-4 sm:p-6">
      <h2 className="text-lg sm:text-2xl font-bold text-white mb-2">Training Programs</h2>
      <p className="text-gray-400 text-sm mb-6">
        Choose a structured program to guide your HYROX preparation
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {TRAINING_PROGRAMS.map((program: TrainingProgram) => {
          const isCurrent = program.id === currentProgramId;

          return (
            <div
              key={program.id}
              className={`relative p-4 sm:p-6 rounded-xl border-2 transition-all ${
                isCurrent
                  ? 'border-orange-500 bg-orange-500/10'
                  : 'border-gray-700 bg-gray-800 hover:border-gray-600'
              }`}
            >
              {/* Current badge */}
              {isCurrent && (
                <div className="absolute -top-3 left-4 px-3 py-1 bg-orange-500 rounded-full text-xs font-bold text-white">
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
                  {program.difficulty === 'beginner' ? '🌱' : '🎯'}
                </div>
              </div>

              {/* Description */}
              <p className="text-gray-400 text-sm mb-4">
                {program.description}
              </p>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 bg-gray-900/50 rounded-lg text-center">
                  <div className="text-xl font-bold text-orange-400">{program.workoutsPerWeek}</div>
                  <div className="text-xs text-gray-500">workouts/week</div>
                </div>
                <div className="p-3 bg-gray-900/50 rounded-lg text-center">
                  <div className="text-xl font-bold text-orange-400">{program.weeks * program.workoutsPerWeek}</div>
                  <div className="text-xs text-gray-500">total workouts</div>
                </div>
              </div>

              {/* Action button */}
              {isCurrent ? (
                <button
                  disabled
                  className="w-full py-3 bg-gray-700 text-gray-400 rounded-lg font-semibold cursor-not-allowed"
                >
                  Currently Active
                </button>
              ) : (
                <button
                  onClick={() => onStartProgram(program.id)}
                  className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 rounded-lg font-semibold text-white transition-all"
                >
                  Start Program
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Info section */}
      <div className="mt-6 p-4 bg-gray-800/50 rounded-lg">
        <h4 className="text-sm font-semibold text-white mb-2">How Programs Work</h4>
        <ul className="text-sm text-gray-400 space-y-1">
          <li>• Each week has scheduled workouts tailored to your fitness level</li>
          <li>• Workouts adapt to your available equipment</li>
          <li>• Track your progress through the weekly calendar</li>
          <li>• Programs progressively increase in difficulty</li>
        </ul>
      </div>
    </div>
  );
}
