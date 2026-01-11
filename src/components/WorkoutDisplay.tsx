'use client';

import { GeneratedWorkout, WorkoutBlock } from '@/lib/types';
import { HYROX_STATIONS, DIVISION_INFO } from '@/lib/hyrox-data';
import { formatTime } from '@/lib/storage';

type Division = 'men_open' | 'men_pro' | 'women_open' | 'women_pro';

// Exercise Video Link Component
function ExerciseVideoLink({ videoUrl, exerciseName }: { videoUrl?: string; exerciseName: string }) {
  if (!videoUrl) return null;

  return (
    <a
      href={videoUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 mt-2 text-xs text-[#ffed00] hover:text-[#e6d600] transition-colors"
    >
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
      </svg>
      <span>Watch demo</span>
    </a>
  );
}

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
    const iconClass = "w-6 h-6 sm:w-7 sm:h-7";
    switch (block.type) {
      case 'run': return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      );
      case 'station': return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h4v12H4V8zm6-4h4v16h-4V4zm6 8h4v8h-4v-8z" />
        </svg>
      );
      case 'rest': return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      );
      default: return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    }
  };

  return (
    <div className="bg-[#141414] rounded-xl p-4 sm:p-6 pb-20 sm:pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-4 mb-4">
        <div>
          <h2 className="text-lg sm:text-2xl font-black tracking-wide uppercase text-white">{workout.name}</h2>
          <div className="flex items-center gap-2 sm:gap-3 mt-1 sm:mt-2 flex-wrap">
            <span className="text-gray-400 text-sm sm:text-base">~{workout.duration} min</span>
            <span className={`px-2 py-1 rounded text-xs font-semibold text-white ${getDifficultyColor(workout.difficulty)}`}>
              {workout.difficulty.toUpperCase()}
            </span>
            {workout.name.includes('Race Coverage') && (
              <span className="px-2 py-1 rounded text-xs font-semibold bg-[#ffed00]/20 text-[#ffed00]">
                ALL 8 STATIONS
              </span>
            )}
            <span className="px-2 py-1 rounded text-xs font-semibold bg-[#262626] text-gray-300">
              {DIVISION_INFO[division].label}
            </span>
          </div>
        </div>
        {/* Desktop button */}
        {onStartSimulation && (
          <button
            onClick={onStartSimulation}
            className="hidden sm:block px-4 py-2 bg-[#ffed00] hover:bg-[#e6d600] rounded-lg font-black text-black text-base uppercase tracking-wide"
          >
            Start Timer
          </button>
        )}
      </div>

      {/* Mobile sticky button */}
      {onStartSimulation && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black to-transparent sm:hidden z-40">
          <button
            onClick={onStartSimulation}
            className="w-full py-4 bg-[#ffed00] hover:bg-[#e6d600] rounded-xl font-black text-black text-lg shadow-lg uppercase tracking-wide transition-colors"
          >
            Start Timer
          </button>
        </div>
      )}

      {/* Warmup */}
      <div className="mb-4 sm:mb-6">
        <div className="inline-block bg-[#ffed00] px-3 py-1.5 mb-2 sm:mb-3">
          <h3 className="text-black font-black tracking-wider uppercase text-sm sm:text-base">Warm-up</h3>
        </div>
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
        <div className="inline-block bg-[#ffed00] px-3 py-1.5 mb-2 sm:mb-3">
          <h3 className="text-black font-black tracking-wider uppercase text-sm sm:text-base">Main Workout</h3>
        </div>
        <div className="space-y-2 sm:space-y-3">
          {workout.mainWorkout.map((block, idx) => {
            const station = block.stationId ? getStationInfo(block.stationId) : null;
            return (
              <div
                key={idx}
                className={`p-3 sm:p-4 rounded-lg ${
                  block.type === 'run'
                    ? 'bg-[#1f1f1f]/50 border border-[#404040]'
                    : block.type === 'station'
                    ? 'bg-[#ffed00]/10 border border-[#ffed00]/60'
                    : 'bg-[#1f1f1f] border border-[#262626]'
                }`}
              >
                <div className="flex items-start gap-2 sm:gap-3">
                  <span className="flex-shrink-0 text-gray-400">{getBlockIcon(block)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1 sm:gap-2 overflow-hidden">
                      {block.type === 'run' ? (
                        <span className="font-semibold text-white text-sm sm:text-base">
                          Run {block.distance}m
                        </span>
                      ) : block.type === 'station' ? (
                        block.allAlternatives && block.allAlternatives.length > 1 && onChangeExercise ? (
                          <select
                            value={block.alternativeName || station?.name || ''}
                            onChange={(e) => onChangeExercise(idx, e.target.value)}
                            className="font-semibold text-white text-sm sm:text-base bg-[#1f1f1f] border border-[#404040] rounded px-2 py-1 cursor-pointer hover:border-[#ffed00] focus:border-[#ffed00] focus:outline-none transition-colors max-w-full truncate"
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
                        <span className="text-xs px-1.5 sm:px-2 py-0.5 bg-[#262626] rounded text-gray-400">
                          replaces {station.name}
                        </span>
                      )}
                      {block.stationId && getStationWeight(block.stationId) && (
                        <span className="text-xs px-1.5 sm:px-2 py-0.5 bg-[#ffed00]/20 rounded text-[#ffed00]">
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
                            className="text-xs px-1.5 sm:px-2 py-0.5 bg-[#262626] rounded text-gray-500"
                          >
                            {muscle}
                          </span>
                        ))}
                      </div>
                    )}
                    {/* Exercise Video Link */}
                    <ExerciseVideoLink
                      videoUrl={block.videoUrl}
                      exerciseName={block.alternativeName || station?.name || 'Exercise'}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cooldown */}
      <div>
        <div className="inline-block bg-[#ffed00] px-3 py-1.5 mb-2 sm:mb-3">
          <h3 className="text-black font-black tracking-wider uppercase text-sm sm:text-base">Cool-down</h3>
        </div>
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
