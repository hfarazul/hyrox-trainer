'use client';

import { useState } from 'react';

export interface MissedWorkoutData {
  week: number;
  dayOfWeek: number;
  dayName: string;
  workoutType: string;
  workoutParams: Record<string, unknown>;
  estimatedMinutes: number;
  daysSinceMissed: number;
  importance: 'critical' | 'high' | 'medium' | 'low';
  suggestedAction: 'skip' | 'makeup_condensed' | 'makeup_full';
  impactOnReadiness: number;
}

interface MissedWorkoutHandlerProps {
  missedWorkouts: MissedWorkoutData[];
  totalImpact: number;
  onSkip: (week: number, dayOfWeek: number) => void;
  onDoCondensed: (workout: MissedWorkoutData) => void;
  onDoFull: (workout: MissedWorkoutData) => void;
  onDismiss: () => void;
}

export default function MissedWorkoutHandler({
  missedWorkouts,
  totalImpact,
  onSkip,
  onDoCondensed,
  onDoFull,
  onDismiss,
}: MissedWorkoutHandlerProps) {
  const [processingWorkout, setProcessingWorkout] = useState<string | null>(null);

  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case 'critical':
        return 'text-red-400 bg-red-500/10 border-red-500/30';
      case 'high':
        return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
      case 'medium':
        return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
      case 'low':
        return 'text-gray-400 bg-gray-500/10 border-gray-500/30';
      default:
        return 'text-gray-400 bg-gray-500/10 border-gray-500/30';
    }
  };

  const getImportanceLabel = (importance: string) => {
    switch (importance) {
      case 'critical':
        return 'Critical';
      case 'high':
        return 'High';
      case 'medium':
        return 'Medium';
      case 'low':
        return 'Low';
      default:
        return importance;
    }
  };

  const getWorkoutTypeLabel = (type: string, params: Record<string, unknown>) => {
    switch (type) {
      case 'full':
        return 'Full Simulation';
      case 'coverage':
        return `Race Coverage (${params.coverage || 50}%)`;
      case 'station':
        return 'Station Practice';
      case 'strength':
        return `Strength (${params.strengthFocus || 'full'})`;
      case 'run':
        return `Run (${params.runType || 'zone2'})`;
      case 'quick':
        return 'Quick Workout';
      default:
        return type;
    }
  };

  const handleSkip = async (workout: MissedWorkoutData) => {
    const key = `${workout.week}-${workout.dayOfWeek}`;
    setProcessingWorkout(key);
    try {
      await onSkip(workout.week, workout.dayOfWeek);
    } finally {
      setProcessingWorkout(null);
    }
  };

  const handleDoCondensed = (workout: MissedWorkoutData) => {
    onDoCondensed(workout);
  };

  const handleDoFull = (workout: MissedWorkoutData) => {
    onDoFull(workout);
  };

  const handleSkipAll = async () => {
    for (const workout of missedWorkouts) {
      await onSkip(workout.week, workout.dayOfWeek);
    }
  };

  if (missedWorkouts.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a1a] rounded-xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-[#333]">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                You have {missedWorkouts.length} missed workout{missedWorkouts.length > 1 ? 's' : ''}
              </h2>
              <p className="text-sm text-gray-400">
                Missing these may affect race readiness
              </p>
            </div>
          </div>
          <div className="mt-3 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-sm text-red-400">
              Current impact: <span className="font-bold">{totalImpact}</span> points on race readiness
            </p>
          </div>
        </div>

        {/* Missed Workouts List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {missedWorkouts.map((workout) => {
            const key = `${workout.week}-${workout.dayOfWeek}`;
            const isProcessing = processingWorkout === key;

            return (
              <div
                key={key}
                className="bg-[#262626] rounded-lg p-4 border border-[#333]"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-semibold">
                        {workout.dayName} Week {workout.week}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded border ${getImportanceColor(workout.importance)}`}>
                        {getImportanceLabel(workout.importance)}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm">
                      {getWorkoutTypeLabel(workout.workoutType, workout.workoutParams)}
                    </p>
                    <p className="text-gray-500 text-xs mt-1">
                      {workout.daysSinceMissed} day{workout.daysSinceMissed !== 1 ? 's' : ''} ago
                      {' '}&bull;{' '}
                      ~{workout.estimatedMinutes} min
                      {' '}&bull;{' '}
                      <span className="text-red-400">{workout.impactOnReadiness} pts</span>
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleSkip(workout)}
                    disabled={isProcessing}
                    className="flex-1 min-w-[80px] px-3 py-2 text-sm rounded-lg bg-[#333] hover:bg-[#404040] text-gray-300 transition-colors disabled:opacity-50"
                  >
                    {isProcessing ? 'Skipping...' : 'Skip'}
                  </button>
                  {workout.suggestedAction !== 'skip' && (
                    <>
                      <button
                        onClick={() => handleDoCondensed(workout)}
                        className="flex-1 min-w-[80px] px-3 py-2 text-sm rounded-lg bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/30 transition-colors"
                      >
                        Condensed
                      </button>
                      {workout.suggestedAction === 'makeup_full' && (
                        <button
                          onClick={() => handleDoFull(workout)}
                          className="flex-1 min-w-[80px] px-3 py-2 text-sm rounded-lg bg-[#ffed00]/20 hover:bg-[#ffed00]/30 text-[#ffed00] border border-[#ffed00]/30 transition-colors"
                        >
                          Do Full
                        </button>
                      )}
                    </>
                  )}
                </div>

                {/* Suggested Action Hint */}
                {workout.suggestedAction !== 'skip' && (
                  <p className="text-xs text-gray-500 mt-2">
                    Suggested: {workout.suggestedAction === 'makeup_full' ? 'Do full workout' : 'Do condensed version'}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-[#333] flex flex-wrap gap-2">
          <button
            onClick={onDismiss}
            className="flex-1 px-4 py-3 rounded-lg bg-[#333] hover:bg-[#404040] text-gray-300 font-semibold transition-colors"
          >
            Dismiss
          </button>
          {missedWorkouts.length > 1 && (
            <button
              onClick={handleSkipAll}
              className="flex-1 px-4 py-3 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 font-semibold transition-colors"
            >
              Skip All
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
