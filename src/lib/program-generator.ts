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
 * Adjust program for fitness level
 * - Beginner: Reduce intensity, more rest
 * - Advanced: Increase intensity, less rest
 */
export function adjustForFitnessLevel(
  schedule: GeneratedProgramWeek[],
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced'
): GeneratedProgramWeek[] {
  if (fitnessLevel === 'intermediate') return schedule;

  return schedule.map(week => {
    const modifiedWorkouts = week.workouts.map(workout => {
      if (fitnessLevel === 'beginner') {
        // Reduce coverage percentages for beginners
        if (workout.type === 'coverage' && workout.params.coverage) {
          return {
            ...workout,
            params: {
              ...workout.params,
              coverage: Math.max(25, workout.params.coverage - 25),
            },
            estimatedMinutes: Math.round(workout.estimatedMinutes * 0.8),
          };
        }

        // Reduce interval reps for beginners
        if (workout.type === 'run' && workout.params.intervals) {
          return {
            ...workout,
            params: {
              ...workout.params,
              intervals: {
                ...workout.params.intervals,
                reps: Math.max(3, workout.params.intervals.reps - 2),
              },
            },
          };
        }
      }

      if (fitnessLevel === 'advanced') {
        // Increase coverage percentages for advanced
        if (workout.type === 'coverage' && workout.params.coverage) {
          return {
            ...workout,
            params: {
              ...workout.params,
              coverage: Math.min(150, workout.params.coverage + 25),
            },
            estimatedMinutes: Math.round(workout.estimatedMinutes * 1.2),
          };
        }

        // Increase interval reps for advanced
        if (workout.type === 'run' && workout.params.intervals) {
          return {
            ...workout,
            params: {
              ...workout.params,
              intervals: {
                ...workout.params.intervals,
                reps: workout.params.intervals.reps + 2,
              },
            },
          };
        }
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
