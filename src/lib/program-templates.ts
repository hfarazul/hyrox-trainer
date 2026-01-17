/**
 * Enhanced Program Templates for Personalized Training
 *
 * These templates include running workouts and strength days,
 * designed for 6-day training weeks that can be adapted to fewer days.
 */

import { ScheduledWorkoutExtended, StrengthExercise } from './types';
import { STRENGTH_WORKOUT_TEMPLATES } from './strength-exercises';

// Helper types for template definition
export interface ProgramWeekTemplate {
  week: number;
  phase: string;
  theme: string;
  isDeload?: boolean;
  workouts: ScheduledWorkoutExtended[];
}

export interface ProgramTemplate {
  id: string;
  name: string;
  description: string;
  weeks: number;
  targetLevel: 'beginner' | 'intermediate' | 'advanced';
  defaultDaysPerWeek: number;
  schedule: ProgramWeekTemplate[];
}

// Helper to create workouts
function createWorkout(
  dayOfWeek: number,
  dayName: string,
  type: ScheduledWorkoutExtended['type'],
  estimatedMinutes: number,
  params: ScheduledWorkoutExtended['params'] = {}
): ScheduledWorkoutExtended {
  return { dayOfWeek, dayName, type, estimatedMinutes, params };
}

// Shorthand helpers for common workout types
const runZone2 = (day: number, name: string, mins: number) =>
  createWorkout(day, name, 'run', mins, {
    runType: 'zone2',
    duration: mins,
    hrZone: '65-75% max HR',
  });

const runTempo = (day: number, name: string, mins: number) =>
  createWorkout(day, name, 'run', mins, {
    runType: 'tempo',
    duration: mins,
    hrZone: '80-85% max HR',
  });

const runIntervals = (day: number, name: string, reps: number, distance: number, rest: number) =>
  createWorkout(day, name, 'run', Math.ceil((reps * (distance / 200 + rest / 60)) + 10), {
    runType: 'intervals',
    duration: Math.ceil((reps * (distance / 200 + rest / 60)) + 10),
    intervals: { reps, distance, rest },
  });

const strengthLower = (day: number, name: string, exercises: StrengthExercise[], stationWork: string[]) =>
  createWorkout(day, name, 'strength', 45, {
    strengthFocus: 'lower',
    exercises,
    stationWork,
  });

const strengthUpper = (day: number, name: string, exercises: StrengthExercise[], stationWork: string[]) =>
  createWorkout(day, name, 'strength', 45, {
    strengthFocus: 'upper',
    exercises,
    stationWork,
  });

const strengthFull = (day: number, name: string, exercises: StrengthExercise[], stationWork: string[]) =>
  createWorkout(day, name, 'strength', 50, {
    strengthFocus: 'full',
    exercises,
    stationWork,
  });

const stationPractice = (day: number, name: string, stations: string[], sets: number, mins: number) =>
  createWorkout(day, name, 'station', mins, { stations, sets });

const coverage = (day: number, name: string, percent: number, mins: number) =>
  createWorkout(day, name, 'coverage', mins, { coverage: percent });

const fullSim = (day: number, name: string) =>
  createWorkout(day, name, 'full', 75, {});

const rest = (day: number, name: string) =>
  createWorkout(day, name, 'rest', 0, {});

// Default weak stations (most challenging for beginners)
export const DEFAULT_WEAK_STATIONS = [
  'burpee_broad_jump',
  'sandbag_lunges',
  'farmers_carry',
  'wall_balls',
];

// ============================================================
// 8-WEEK INTERMEDIATE PROGRAM
// For athletes with some fitness base, preparing for a race
// ============================================================

