import { ScheduledWorkoutExtended, StrengthExercise, CompletedProgramWorkout } from './types';
import { GeneratedProgram, GeneratedProgramWeek } from './program-generator';
import { MissedWorkout } from './missed-workout-detector';

/**
 * Scale a numeric value by a modifier, optionally clamping to min/max
 */
function scaleValue(
  value: number,
  modifier: number,
  min?: number,
  max?: number
): number {
  let scaled = Math.round(value * modifier);
  if (min !== undefined) scaled = Math.max(min, scaled);
  if (max !== undefined) scaled = Math.min(max, scaled);
  return scaled;
}

/**
 * Scale a rep string like "8-10" or "8" by a modifier
 * When modifier < 1, we increase reps (lighter weight)
 * When modifier > 1, we decrease reps (heavier weight, fewer reps)
 */
function scaleRepString(reps: string, modifier: number): string {
  // Handle special cases
  if (reps.toLowerCase() === 'max' || reps.toLowerCase() === 'amrap') {
    return reps;
  }

  // Handle "X steps" or "X each side" format
  const stepsMatch = reps.match(/^(\d+)\s*(steps|each side|per side|per leg)$/i);
  if (stepsMatch) {
    // Inverse scaling for step-based exercises (more steps when easier)
    const newValue = scaleValue(parseInt(stepsMatch[1]), 2 - modifier, 10, 40);
    return `${newValue} ${stepsMatch[2]}`;
  }

  // Handle range format "X-Y"
  const rangeMatch = reps.match(/^(\d+)-(\d+)$/);
  if (rangeMatch) {
    const low = parseInt(rangeMatch[1]);
    const high = parseInt(rangeMatch[2]);
    // Inverse scaling: higher modifier = fewer reps (heavier weight)
    const inverseModifier = 2 - modifier;
    const newLow = scaleValue(low, inverseModifier, 4, 20);
    const newHigh = scaleValue(high, inverseModifier, 6, 25);
    return `${newLow}-${newHigh}`;
  }

  // Handle single number
  const singleMatch = reps.match(/^(\d+)$/);
  if (singleMatch) {
    const value = parseInt(singleMatch[1]);
    const inverseModifier = 2 - modifier;
    const newValue = scaleValue(value, inverseModifier, 4, 25);
    return `${newValue}`;
  }

  // Return unchanged if format not recognized
  return reps;
}

/**
 * Apply intensity modifier to a single workout
 * Modifier range: 0.7 (easier) to 1.3 (harder)
 */
export function applyIntensityModifier(
  workout: ScheduledWorkoutExtended,
  modifier: number
): ScheduledWorkoutExtended {
  // Rest days don't get modified
  if (workout.type === 'rest') {
    return workout;
  }

  // Clamp modifier to valid range
  const clampedModifier = Math.max(0.7, Math.min(1.3, modifier));

  const newWorkout: ScheduledWorkoutExtended = {
    ...workout,
    params: { ...workout.params },
  };

  // Scale based on workout type
  switch (workout.type) {
    case 'coverage':
      // Scale coverage percentage and duration
      if (newWorkout.params.coverage !== undefined) {
        newWorkout.params.coverage = scaleValue(
          newWorkout.params.coverage,
          clampedModifier,
          25,
          150
        );
      }
      newWorkout.estimatedMinutes = scaleValue(
        workout.estimatedMinutes,
        clampedModifier,
        20,
        90
      );
      break;

    case 'run':
      // Scale duration for zone2/tempo
      if (newWorkout.params.runType === 'zone2' || newWorkout.params.runType === 'tempo') {
        if (newWorkout.params.duration !== undefined) {
          newWorkout.params.duration = scaleValue(
            newWorkout.params.duration,
            clampedModifier,
            15,
            75
          );
          newWorkout.estimatedMinutes = newWorkout.params.duration;
        }
      }
      // Scale interval parameters
      if (newWorkout.params.runType === 'intervals' && newWorkout.params.intervals) {
        newWorkout.params.intervals = {
          reps: scaleValue(newWorkout.params.intervals.reps, clampedModifier, 3, 12),
          distance: scaleValue(newWorkout.params.intervals.distance, clampedModifier, 200, 800),
          // Rest is inversely scaled: shorter rest when harder
          rest: scaleValue(newWorkout.params.intervals.rest, 2 - clampedModifier, 60, 180),
        };
      }
      break;

    case 'station':
      // Scale sets and duration
      if (newWorkout.params.sets !== undefined) {
        newWorkout.params.sets = scaleValue(
          newWorkout.params.sets,
          clampedModifier,
          1,
          3
        );
      }
      newWorkout.estimatedMinutes = scaleValue(
        workout.estimatedMinutes,
        clampedModifier,
        15,
        60
      );
      break;

    case 'strength':
      // Scale exercises
      if (newWorkout.params.exercises) {
        newWorkout.params.exercises = newWorkout.params.exercises.map((exercise: StrengthExercise) => ({
          ...exercise,
          sets: scaleValue(exercise.sets, clampedModifier, 2, 5),
          reps: scaleRepString(exercise.reps, clampedModifier),
        }));
      }
      newWorkout.estimatedMinutes = scaleValue(
        workout.estimatedMinutes,
        clampedModifier,
        30,
        75
      );
      break;

    case 'full':
      // Full simulations: scale duration only slightly
      newWorkout.estimatedMinutes = scaleValue(
        workout.estimatedMinutes,
        clampedModifier,
        60,
        120
      );
      break;

    case 'quick':
      // Quick workouts: scale duration
      if (newWorkout.params.duration !== undefined) {
        newWorkout.params.duration = scaleValue(
          newWorkout.params.duration,
          clampedModifier,
          15,
          45
        );
        newWorkout.estimatedMinutes = newWorkout.params.duration;
      }
      break;
  }

  return newWorkout;
}

