'use client';

import { GeneratedWorkout, WorkoutBlock } from '@/lib/types';
import { HYROX_STATIONS, DIVISION_INFO } from '@/lib/hyrox-data';
import { formatTime } from '@/lib/storage';

type Division = 'men_open' | 'men_pro' | 'women_open' | 'women_pro';

interface Props {
  workout: GeneratedWorkout;
  onStartSimulation?: () => void;
  division?: Division;
  onChangeExercise?: (blockIndex: number, alternativeName: string) => void;
}

export default function WorkoutDisplay({ workout, onStartSimulation, division = 'men_open', onChangeExercise }: Props) {
  const getStationInfo = (stationId: string) =>
    HYROX_STATIONS.find(s => s.id === stationId);

  const getStationWeight = (stationId: string): string | null => {
    const divisionInfo = DIVISION_INFO[division];
    switch (stationId) {
      case 'sled_push': return divisionInfo.sledPush;
      case 'sled_pull': return divisionInfo.sledPull;
      case 'farmers_carry': return divisionInfo.farmers;
      case 'sandbag_lunges': return divisionInfo.sandbag;
      case 'wall_balls': return divisionInfo.wallBall;
      default: return null;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'hard': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getBlockIcon = (block: WorkoutBlock) => {
    switch (block.type) {
      case 'run': return '🏃';
      case 'station': return '💪';
      case 'rest': return '😮‍💨';
      default: return '•';
    }
  };

  return (
    <div className="bg-gray-900 rounded-xl p-4 sm:p-6 pb-20 sm:pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-4 mb-4">
        <div>
          <h2 className="text-lg sm:text-2xl font-bold text-white">{workout.name}</h2>
          <div className="flex items-center gap-2 sm:gap-3 mt-1 sm:mt-2 flex-wrap">
            <span className="text-gray-400 text-sm sm:text-base">~{workout.duration} min</span>
            <span className={`px-2 py-1 rounded text-xs font-semibold text-white ${getDifficultyColor(workout.difficulty)}`}>
              {workout.difficulty.toUpperCase()}
            </span>
            {workout.name.includes('Race Coverage') && (
              <span className="px-2 py-1 rounded text-xs font-semibold bg-purple-600 text-white">
                ALL 8 STATIONS
              </span>
            )}
            <span className="px-2 py-1 rounded text-xs font-semibold bg-gray-700 text-gray-300">
              {DIVISION_INFO[division].label}
            </span>
          </div>
        </div>
        {/* Desktop button */}
        {onStartSimulation && (
          <button
            onClick={onStartSimulation}
            className="hidden sm:block px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg font-semibold text-white text-base"
          >
            Start Timer
          </button>
        )}
      </div>

      {/* Mobile sticky button */}
      {onStartSimulation && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-gray-950 via-gray-950 to-transparent sm:hidden z-40">
          <button
            onClick={onStartSimulation}
            className="w-full py-4 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 rounded-xl font-bold text-white text-lg shadow-lg"
          >
            Start Timer
          </button>
        </div>
      )}

      {/* Warmup */}
      <div className="mb-4 sm:mb-6">
        <h3 className="text-base sm:text-lg font-semibold text-orange-400 mb-2 sm:mb-3">Warm-up</h3>
        <div className="space-y-2">
          {workout.warmup.map((exercise, idx) => (
            <div key={idx} className="flex items-center gap-2 sm:gap-3 text-gray-300 text-sm sm:text-base">
              <span className="text-gray-500 w-5 sm:w-6 flex-shrink-0">{idx + 1}.</span>
              <span className="flex-1 min-w-0">{exercise.name}</span>
              <span className="text-gray-500 text-xs sm:text-sm flex-shrink-0">
                {exercise.duration ? formatTime(exercise.duration) : ''}
                {exercise.reps ? `${exercise.reps} reps` : ''}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Workout */}
      <div className="mb-4 sm:mb-6">
        <h3 className="text-base sm:text-lg font-semibold text-orange-400 mb-2 sm:mb-3">Main Workout</h3>
        <div className="space-y-2 sm:space-y-3">
          {workout.mainWorkout.map((block, idx) => {
            const station = block.stationId ? getStationInfo(block.stationId) : null;
            return (
              <div
                key={idx}
                className={`p-3 sm:p-4 rounded-lg ${
                  block.type === 'run'
                    ? 'bg-blue-900/30 border border-blue-700'
                    : block.type === 'station'
                    ? 'bg-orange-900/30 border border-orange-700'
                    : 'bg-gray-800 border border-gray-700'
                }`}
              >
                <div className="flex items-start gap-2 sm:gap-3">
                  <span className="text-xl sm:text-2xl flex-shrink-0">{getBlockIcon(block)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                      {block.type === 'run' ? (
                        <span className="font-semibold text-white text-sm sm:text-base">
                          Run {block.distance}m
                        </span>
                      ) : block.type === 'station' ? (
                        block.allAlternatives && block.allAlternatives.length > 1 && onChangeExercise ? (
                          <select
                            value={block.alternativeName || station?.name || ''}
                            onChange={(e) => onChangeExercise(idx, e.target.value)}
                            className="font-semibold text-white text-sm sm:text-base bg-gray-800 border border-gray-600 rounded px-2 py-1 cursor-pointer hover:border-orange-500 focus:border-orange-500 focus:outline-none"
                          >
                            {block.allAlternatives.map(alt => (
                              <option key={alt.name} value={alt.name}>
                                {alt.name} ({alt.intensity})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="font-semibold text-white text-sm sm:text-base">
                            {block.alternativeName || station?.name}
                          </span>
                        )
                      ) : (
                        <span className="font-semibold text-white text-sm sm:text-base">
                          Rest {block.duration ? formatTime(block.duration) : ''}
                        </span>
                      )}
                      {station && block.alternativeName !== station.name && (
                        <span className="text-xs px-1.5 sm:px-2 py-0.5 bg-gray-700 rounded text-gray-400">
                          replaces {station.name}
                        </span>
                      )}
                      {block.stationId && getStationWeight(block.stationId) && (
                        <span className="text-xs px-1.5 sm:px-2 py-0.5 bg-purple-600/50 rounded text-purple-300">
                          {getStationWeight(block.stationId)}
                        </span>
                      )}
                    </div>
                    {block.notes && (
                      <p className="text-gray-400 text-xs sm:text-sm mt-1">{block.notes}</p>
                    )}
                    {station && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {station.muscleGroups.map(muscle => (
                          <span
                            key={muscle}
                            className="text-xs px-1.5 sm:px-2 py-0.5 bg-gray-800 rounded text-gray-500"
                          >
                            {muscle}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cooldown */}
      <div>
        <h3 className="text-base sm:text-lg font-semibold text-orange-400 mb-2 sm:mb-3">Cool-down</h3>
        <div className="space-y-2">
          {workout.cooldown.map((exercise, idx) => (
            <div key={idx} className="flex items-center gap-2 sm:gap-3 text-gray-300 text-sm sm:text-base">
              <span className="text-gray-500 w-5 sm:w-6 flex-shrink-0">{idx + 1}.</span>
              <span className="flex-1 min-w-0">{exercise.name}</span>
              <span className="text-gray-500 text-xs sm:text-sm flex-shrink-0">
                {exercise.duration ? formatTime(exercise.duration) : ''}
                {exercise.reps ? `${exercise.reps} reps` : ''}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
