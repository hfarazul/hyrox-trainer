'use client';

import { useState, useMemo } from 'react';
import { UserProgram, ScheduledWorkout, ScheduledWorkoutExtended } from '@/lib/types';
import { getProgramById, getWorkoutTypeIcon, getWorkoutTypeLabel, WorkoutTypeIconName } from '@/lib/training-programs';
import { getExtendedWorkoutTypeIcon, getExtendedWorkoutTypeLabel, ExtendedWorkoutTypeIconName } from '@/lib/program-templates';
import { GeneratedProgram } from '@/lib/program-generator';

// SVG icon component for workout types
type AllIconNames = WorkoutTypeIconName | ExtendedWorkoutTypeIconName;

function WorkoutTypeIconSVG({ icon, className = "w-5 h-5" }: { icon: AllIconNames; className?: string }) {
  switch (icon) {
    case 'bolt':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      );
    case 'weights':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h4v12H4V8zm6-4h4v16h-4V4zm6 8h4v8h-4v-8z" />
        </svg>
      );
    case 'target':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="6" />
          <circle cx="12" cy="12" r="2" />
        </svg>
      );
    case 'flag':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2z" />
        </svg>
      );
    case 'moon':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      );
    case 'runner':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      );
    case 'dumbbell':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.5 6.5h11M5 9h14M5 15h14M6.5 17.5h11M3 12h18" />
        </svg>
      );
    case 'muscle':
    default:
      return (
        <svg className={className} fill="currentColor" viewBox="0 0 24 24">
          <path d="M7 11.5a4.5 4.5 0 01-3-1.13A4.5 4.5 0 012 7a4.5 4.5 0 018.85-1h2.3A4.5 4.5 0 0122 7a4.5 4.5 0 01-2 3.73A4.5 4.5 0 0117 11.5h-2v2h-6v-2H7z"/>
        </svg>
      );
  }
}

// Checkmark icon for completed workouts
function CheckmarkIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

interface Props {
  userProgram: UserProgram;
  onStartWorkout: (week: number, workout: ScheduledWorkout | ScheduledWorkoutExtended) => void;
  onQuitProgram: () => void;
  programData?: GeneratedProgram | null;
}