const EIGHT_WEEK_SCHEDULE: ProgramWeekTemplate[] = [
  // PHASE 1: SPECIFICITY (Weeks 1-4)
  {
    week: 1,
    phase: 'Specificity',
    theme: 'Build Race Fitness',
    workouts: [
      strengthLower(1, 'Monday', STRENGTH_WORKOUT_TEMPLATES.lowerBody.exercises, ['sled_push']),
      stationPractice(2, 'Tuesday', ['burpee_broad_jump', 'wall_balls'], 2, 30),
      rest(3, 'Wednesday'),
      strengthUpper(4, 'Thursday', STRENGTH_WORKOUT_TEMPLATES.upperBody.exercises, ['sled_pull', 'farmers_carry']),
      runIntervals(5, 'Friday', 6, 400, 90),
      coverage(6, 'Saturday', 50, 45),
    ],
  },
  {
    week: 2,
    phase: 'Specificity',
    theme: 'Build Race Fitness',
    workouts: [
      strengthLower(1, 'Monday', STRENGTH_WORKOUT_TEMPLATES.lowerBody.exercises, ['sandbag_lunges']),
      stationPractice(2, 'Tuesday', ['skierg', 'rowing'], 2, 30),
      rest(3, 'Wednesday'),
      strengthUpper(4, 'Thursday', STRENGTH_WORKOUT_TEMPLATES.upperBody.exercises, ['wall_balls']),
      runTempo(5, 'Friday', 30),
      coverage(6, 'Saturday', 50, 45),
    ],
  },
  {
    week: 3,
    phase: 'Specificity',
    theme: 'Increase Intensity',
    workouts: [
      strengthFull(1, 'Monday', STRENGTH_WORKOUT_TEMPLATES.fullBody.exercises, ['sled_push', 'sled_pull']),
      stationPractice(2, 'Tuesday', ['burpee_broad_jump', 'sandbag_lunges', 'wall_balls'], 2, 35),
      rest(3, 'Wednesday'),
      runIntervals(4, 'Thursday', 8, 400, 90),
      stationPractice(5, 'Friday', ['farmers_carry', 'rowing'], 2, 25),
      coverage(6, 'Saturday', 75, 55),
    ],
  },
  {
    week: 4,
    phase: 'Specificity',
    theme: 'Deload Week',
    isDeload: true,
    workouts: [
      runZone2(1, 'Monday', 25),
      stationPractice(2, 'Tuesday', ['skierg', 'wall_balls'], 1, 20),
      rest(3, 'Wednesday'),
      runZone2(4, 'Thursday', 25),
      rest(5, 'Friday'),
      coverage(6, 'Saturday', 50, 35),
    ],
  },
  // PHASE 2: PEAK & TAPER (Weeks 5-8)
  {
    week: 5,
    phase: 'Peak',
    theme: 'Race Simulations',
    workouts: [
      strengthFull(1, 'Monday', STRENGTH_WORKOUT_TEMPLATES.fullBody.exercises, ['sled_push', 'burpee_broad_jump']),
      stationPractice(2, 'Tuesday', ['skierg', 'sled_pull', 'rowing', 'wall_balls'], 2, 40),
      rest(3, 'Wednesday'),
      runIntervals(4, 'Thursday', 5, 1000, 180),
      rest(5, 'Friday'),
      coverage(6, 'Saturday', 100, 70),
    ],
  },
  {
    week: 6,
    phase: 'Peak',
    theme: 'Race Simulations',
    workouts: [
      strengthLower(1, 'Monday', STRENGTH_WORKOUT_TEMPLATES.lowerBody.exercises, ['sandbag_lunges']),
      stationPractice(2, 'Tuesday', ['burpee_broad_jump', 'farmers_carry', 'wall_balls'], 2, 35),
      rest(3, 'Wednesday'),
      runTempo(4, 'Thursday', 35),
      rest(5, 'Friday'),
      fullSim(6, 'Saturday'),
    ],
  },
  {
    week: 7,
    phase: 'Peak',
    theme: 'Final Push',
    workouts: [
      strengthUpper(1, 'Monday', STRENGTH_WORKOUT_TEMPLATES.upperBody.exercises, ['sled_pull']),
      stationPractice(2, 'Tuesday', ['skierg', 'rowing', 'wall_balls'], 2, 30),
      rest(3, 'Wednesday'),
      runIntervals(4, 'Thursday', 4, 1000, 180),
      rest(5, 'Friday'),
      fullSim(6, 'Saturday'),
    ],
  },
  {
    week: 8,
    phase: 'Taper',
    theme: 'Race Ready',
    isDeload: true,
    workouts: [
      runZone2(1, 'Monday', 20),
      stationPractice(2, 'Tuesday', ['skierg', 'wall_balls'], 1, 15),
      rest(3, 'Wednesday'),
      runZone2(4, 'Thursday', 15),
      rest(5, 'Friday'),
      coverage(6, 'Saturday', 50, 30),
    ],
  },
];

// ============================================================
// 12-WEEK BEGINNER PROGRAM
// For first-timers building up to race day
// ============================================================

