/**
 * Program Generator
 *
 * Generates personalized training programs based on user inputs:
 * - Race date (determines 8 vs 12 week program)
 * - Fitness level (adjusts intensity)
 * - Days per week (adapts weekly schedule)
 * - Weak stations (adds focused practice)
 */

import {
  ProgramPersonalization,
  ScheduledWorkoutExtended,
  TrainingProgram,
  ProgramWeek,
} from './types';
import {
  PROGRAM_TEMPLATES,
  ProgramWeekTemplate,
  ProgramTemplate,
  getTemplateForWeeks,
  DEFAULT_WEAK_STATIONS,
} from './program-templates';

// Generated program output
export interface GeneratedProgram {
  id: string;
  name: string;
  description: string;
  weeks: number;
  daysPerWeek: number;
  schedule: GeneratedProgramWeek[];
  personalization: ProgramPersonalization;
  createdAt: string;
}

export interface GeneratedProgramWeek {
  week: number;
  phase: string;
  theme: string;
  isDeload?: boolean;
  workouts: ScheduledWorkoutExtended[];
}

/**
 * Calculate weeks between now and race date
 */
export function calculateWeeksUntilRace(raceDate: string | undefined): number | null {
  if (!raceDate) return null;

  const race = new Date(raceDate);
  const now = new Date();

  // Set both to start of day for accurate comparison
  race.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);

  const diffMs = race.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.ceil(diffDays / 7);

  return Math.max(0, diffWeeks);
}

/**
 * Select the appropriate program template based on weeks until race and fitness level
 */
export function selectProgramTemplate(
  weeksUntilRace: number | null,
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced'
): ProgramTemplate {
  // If no race date, use 12-week for beginners, 8-week for others
  if (weeksUntilRace === null) {
    return fitnessLevel === 'beginner'
      ? PROGRAM_TEMPLATES.find(t => t.weeks === 12)!
      : PROGRAM_TEMPLATES.find(t => t.weeks === 8)!;
  }

  // Use the template that fits the time available
  return getTemplateForWeeks(weeksUntilRace);
}

/**
 * Priority order for days when reducing from 6 days
 * Higher priority days are kept when reducing
 */
const DAY_PRIORITY: Record<number, number> = {
  6: 1,  // Saturday (simulation day) - highest priority
  1: 2,  // Monday (strength day)
  4: 3,  // Thursday (tempo/intervals)
  2: 4,  // Tuesday (station practice)
  5: 5,  // Friday (extra work)
  3: 6,  // Wednesday (rest) - lowest priority
  0: 7,  // Sunday
};

/**
 * Adjust a week's workouts based on available training days
 */
export function adjustWeekForDaysPerWeek(
  week: ProgramWeekTemplate,
  daysPerWeek: number
): GeneratedProgramWeek {
  const workouts = [...week.workouts];

  // Sort by priority (lower number = higher priority)
  const sortedByPriority = workouts.sort(
    (a, b) => (DAY_PRIORITY[a.dayOfWeek] || 99) - (DAY_PRIORITY[b.dayOfWeek] || 99)
  );

  // Keep only the top N workouts based on daysPerWeek
  // But always keep at least one rest day if possible
  let selectedWorkouts = sortedByPriority.slice(0, daysPerWeek);

  // If we have room and no rest day, try to add one (only for 5+ days)
  // For 4 days, we prioritize training over rest
  const hasRest = selectedWorkouts.some(w => w.type === 'rest');
  if (!hasRest && daysPerWeek >= 5) {
    const restDay = workouts.find(w => w.type === 'rest');
    if (restDay && selectedWorkouts.length >= daysPerWeek) {
      // Replace lowest priority workout with rest
      selectedWorkouts[selectedWorkouts.length - 1] = restDay;
    }
  }

  // Sort back by day of week for display
  selectedWorkouts = selectedWorkouts.sort((a, b) => a.dayOfWeek - b.dayOfWeek);

  return {
    week: week.week,
    phase: week.phase,
    theme: week.theme,
    isDeload: week.isDeload,
    workouts: selectedWorkouts,
  };
}

/**
 * Add extra weak station practice to appropriate workouts
 */