export default function WeeklyCalendar({ userProgram, onStartWorkout, onQuitProgram, programData }: Props) {
  // Use personalized program data if available, otherwise fall back to template
  const templateProgram = getProgramById(userProgram.programId);
  const isPersonalized = !!programData;

  // Create a unified program interface
  const program = programData ? {
    id: programData.id,
    name: programData.name,
    description: programData.description,
    weeks: programData.weeks,
    difficulty: programData.personalization.fitnessLevel,
    workoutsPerWeek: programData.daysPerWeek,
    schedule: programData.schedule.map(week => ({
      week: week.week,
      theme: week.theme,
      phase: week.phase,
      workouts: week.workouts,
    })),
  } : templateProgram;

  // Calculate current week based on start date
  const getCurrentWeek = (): number => {
    const startDate = new Date(userProgram.startDate);
    const now = new Date();
    const diffTime = now.getTime() - startDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const week = Math.floor(diffDays / 7) + 1;
    return Math.max(1, Math.min(week, program?.weeks || 1));
  };

  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeek);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);

  if (!program) {
    return (
      <div className="bg-[#141414] rounded-xl p-6 text-center">
        <p className="text-red-400">Program not found</p>
      </div>
    );
  }

  const weekData = program.schedule.find(w => w.week === selectedWeek);
  const currentWeek = getCurrentWeek();

  // Check if a workout is completed
  const isWorkoutCompleted = (week: number, dayOfWeek: number): boolean => {
    return userProgram.completedWorkouts.some(
      cw => cw.week === week && cw.dayOfWeek === dayOfWeek
    );
  };

  // Get today's day of week (0 = Sunday)
  const today = new Date().getDay();

  // Calculate progress
  const totalWorkouts = program.schedule.reduce((sum, week) =>
    sum + week.workouts.filter(w => w.type !== 'rest').length, 0
  );
  const completedCount = userProgram.completedWorkouts.length;
  const progressPercent = Math.round((completedCount / totalWorkouts) * 100);

  // Get all days of the week with their workouts
  const weekDays = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days.map((name, index) => {
      const workout = weekData?.workouts.find(w => w.dayOfWeek === index);
      return {
        name,
        index,
        workout,
        isToday: index === today && selectedWeek === currentWeek,
        isCompleted: workout ? isWorkoutCompleted(selectedWeek, index) : false,
      };
    });
  }, [weekData, selectedWeek, today, currentWeek, userProgram.completedWorkouts]);

  return (
    <div className="bg-[#141414] rounded-xl p-4 sm:p-6">
      {/* Header with progress */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg sm:text-2xl font-bold text-white">{program.name}</h2>
          <p className="text-gray-400 text-sm">
            Week {selectedWeek} of {program.weeks} - {weekData?.theme || 'Training'}
          </p>
        </div>
        <button
          onClick={() => setShowQuitConfirm(true)}
          className="text-sm text-gray-400 hover:text-red-400 transition-colors"
        >
          Quit Program
        </button>
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-gray-400">Overall Progress</span>
          <span className="text-[#ffed00] font-medium">{completedCount}/{totalWorkouts} workouts</span>
        </div>
        <div className="h-2 bg-[#1f1f1f] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#ffed00] transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Week navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setSelectedWeek(Math.max(1, selectedWeek - 1))}
          disabled={selectedWeek === 1}
          className="p-2 rounded-lg bg-[#1f1f1f] text-gray-400 hover:text-white hover:bg-[#262626] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <span className="text-white font-medium">Week {selectedWeek}</span>
          {selectedWeek === currentWeek && (
            <span className="px-2 py-0.5 bg-[#ffed00]/20 text-[#ffed00] text-xs rounded-full">
              Current
            </span>
          )}
        </div>
        <button
          onClick={() => setSelectedWeek(Math.min(program.weeks, selectedWeek + 1))}
          disabled={selectedWeek === program.weeks}
          className="p-2 rounded-lg bg-[#1f1f1f] text-gray-400 hover:text-white hover:bg-[#262626] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Weekly calendar grid */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-6">
        {weekDays.map((day) => (
          <div
            key={day.index}
            className={`relative p-2 sm:p-3 rounded-lg text-center transition-all ${
              day.isToday
                ? 'bg-[#ffed00]/20 border-2 border-[#ffed00]'
                : day.workout
                ? 'bg-[#1f1f1f]'
                : 'bg-[#1f1f1f]/50'
            }`}
          >
            {/* Day name */}
            <div className={`text-xs font-medium mb-1 ${day.isToday ? 'text-[#ffed00]' : 'text-gray-500'}`}>
              {day.name}
            </div>

            {/* Workout indicator */}
            {day.workout ? (
              <>
                <div className="flex justify-center mb-1">
                  {day.isCompleted ? (
                    <CheckmarkIcon className="w-6 h-6 sm:w-7 sm:h-7 text-[#ffed00]" />
                  ) : (
                    <WorkoutTypeIconSVG
                      icon={isPersonalized
                        ? getExtendedWorkoutTypeIcon(day.workout.type)
                        : getWorkoutTypeIcon(day.workout.type as ScheduledWorkout['type'])
                      }
                      className="w-6 h-6 sm:w-7 sm:h-7"
                    />
                  )}
                </div>
                <div className={`text-xs ${day.isCompleted ? 'text-[#ffed00]' : 'text-gray-400'}`}>
                  {day.workout.type === 'rest' ? 'Rest' : `${day.workout.estimatedMinutes}m`}
                </div>
              </>
            ) : (
              <div className="text-xl sm:text-2xl text-gray-700 mb-1">-</div>
            )}
          </div>
        ))}
      </div>

      {/* Today's/Selected workout details */}
      {weekData && (
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-white">
            {selectedWeek === currentWeek ? "This Week's Workouts" : `Week ${selectedWeek} Workouts`}
          </h3>
          {weekData.workouts.map((workout, idx) => {
            const completed = isWorkoutCompleted(selectedWeek, workout.dayOfWeek);
            const isRestDay = workout.type === 'rest';

            return (
              <div
                key={idx}
                className={`p-4 rounded-lg border ${
                  completed
                    ? 'bg-[#ffed00]/10 border-[#ffed00]/30'
                    : isRestDay
                    ? 'bg-[#1f1f1f]/50 border-[#262626]'
                    : 'bg-[#1f1f1f] border-[#262626]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {completed ? (
                      <CheckmarkIcon className="w-7 h-7 text-[#ffed00]" />
                    ) : (
                      <WorkoutTypeIconSVG
                        icon={isPersonalized
                          ? getExtendedWorkoutTypeIcon(workout.type)
                          : getWorkoutTypeIcon(workout.type as ScheduledWorkout['type'])
                        }
                        className="w-7 h-7"
                      />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{workout.dayName}</span>
                        {completed && (
                          <span className="text-xs px-1.5 py-0.5 bg-[#ffed00]/20 text-[#ffed00] rounded">
                            Completed
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-400">
                        {isPersonalized
                          ? getExtendedWorkoutTypeLabel(workout.type)
                          : getWorkoutTypeLabel(workout.type as ScheduledWorkout['type'])
                        }
                        {workout.estimatedMinutes > 0 && ` - ~${workout.estimatedMinutes} min`}
                      </div>
                      {/* Workout params - extended types */}
                      {'runType' in workout.params && workout.params.runType && (
                        <div className="text-xs text-blue-400 mt-1 capitalize">
                          {workout.params.runType === 'zone2' ? 'Zone 2 Easy' : workout.params.runType}
                          {'hrZone' in workout.params && workout.params.hrZone && ` @ ${workout.params.hrZone}`}
                        </div>
                      )}
                      {'strengthFocus' in workout.params && workout.params.strengthFocus && (
                        <div className="text-xs text-orange-400 mt-1 capitalize">
                          {workout.params.strengthFocus} body focus
                        </div>
                      )}
                      {/* Original params */}
                      {workout.params.coverage && (
                        <div className="text-xs text-[#ffed00] mt-1">
                          {workout.params.coverage}% Race Coverage
                        </div>
                      )}
                      {workout.params.focus && (
                        <div className="text-xs text-gray-400 mt-1">
                          Focus: {workout.params.focus}
                        </div>
                      )}
                      {workout.params.stations && workout.params.stations.length > 0 && (
                        <div className="text-xs text-gray-400 mt-1">
                          {workout.params.stations.length} stations
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Start button */}
                  {!isRestDay && !completed && (
                    <button
                      onClick={() => onStartWorkout(selectedWeek, workout)}
                      className="px-4 py-2 bg-[#ffed00] hover:bg-[#e6d600] text-black rounded-lg text-sm font-medium text-white transition-colors"
                    >
                      Start
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quit confirmation modal */}
      {showQuitConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#141414] rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-white mb-2">Quit Program?</h3>
            <p className="text-gray-400 text-sm mb-4">
              Your progress will be lost. You can start a new program anytime.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowQuitConfirm(false)}
                className="flex-1 py-2 bg-[#1f1f1f] hover:bg-[#262626] rounded-lg text-white font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onQuitProgram();
                  setShowQuitConfirm(false);
                }}
                className="flex-1 py-2 bg-red-500 hover:bg-red-600 rounded-lg text-white font-medium transition-colors"
              >
                Quit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
