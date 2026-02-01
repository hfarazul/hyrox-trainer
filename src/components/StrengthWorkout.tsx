'use client';

import { useState, useMemo } from 'react';
import { StrengthExercise, UserEquipment } from '@/lib/types';
import { HYROX_STATIONS } from '@/lib/hyrox-data';
import { getExercisesForEquipment, StrengthExerciseDefinition } from '@/lib/strength-exercises';

interface StrengthWorkoutProps {
  focus: 'lower' | 'upper' | 'full';
  exercises: StrengthExercise[];
  stationWork?: string[];
  equipment?: UserEquipment[];
  onComplete: () => void;
  onBack?: () => void;
}

export default function StrengthWorkout({
  focus,
  exercises,
  stationWork,
  equipment = [],
  onComplete,
  onBack,
}: StrengthWorkoutProps) {
  // Get available equipment IDs
  const availableEquipmentIds = useMemo(() =>
    equipment.filter(e => e.available).map(e => e.equipmentId),
    [equipment]
  );

  // Filter exercises based on available equipment
  const filteredExercises = useMemo(() => {
    if (availableEquipmentIds.length === 0) {
      // No equipment info, show all exercises
      return exercises;
    }

    // Get all exercises that can be done with available equipment
    const possibleExercises = getExercisesForEquipment(availableEquipmentIds, focus);
    const possibleExerciseNames = new Set(possibleExercises.map(e => e.name.toLowerCase()));

    // Filter the workout's exercises to only those possible with equipment
    // Also find replacements for exercises that can't be done
    const result: StrengthExercise[] = [];
    const usedNames = new Set<string>();

    for (const exercise of exercises) {
      if (possibleExerciseNames.has(exercise.name.toLowerCase())) {
        // Exercise can be done with available equipment
        result.push(exercise);
        usedNames.add(exercise.name.toLowerCase());
      } else {
        // Find a replacement exercise from the same category
        const replacement = possibleExercises.find(
          (e: StrengthExerciseDefinition) => !usedNames.has(e.name.toLowerCase())
        );
        if (replacement) {
          result.push({
            name: replacement.name,
            sets: exercise.sets,
            reps: exercise.reps,
            notes: replacement.notes || exercise.notes,
          });
          usedNames.add(replacement.name.toLowerCase());
        }
        // If no replacement found, skip this exercise
      }
    }

    // If we filtered out all exercises, return bodyweight alternatives
    if (result.length === 0) {
      return getExercisesForEquipment([], focus).slice(0, 4).map(e => ({
        name: e.name,
        sets: e.sets,
        reps: e.reps,
        notes: e.notes,
      }));
    }

    return result;
  }, [exercises, availableEquipmentIds, focus]);

  // Filter and transform station work based on available equipment
  // Shows alternative names when user doesn't have official equipment
  const filteredStationWork = useMemo(() => {
    if (!stationWork || stationWork.length === 0) return [];

    type StationWorkItem = {
      stationId: string;
      displayName: string | null;
      volume: string | null;
    };

    if (availableEquipmentIds.length === 0) {
      // No equipment info, show all with original names
      return stationWork.map(id => ({ stationId: id, displayName: null, volume: null }));
    }

    const result: StationWorkItem[] = [];

    for (const stationId of stationWork) {
      const station = HYROX_STATIONS.find(s => s.id === stationId);
      if (!station) {
        // Unknown station, keep it with original name
        result.push({ stationId, displayName: null, volume: null });
        continue;
      }

      // Find the best available alternative
      // First, check if user can do the official version (first alternative)
      const officialAlt = station.alternatives[0];
      const canDoOfficial = officialAlt && (
        officialAlt.equipmentNeeded.length === 0 ||
        officialAlt.equipmentNeeded.every(eq => availableEquipmentIds.includes(eq))
      );

      if (canDoOfficial) {
        // User has official equipment, show station name with official volume
        const volume = officialAlt.baseValue && officialAlt.unit
          ? `${officialAlt.baseValue}${officialAlt.unit}`
          : null;
        result.push({ stationId, displayName: null, volume });
      } else {
        // Find the first alternative they CAN do
        const availableAlt = station.alternatives.find(alt =>
          alt.equipmentNeeded.length === 0 ||
          alt.equipmentNeeded.every(eq => availableEquipmentIds.includes(eq))
        );

        if (availableAlt) {
          // Show the alternative name with volume
          const volume = availableAlt.baseValue && availableAlt.unit
            ? `${availableAlt.baseValue}${availableAlt.unit}`
            : null;
          result.push({ stationId, displayName: availableAlt.name, volume });
        }
        // If no alternative available, don't include this station
      }
    }

    return result;
  }, [stationWork, availableEquipmentIds]);

  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set());
  const [completedStations, setCompletedStations] = useState<Set<string>>(new Set());

  const totalItems = filteredExercises.length + filteredStationWork.length;
  const completedCount = completedExercises.size + completedStations.size;
  const allComplete = completedCount === totalItems;

  const toggleExercise = (exerciseId: string) => {
    const newSet = new Set(completedExercises);
    if (newSet.has(exerciseId)) {
      newSet.delete(exerciseId);
    } else {
      newSet.add(exerciseId);
    }
    setCompletedExercises(newSet);
  };

  const toggleStation = (stationId: string) => {
    const newSet = new Set(completedStations);
    if (newSet.has(stationId)) {
      newSet.delete(stationId);
    } else {
      newSet.add(stationId);
    }
    setCompletedStations(newSet);
  };

  const getStationName = (stationId: string) => {
    const station = HYROX_STATIONS.find(s => s.id === stationId);
    return station?.name || stationId.replace(/_/g, ' ');
  };

  const getFocusLabel = () => {
    switch (focus) {
      case 'lower':
        return 'Lower Body Power';
      case 'upper':
        return 'Upper Body Strength';
      case 'full':
        return 'Full Body Workout';
    }
  };

  const getFocusIcon = () => {
    const iconClass = 'w-8 h-8';
    return (
      <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 8h4v12H4V8zm6-4h4v16h-4V4zm6 8h4v8h-4v-8z"
        />
      </svg>
    );
  };

  return (
    <div className="bg-[#141414] rounded-xl p-4 sm:p-6">
      {/* Back button */}
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
      )}

      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <div className="flex-shrink-0 w-14 h-14 rounded-full bg-[#ffed00]/20 text-[#ffed00] flex items-center justify-center">
          {getFocusIcon()}
        </div>
        <div className="flex-1">
          <h2 className="text-xl sm:text-2xl font-black tracking-wide uppercase text-white">
            {getFocusLabel()}
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Strength + Station Work
          </p>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1 h-2 bg-[#262626] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#ffed00] transition-all duration-300"
                style={{ width: `${(completedCount / totalItems) * 100}%` }}
              />
            </div>
            <span className="text-gray-400 text-sm">
              {completedCount}/{totalItems}
            </span>
          </div>
        </div>
      </div>

      {/* Exercises Section */}
      <div className="mb-6">
        <div className="inline-block bg-[#ffed00] px-3 py-1.5 mb-3">
          <h3 className="text-black font-black tracking-wider uppercase text-sm">Strength Exercises</h3>
        </div>
        <div className="space-y-2">
          {filteredExercises.map((exercise, idx) => {
            const exerciseId = `${exercise.name}-${idx}`;
            const isComplete = completedExercises.has(exerciseId);
            return (
              <button
                key={exerciseId}
                onClick={() => toggleExercise(exerciseId)}
                className={`w-full p-4 rounded-lg text-left transition-all ${
                  isComplete
                    ? 'bg-green-900/30 border border-green-600/50'
                    : 'bg-[#1f1f1f] border border-[#333] hover:border-[#404040]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                      isComplete
                        ? 'bg-green-600 border-green-600'
                        : 'border-[#404040]'
                    }`}
                  >
                    {isComplete && (
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`font-semibold ${isComplete ? 'text-gray-400 line-through' : 'text-white'}`}
                      >
                        {exercise.name}
                      </span>
                      <span className="text-[#ffed00] font-mono text-sm">
                        {exercise.sets}x{exercise.reps}
                      </span>
                    </div>
                    {exercise.notes && (
                      <p className="text-gray-500 text-sm mt-1">{exercise.notes}</p>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Station Work Section */}
      {filteredStationWork.length > 0 && (
        <div className="mb-6">
          <div className="inline-block bg-[#ffed00] px-3 py-1.5 mb-3">
            <h3 className="text-black font-black tracking-wider uppercase text-sm">Station Work</h3>
          </div>
          <p className="text-gray-500 text-sm mb-3">
            Practice HYROX-specific movements to build race-day strength
          </p>
          <div className="space-y-2">
            {filteredStationWork.map(({ stationId, displayName, volume }) => {
              const isComplete = completedStations.has(stationId);
              const name = displayName || getStationName(stationId);
              const originalStationName = getStationName(stationId);
              const isAlternative = displayName !== null;
              return (
                <button
                  key={stationId}
                  onClick={() => toggleStation(stationId)}
                  className={`w-full p-4 rounded-lg text-left transition-all ${
                    isComplete
                      ? 'bg-green-900/30 border border-green-600/50'
                      : 'bg-[#ffed00]/10 border border-[#ffed00]/30 hover:border-[#ffed00]/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                        isComplete
                          ? 'bg-green-600 border-green-600'
                          : 'border-[#ffed00]/50'
                      }`}
                    >
                      {isComplete && (
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 flex flex-col">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-semibold ${isComplete ? 'text-gray-400 line-through' : 'text-white'}`}
                        >
                          {name}
                        </span>
                        {volume && (
                          <span className="text-[#ffed00] font-mono text-sm">
                            {volume}
                          </span>
                        )}
                      </div>
                      {isAlternative && (
                        <span className="text-xs text-gray-500">
                          for {originalStationName}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Complete Button */}
      <button
        onClick={onComplete}
        disabled={!allComplete}
        className={`w-full py-4 rounded-xl font-black text-lg uppercase tracking-wide transition-colors ${
          allComplete
            ? 'bg-green-600 hover:bg-green-700 text-white'
            : 'bg-[#262626] text-gray-500 cursor-not-allowed'
        }`}
      >
        {allComplete ? 'Complete Workout' : `Complete all exercises (${totalItems - completedCount} left)`}
      </button>
    </div>
  );
}
