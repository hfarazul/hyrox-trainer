'use client';

import { GeneratedWorkout, WorkoutBlock } from '@/lib/types';
import { HYROX_STATIONS } from '@/lib/hyrox-data';
import { formatTime } from '@/lib/storage';

interface Props {
  workout: GeneratedWorkout;
  onStartSimulation?: () => void;
}

export default function WorkoutDisplay({ workout, onStartSimulation }: Props) {
  const getStationInfo = (stationId: string) =>
    HYROX_STATIONS.find(s => s.id === stationId);

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
    <div className="bg-gray-900 rounded-xl p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-2xl font-bold text-white">{workout.name}</h2>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-gray-400">~{workout.duration} min</span>
            <span className={`px-2 py-1 rounded text-xs font-semibold text-white ${getDifficultyColor(workout.difficulty)}`}>
              {workout.difficulty.toUpperCase()}
            </span>
          </div>
        </div>
        {onStartSimulation && (
          <button
            onClick={onStartSimulation}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg font-semibold text-white"
          >
            Start Timer
          </button>
        )}
      </div>

      {/* Warmup */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-orange-400 mb-3">Warm-up</h3>
        <div className="space-y-2">
          {workout.warmup.map((exercise, idx) => (
            <div key={idx} className="flex items-center gap-3 text-gray-300">
              <span className="text-gray-500 w-6">{idx + 1}.</span>
              <span className="flex-1">{exercise.name}</span>
              <span className="text-gray-500 text-sm">
                {exercise.duration ? formatTime(exercise.duration) : ''}
                {exercise.reps ? `${exercise.reps} reps` : ''}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Workout */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-orange-400 mb-3">Main Workout</h3>
        <div className="space-y-3">
          {workout.mainWorkout.map((block, idx) => {
            const station = block.stationId ? getStationInfo(block.stationId) : null;
            return (
              <div
                key={idx}
                className={`p-4 rounded-lg ${
                  block.type === 'run'
                    ? 'bg-blue-900/30 border border-blue-700'
                    : block.type === 'station'
                    ? 'bg-orange-900/30 border border-orange-700'
                    : 'bg-gray-800 border border-gray-700'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{getBlockIcon(block)}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">
                        {block.type === 'run'
                          ? `Run ${block.distance}m`
                          : block.type === 'station'
                          ? block.alternativeName || station?.name
                          : `Rest ${block.duration ? formatTime(block.duration) : ''}`}
                      </span>
                      {station && block.alternativeName !== station.name && (
                        <span className="text-xs px-2 py-0.5 bg-gray-700 rounded text-gray-400">
                          replaces {station.name}
                        </span>
                      )}
                    </div>
                    {block.notes && (
                      <p className="text-gray-400 text-sm mt-1">{block.notes}</p>
                    )}
                    {station && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {station.muscleGroups.map(muscle => (
                          <span
                            key={muscle}
                            className="text-xs px-2 py-0.5 bg-gray-800 rounded text-gray-500"
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
        <h3 className="text-lg font-semibold text-orange-400 mb-3">Cool-down</h3>
        <div className="space-y-2">
          {workout.cooldown.map((exercise, idx) => (
            <div key={idx} className="flex items-center gap-3 text-gray-300">
              <span className="text-gray-500 w-6">{idx + 1}.</span>
              <span className="flex-1">{exercise.name}</span>
              <span className="text-gray-500 text-sm">
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