const TWELVE_WEEK_SCHEDULE: ProgramWeekTemplate[] = [
  // CYCLE 1: BASE (Weeks 1-4)
  {
    week: 1,
    phase: 'Base',
    theme: 'Foundation',
    workouts: [
      runZone2(1, 'Monday', 30),
      stationPractice(2, 'Tuesday', ['skierg', 'wall_balls'], 2, 25),
      rest(3, 'Wednesday'),
      strengthLower(4, 'Thursday', STRENGTH_WORKOUT_TEMPLATES.lowerBody.exercises.slice(0, 3), ['sled_push']),
      rest(5, 'Friday'),
      coverage(6, 'Saturday', 25, 30),
    ],
  },
  {
    week: 2,
    phase: 'Base',
    theme: 'Foundation',
    workouts: [
      runZone2(1, 'Monday', 30),
      stationPractice(2, 'Tuesday', ['rowing', 'burpee_broad_jump'], 2, 25),
      rest(3, 'Wednesday'),
      strengthUpper(4, 'Thursday', STRENGTH_WORKOUT_TEMPLATES.upperBody.exercises.slice(0, 3), ['sled_pull']),
      rest(5, 'Friday'),
      coverage(6, 'Saturday', 25, 30),
    ],
  },
  {
    week: 3,
    phase: 'Base',
    theme: 'Build Endurance',
    workouts: [
      runZone2(1, 'Monday', 35),
      stationPractice(2, 'Tuesday', ['farmers_carry', 'sandbag_lunges'], 2, 30),
      rest(3, 'Wednesday'),
      strengthFull(4, 'Thursday', STRENGTH_WORKOUT_TEMPLATES.fullBody.exercises.slice(0, 3), ['wall_balls']),
      runZone2(5, 'Friday', 25),
      coverage(6, 'Saturday', 25, 35),
    ],
  },
  {
    week: 4,
    phase: 'Base',
    theme: 'Deload',
    isDeload: true,
    workouts: [
      runZone2(1, 'Monday', 20),
      stationPractice(2, 'Tuesday', ['skierg', 'rowing'], 1, 15),
      rest(3, 'Wednesday'),
      runZone2(4, 'Thursday', 20),
      rest(5, 'Friday'),
      coverage(6, 'Saturday', 25, 25),
    ],
  },
  // CYCLE 2: PACE (Weeks 5-8)
  {
    week: 5,
    phase: 'Pace',
    theme: 'Build Speed',
    workouts: [
      strengthLower(1, 'Monday', STRENGTH_WORKOUT_TEMPLATES.lowerBody.exercises, ['sled_push', 'sandbag_lunges']),
      stationPractice(2, 'Tuesday', ['burpee_broad_jump', 'wall_balls', 'skierg'], 2, 35),
      rest(3, 'Wednesday'),
      runTempo(4, 'Thursday', 30),
      stationPractice(5, 'Friday', ['farmers_carry'], 2, 20),
      coverage(6, 'Saturday', 50, 45),
    ],
  },
  {
    week: 6,
    phase: 'Pace',
    theme: 'Build Speed',
    workouts: [
      strengthUpper(1, 'Monday', STRENGTH_WORKOUT_TEMPLATES.upperBody.exercises, ['sled_pull', 'wall_balls']),
      stationPractice(2, 'Tuesday', ['rowing', 'sled_push', 'sled_pull'], 2, 35),
      rest(3, 'Wednesday'),
      runIntervals(4, 'Thursday', 6, 400, 90),
      stationPractice(5, 'Friday', ['sandbag_lunges'], 2, 20),
      coverage(6, 'Saturday', 50, 45),
    ],
  },
  {
    week: 7,
    phase: 'Pace',
    theme: 'Half Simulations',
    workouts: [
      strengthFull(1, 'Monday', STRENGTH_WORKOUT_TEMPLATES.fullBody.exercises, ['burpee_broad_jump']),
      stationPractice(2, 'Tuesday', ['skierg', 'sled_push', 'rowing', 'wall_balls'], 2, 40),
      rest(3, 'Wednesday'),
      runTempo(4, 'Thursday', 35),
      rest(5, 'Friday'),
      coverage(6, 'Saturday', 50, 50),
    ],
  },
  {
    week: 8,
    phase: 'Pace',
    theme: 'Deload',
    isDeload: true,
    workouts: [
      runZone2(1, 'Monday', 25),
      stationPractice(2, 'Tuesday', ['wall_balls', 'burpee_broad_jump'], 1, 20),
      rest(3, 'Wednesday'),
      runZone2(4, 'Thursday', 25),
      rest(5, 'Friday'),
      coverage(6, 'Saturday', 50, 35),
    ],
  },
  // CYCLE 3: PEAK (Weeks 9-12)
  {
    week: 9,
    phase: 'Accelerate',
    theme: 'Race Intensity',
    workouts: [
      strengthFull(1, 'Monday', STRENGTH_WORKOUT_TEMPLATES.fullBody.exercises, ['sled_push', 'sled_pull']),
      stationPractice(2, 'Tuesday', ['skierg', 'burpee_broad_jump', 'rowing', 'farmers_carry', 'wall_balls'], 2, 45),
      rest(3, 'Wednesday'),
      runIntervals(4, 'Thursday', 5, 1000, 180),
      rest(5, 'Friday'),
      coverage(6, 'Saturday', 75, 55),
    ],
  },
  {
    week: 10,
    phase: 'Accelerate',
    theme: 'Full Simulations',
    workouts: [
      strengthLower(1, 'Monday', STRENGTH_WORKOUT_TEMPLATES.lowerBody.exercises, ['sandbag_lunges']),
      stationPractice(2, 'Tuesday', ['sled_push', 'sled_pull', 'burpee_broad_jump', 'wall_balls'], 2, 40),
      rest(3, 'Wednesday'),
      runTempo(4, 'Thursday', 30),
      rest(5, 'Friday'),
      fullSim(6, 'Saturday'),
    ],
  },
  {
    week: 11,
    phase: 'Prime',
    theme: 'Technical Polish',
    workouts: [
      runZone2(1, 'Monday', 30),
      stationPractice(2, 'Tuesday', ['burpee_broad_jump', 'sandbag_lunges', 'wall_balls'], 2, 35),
      rest(3, 'Wednesday'),
      runIntervals(4, 'Thursday', 4, 800, 120),
      rest(5, 'Friday'),
      fullSim(6, 'Saturday'),
    ],
  },
  {
    week: 12,
    phase: 'Taper',
    theme: 'Race Ready',
    isDeload: true,
    workouts: [
      runZone2(1, 'Monday', 20),
      stationPractice(2, 'Tuesday', ['skierg', 'wall_balls'], 1, 15),
      rest(3, 'Wednesday'),
      runZone2(4, 'Thursday', 15),
      rest(5, 'Friday'),
      coverage(6, 'Saturday', 50, 30),
    ],
  },
];

