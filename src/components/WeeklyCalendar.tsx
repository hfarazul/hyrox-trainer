'use client';

import { useState, useMemo } from 'react';
import { UserProgram, TrainingProgram, ScheduledWorkout } from '@/lib/types';
import { getProgramById, getWorkoutTypeIcon, getWorkoutTypeLabel } from '@/lib/training-programs';

interface Props {
  userProgram: UserProgram;
  onStartWorkout: (week: number, workout: ScheduledWorkout) => void;
  onQuitProgram: () => void;
}

export default function WeeklyCalendar({ userProgram, onStartWorkout, onQuitProgram }: Props) {
  const program = getProgramById(userProgram.programId);

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
      <div className="bg-gray-900 rounded-xl p-6 text-center">
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
    <div className="bg-gray-900 rounded-xl p-4 sm:p-6">
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
          <span className="text-orange-400 font-medium">{completedCount}/{totalWorkouts} workouts</span>
        </div>
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Week navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setSelectedWeek(Math.max(1, selectedWeek - 1))}
          disabled={selectedWeek === 1}
          className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <span className="text-white font-medium">Week {selectedWeek}</span>
          {selectedWeek === currentWeek && (
            <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
              Current
            </span>
          )}
        </div>
        <button
          onClick={() => setSelectedWeek(Math.min(program.weeks, selectedWeek + 1))}
          disabled={selectedWeek === program.weeks}
          className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                ? 'bg-orange-500/20 border-2 border-orange-500'
                : day.workout
                ? 'bg-gray-800'
                : 'bg-gray-800/50'
            }`}
          >
            {/* Day name */}
            <div className={`text-xs font-medium mb-1 ${day.isToday ? 'text-orange-400' : 'text-gray-500'}`}>
              {day.name}
            </div>

            {/* Workout indicator */}
            {day.workout ? (
              <>
                <div className="text-xl sm:text-2xl mb-1">
                  {day.isCompleted ? '✅' : getWorkoutTypeIcon(day.workout.type)}
                </div>
                <div className={`text-xs ${day.isCompleted ? 'text-green-400' : 'text-gray-400'}`}>
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
                    ? 'bg-green-500/10 border-green-500/30'
                    : isRestDay
                    ? 'bg-gray-800/50 border-gray-700'
                    : 'bg-gray-800 border-gray-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{completed ? '✅' : getWorkoutTypeIcon(workout.type)}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{workout.dayName}</span>
                        {completed && (
                          <span className="text-xs px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded">
                            Completed
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-400">
                        {getWorkoutTypeLabel(workout.type)}
                        {workout.estimatedMinutes > 0 && ` - ~${workout.estimatedMinutes} min`}
                      </div>
                      {/* Workout params */}
                      {workout.params.coverage && (
                        <div className="text-xs text-orange-400 mt-1">
                          {workout.params.coverage}% Race Coverage
                        </div>
                      )}
                      {workout.params.focus && (
                        <div className="text-xs text-purple-400 mt-1">
                          Focus: {workout.params.focus}
                        </div>
                      )}
                      {workout.params.stations && workout.params.stations.length > 0 && (
                        <div className="text-xs text-blue-400 mt-1">
                          {workout.params.stations.length} stations
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Start button */}
                  {!isRestDay && !completed && (
                    <button
                      onClick={() => onStartWorkout(selectedWeek, workout)}
                      className="px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg text-sm font-medium text-white transition-colors"
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
          <div className="bg-gray-900 rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-white mb-2">Quit Program?</h3>
            <p className="text-gray-400 text-sm mb-4">
              Your progress will be lost. You can start a new program anytime.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowQuitConfirm(false)}
                className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-white font-medium transition-colors"
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