/**
 * Generate a condensed makeup workout from a missed workout
 * 1-3 days late: 75% of original
 * 4-7 days late: 50% of original
 * 7+ days late: Should be skipped (returns minimal workout)
 */
export function generateMakeupWorkout(
  missed: MissedWorkout,
  daysLate: number
): ScheduledWorkoutExtended {
  let condenseFactor: number;

  if (daysLate <= 3) {
    condenseFactor = 0.75;
  } else if (daysLate <= 7) {
    condenseFactor = 0.5;
  } else {
    condenseFactor = 0.35; // Minimal version for very late
  }

  // Apply the condense factor as an intensity modifier
  const condensedWorkout = applyIntensityModifier(missed.workout, condenseFactor);

  // Mark as a makeup workout in params
  return {
    ...condensedWorkout,
    params: {
      ...condensedWorkout.params,
      isMakeup: true,
      originalWeek: missed.week,
      originalDayOfWeek: missed.dayOfWeek,
      condenseFactor,
    },
  };
}

/**
 * Apply intensity modifier to an entire program schedule
 */
export function applyIntensityToSchedule(
  schedule: GeneratedProgramWeek[],
  modifier: number
): GeneratedProgramWeek[] {
  return schedule.map(week => ({
    ...week,
    workouts: week.workouts.map(workout => applyIntensityModifier(workout, modifier)),
  }));
}

/**
 * Recalculate the entire program with adaptations based on completed workouts
 */
export function recalculateSchedule(
  programData: GeneratedProgram,
  completedWorkouts: CompletedProgramWorkout[],
  intensityModifier: number
): GeneratedProgram {
  // Apply intensity modifier to all workouts
  const adaptedSchedule = applyIntensityToSchedule(
    programData.schedule,
    intensityModifier
  );

  return {
    ...programData,
    schedule: adaptedSchedule,
  };
}

/**
 * Check if a workout has been adapted (modified from original)
 */
export function isWorkoutAdapted(
  workout: ScheduledWorkoutExtended,
  intensityModifier: number
): boolean {
  // If modifier is not 1.0, workout is adapted
  return Math.abs(intensityModifier - 1.0) > 0.01;
}

/**
 * Get a human-readable description of the adaptation
 */
export function getAdaptationDescription(intensityModifier: number): string {
  if (intensityModifier < 0.85) {
    return 'Reduced intensity (recovery focus)';
  } else if (intensityModifier < 0.95) {
    return 'Slightly reduced intensity';
  } else if (intensityModifier > 1.15) {
    return 'Increased intensity (challenge mode)';
  } else if (intensityModifier > 1.05) {
    return 'Slightly increased intensity';
  }
  return 'Standard intensity';
}