// Export program templates
export const PROGRAM_TEMPLATES: ProgramTemplate[] = [
  {
    id: 'personalized-8-week',
    name: '8-Week Race Prep',
    description: 'Intensive 8-week program for intermediate athletes with race-specific training, running, and strength work.',
    weeks: 8,
    targetLevel: 'intermediate',
    defaultDaysPerWeek: 6,
    schedule: EIGHT_WEEK_SCHEDULE,
  },
  {
    id: 'personalized-12-week',
    name: '12-Week Complete',
    description: 'Comprehensive 12-week program building from base fitness to race day. Includes running, strength, and station work.',
    weeks: 12,
    targetLevel: 'beginner',
    defaultDaysPerWeek: 6,
    schedule: TWELVE_WEEK_SCHEDULE,
  },
];

// Helper functions
export function getTemplateById(id: string): ProgramTemplate | undefined {
  return PROGRAM_TEMPLATES.find(t => t.id === id);
}

export function getTemplateForWeeks(weeksUntilRace: number): ProgramTemplate {
  // Use 8-week if race is <= 10 weeks away, otherwise 12-week
  return weeksUntilRace <= 10
    ? PROGRAM_TEMPLATES.find(t => t.weeks === 8)!
    : PROGRAM_TEMPLATES.find(t => t.weeks === 12)!;
}

// Get workout type labels including new types
export function getExtendedWorkoutTypeLabel(type: string): string {
  switch (type) {
    case 'run': return 'Running';
    case 'strength': return 'Strength';
    case 'quick': return 'Quick Workout';
    case 'station': return 'Station Practice';
    case 'coverage': return 'Race Coverage';
    case 'full': return 'Full Simulation';
    case 'rest': return 'Rest Day';
    default: return type;
  }
}

export type ExtendedWorkoutTypeIconName = 'runner' | 'dumbbell' | 'bolt' | 'weights' | 'target' | 'flag' | 'moon' | 'muscle';

export function getExtendedWorkoutTypeIcon(type: string): ExtendedWorkoutTypeIconName {
  switch (type) {
    case 'run': return 'runner';
    case 'strength': return 'dumbbell';
    case 'quick': return 'bolt';
    case 'station': return 'weights';
    case 'coverage': return 'target';
    case 'full': return 'flag';
    case 'rest': return 'moon';
    default: return 'muscle';
  }
}