export function addWeakStationFocus(
  schedule: GeneratedProgramWeek[],
  weakStations: string[]
): GeneratedProgramWeek[] {
  if (weakStations.length === 0) return schedule;

  // Track rotation counter across non-deload weeks
  let rotationCounter = 0;

  return schedule.map(week => {
    // Don't modify deload weeks
    if (week.isDeload) return week;

    let weekModified = false;
    const modifiedWorkouts = week.workouts.map(workout => {
      // Add weak stations to station practice workouts
      if (workout.type === 'station' && workout.params.stations) {
        const currentStations = workout.params.stations;

        // Add one weak station if not already present
        const missingWeakStations = weakStations.filter(
          ws => !currentStations.includes(ws)
        );

        if (missingWeakStations.length > 0) {
          // Rotate through weak stations based on rotation counter
          const stationToAdd = missingWeakStations[rotationCounter % missingWeakStations.length];
          weekModified = true;

          return {
            ...workout,
            params: {
              ...workout.params,
              stations: [...currentStations, stationToAdd],
            },
            estimatedMinutes: workout.estimatedMinutes + 5, // Add time for extra station
          };
        }
      }

      // Add weak station work to strength hybrid workouts
      if (workout.type === 'strength' && workout.params.stationWork) {
        const currentStationWork = workout.params.stationWork;
        const missingWeakStations = weakStations.filter(
          ws => !currentStationWork.includes(ws)
        );

        if (missingWeakStations.length > 0) {
          const stationToAdd = missingWeakStations[rotationCounter % missingWeakStations.length];
          weekModified = true;

          return {
            ...workout,
            params: {
              ...workout.params,
              stationWork: [...currentStationWork, stationToAdd],
            },
          };
        }
      }

      return workout;
    });

    // Increment rotation counter after processing each non-deload week
    if (weekModified) {
      rotationCounter++;
    }

    return {
      ...week,
      workouts: modifiedWorkouts,
    };
  });
}

/**
 * Parse and scale a rep string based on fitness level
 * Handles: "8-10", "8", "max", "20 steps", "8 each side"
 * Beginners get +2 reps (lighter weight, more reps)
 * Advanced get -2 reps (heavier weight, fewer reps)
 */
export function scaleRepString(
  reps: string,
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced'
): string {
  if (fitnessLevel === 'intermediate') return reps;

  const offset = fitnessLevel === 'beginner' ? 2 : -2;

  // "max" - unchanged
  if (reps.toLowerCase() === 'max') return reps;

  // "X steps" or "X each side" patterns
  const stepMatch = reps.match(/^(\d+)\s+(.+)$/);
  if (stepMatch) {
    const num = Math.max(4, parseInt(stepMatch[1], 10) + offset);
    return `${num} ${stepMatch[2]}`;
  }

  // Range "X-Y"
  const rangeMatch = reps.match(/^(\d+)-(\d+)$/);
  if (rangeMatch) {
    const low = Math.max(4, parseInt(rangeMatch[1], 10) + offset);
    const high = Math.max(low + 2, parseInt(rangeMatch[2], 10) + offset);
    return `${low}-${high}`;
  }

  // Single number "X"
  const singleMatch = reps.match(/^(\d+)$/);
  if (singleMatch) {
    return String(Math.max(4, parseInt(singleMatch[1], 10) + offset));
  }

  // Unknown format, return unchanged
  return reps;
}

/**
 * Scale a numeric value by fitness level with optional min/max bounds
 */
export function scaleValue(
  value: number,
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced',
  beginnerMult: number,
  advancedMult: number,
  min?: number,
  max?: number
): number {
  if (fitnessLevel === 'intermediate') return value;

  const mult = fitnessLevel === 'beginner' ? beginnerMult : advancedMult;
  let scaled = Math.round(value * mult);

  if (min !== undefined) scaled = Math.max(min, scaled);
  if (max !== undefined) scaled = Math.min(max, scaled);

  return scaled;
}

/**
 * Adjust program for fitness level
 * - Beginner: Reduce intensity (fewer sets, more reps, shorter durations, more rest)
 * - Advanced: Increase intensity (more sets, fewer reps, longer durations, less rest)
 */
export function adjustForFitnessLevel(
  schedule: GeneratedProgramWeek[],
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced'
): GeneratedProgramWeek[] {
  if (fitnessLevel === 'intermediate') return schedule;

  return schedule.map(week => {
    const modifiedWorkouts = week.workouts.map(workout => {
      // 1. Coverage workouts - scale percentage and duration
      if (workout.type === 'coverage' && workout.params.coverage) {
        const coverageOffset = fitnessLevel === 'beginner' ? -25 : 25;
        const durationMult = fitnessLevel === 'beginner' ? 0.8 : 1.2;
        return {
          ...workout,
          params: {
            ...workout.params,
            coverage: Math.max(25, Math.min(150, workout.params.coverage + coverageOffset)),
          },
          estimatedMinutes: Math.round(workout.estimatedMinutes * durationMult),
        };
      }

      // 2. Interval runs - scale reps, distance, and rest
      if (workout.type === 'run' && workout.params.intervals) {
        const intervals = workout.params.intervals;
        const repsOffset = fitnessLevel === 'beginner' ? -2 : 2;
        return {
          ...workout,
          params: {
            ...workout.params,
            intervals: {
              reps: Math.max(3, intervals.reps + repsOffset),
              distance: scaleValue(intervals.distance, fitnessLevel, 0.8, 1.2, 200),
              rest: scaleValue(intervals.rest, fitnessLevel, 1.25, 0.8, 60, 180),
            },
          },
        };
      }

      // 3. Zone2/Tempo runs - scale duration
      if (workout.type === 'run' && workout.params.duration &&
          (workout.params.runType === 'zone2' || workout.params.runType === 'tempo')) {
        const newDuration = scaleValue(workout.params.duration, fitnessLevel, 0.8, 1.2, 15);
        return {
          ...workout,
          params: {
            ...workout.params,
            duration: newDuration,
          },
          estimatedMinutes: newDuration,
        };
      }

      // 4. Station practice - scale sets and duration
      if (workout.type === 'station' && workout.params.sets !== undefined) {
        const newSets = scaleValue(workout.params.sets, fitnessLevel, 0.75, 1.25, 1, 3);
        const durationMult = fitnessLevel === 'beginner' ? 0.8 : 1.15;
        return {
          ...workout,
          params: {
            ...workout.params,
            sets: newSets,
          },
          estimatedMinutes: Math.max(15, Math.round(workout.estimatedMinutes * durationMult)),
        };
      }

      // 5. Strength workouts - scale sets, reps, and duration
      if (workout.type === 'strength' && workout.params.exercises) {
        const scaledExercises = workout.params.exercises.map(exercise => ({
          ...exercise,
          sets: scaleValue(exercise.sets, fitnessLevel, 0.75, 1.25, 2, 5),
          reps: scaleRepString(exercise.reps, fitnessLevel),
        }));
        const durationMult = fitnessLevel === 'beginner' ? 0.85 : 1.15;
        return {
          ...workout,
          params: {
            ...workout.params,
            exercises: scaledExercises,
          },
          estimatedMinutes: Math.max(30, Math.round(workout.estimatedMinutes * durationMult)),
        };
      }

      return workout;
    });

    return {
      ...week,
      workouts: modifiedWorkouts,
    };
  });
}

/**
 * Main function: Generate a personalized program
 */
export function generatePersonalizedProgram(
  personalization: ProgramPersonalization
): GeneratedProgram {
  const {
    raceDate,
    fitnessLevel,
    daysPerWeek,
    weakStations = DEFAULT_WEAK_STATIONS,
  } = personalization;

  // 1. Calculate weeks until race
  const weeksUntilRace = calculateWeeksUntilRace(raceDate);

  // 2. Select appropriate template
  const template = selectProgramTemplate(weeksUntilRace, fitnessLevel);

  // 3. Adjust each week for days per week
  let schedule = template.schedule.map(week =>
    adjustWeekForDaysPerWeek(week, daysPerWeek)
  );

  // 4. Add weak station focus
  schedule = addWeakStationFocus(schedule, weakStations);

  // 5. Adjust for fitness level
  schedule = adjustForFitnessLevel(schedule, fitnessLevel);

  // 6. Generate unique ID
  const programId = `personalized-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return {
    id: programId,
    name: template.name,
    description: template.description,
    weeks: template.weeks,
    daysPerWeek,
    schedule,
    personalization,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Validate personalization inputs
 */
export function validatePersonalization(
  personalization: Partial<ProgramPersonalization>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Fitness level is required
  if (!personalization.fitnessLevel) {
    errors.push('Fitness level is required');
  } else if (!['beginner', 'intermediate', 'advanced'].includes(personalization.fitnessLevel)) {
    errors.push('Invalid fitness level');
  }

  // Days per week is required and must be 3-6
  if (!personalization.daysPerWeek) {
    errors.push('Days per week is required');
  } else if (![3, 4, 5, 6].includes(personalization.daysPerWeek)) {
    errors.push('Days per week must be between 3 and 6');
  }

  // Race date must be in the future if provided
  if (personalization.raceDate) {
    const race = new Date(personalization.raceDate);
    const now = new Date();
    if (race <= now) {
      errors.push('Race date must be in the future');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get program summary for preview
 */
export function getProgramSummary(program: GeneratedProgram): {
  totalWorkouts: number;
  runWorkouts: number;
  strengthWorkouts: number;
  stationWorkouts: number;
  coverageWorkouts: number;
  fullSimulations: number;
  restDays: number;
} {
  let totalWorkouts = 0;
  let runWorkouts = 0;
  let strengthWorkouts = 0;
  let stationWorkouts = 0;
  let coverageWorkouts = 0;
  let fullSimulations = 0;
  let restDays = 0;

  for (const week of program.schedule) {
    for (const workout of week.workouts) {
      totalWorkouts++;
      switch (workout.type) {
        case 'run':
          runWorkouts++;
          break;
        case 'strength':
          strengthWorkouts++;
          break;
        case 'station':
          stationWorkouts++;
          break;
        case 'coverage':
          coverageWorkouts++;
          break;
        case 'full':
          fullSimulations++;
          break;
        case 'rest':
          restDays++;
          break;
      }
    }
  }

  return {
    totalWorkouts,
    runWorkouts,
    strengthWorkouts,
    stationWorkouts,
    coverageWorkouts,
    fullSimulations,
    restDays,
  };
}
