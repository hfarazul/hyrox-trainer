import { TrainingProgram, ProgramWeek, ScheduledWorkout } from './types';

// Helper to create a scheduled workout
function workout(
  dayOfWeek: number,
  dayName: string,
  type: ScheduledWorkout['type'],
  estimatedMinutes: number,
  params: ScheduledWorkout['params'] = {}
): ScheduledWorkout {
  return { dayOfWeek, dayName, type, estimatedMinutes, params };
}

// 8-Week Foundation Program (Beginner)
// 3 workouts per week: Monday, Wednesday, Saturday
const FOUNDATION_SCHEDULE: ProgramWeek[] = [
  // Weeks 1-2: Base Building
  {
    week: 1,
    theme: 'Base Building',
    workouts: [
      workout(1, 'Monday', 'quick', 20, { duration: 20, focus: 'mixed' }),
      workout(3, 'Wednesday', 'station', 25, { stations: ['skierg', 'wall_balls'], sets: 2 }),
      workout(6, 'Saturday', 'coverage', 30, { coverage: 25 }),
    ]
  },
  {
    week: 2,
    theme: 'Base Building',
    workouts: [
      workout(1, 'Monday', 'quick', 20, { duration: 20, focus: 'mixed' }),
      workout(3, 'Wednesday', 'station', 25, { stations: ['sled_push', 'burpee_broad_jump'], sets: 2 }),
      workout(6, 'Saturday', 'coverage', 30, { coverage: 25 }),
    ]
  },
  // Weeks 3-4: Volume Build
  {
    week: 3,
    theme: 'Volume Build',
    workouts: [
      workout(1, 'Monday', 'quick', 30, { duration: 30, focus: 'cardio' }),
      workout(3, 'Wednesday', 'station', 35, { stations: ['skierg', 'rowing', 'wall_balls'], sets: 2 }),
      workout(6, 'Saturday', 'coverage', 45, { coverage: 50 }),
    ]
  },
  {
    week: 4,
    theme: 'Volume Build',
    workouts: [
      workout(1, 'Monday', 'quick', 30, { duration: 30, focus: 'cardio' }),
      workout(3, 'Wednesday', 'station', 35, { stations: ['sled_pull', 'farmers_carry', 'sandbag_lunges'], sets: 2 }),
      workout(6, 'Saturday', 'coverage', 45, { coverage: 50 }),
    ]
  },
  // Weeks 5-6: Intensity
  {
    week: 5,
    theme: 'Intensity',
    workouts: [
      workout(1, 'Monday', 'quick', 30, { duration: 30, focus: 'strength' }),
      workout(3, 'Wednesday', 'station', 40, { stations: ['sled_push', 'sled_pull', 'farmers_carry', 'sandbag_lunges'], sets: 2 }),
      workout(6, 'Saturday', 'coverage', 45, { coverage: 50 }),
    ]
  },
  {
    week: 6,
    theme: 'Intensity',
    workouts: [
      workout(1, 'Monday', 'quick', 30, { duration: 30, focus: 'strength' }),
      workout(3, 'Wednesday', 'station', 40, { stations: ['skierg', 'rowing', 'burpee_broad_jump', 'wall_balls'], sets: 2 }),
      workout(6, 'Saturday', 'coverage', 45, { coverage: 50 }),
    ]
  },
  // Weeks 7-8: Peak
  {
    week: 7,
    theme: 'Peak',
    workouts: [
      workout(1, 'Monday', 'quick', 45, { duration: 45, focus: 'mixed' }),
      workout(3, 'Wednesday', 'station', 50, { stations: ['skierg', 'sled_push', 'sled_pull', 'burpee_broad_jump', 'rowing', 'farmers_carry', 'sandbag_lunges', 'wall_balls'], sets: 1 }),
      workout(6, 'Saturday', 'coverage', 60, { coverage: 75 }),
    ]
  },
  {
    week: 8,
    theme: 'Peak',
    workouts: [
      workout(1, 'Monday', 'quick', 45, { duration: 45, focus: 'mixed' }),
      workout(3, 'Wednesday', 'station', 50, { stations: ['skierg', 'sled_push', 'sled_pull', 'burpee_broad_jump', 'rowing', 'farmers_carry', 'sandbag_lunges', 'wall_balls'], sets: 1 }),
      workout(6, 'Saturday', 'coverage', 60, { coverage: 75 }),
    ]
  },
];

// 12-Week Race Prep Program (Intermediate)
// 4 workouts per week: Monday, Wednesday, Friday, Saturday
const RACE_PREP_SCHEDULE: ProgramWeek[] = [
  // Weeks 1-3: Base
  {
    week: 1,
    theme: 'Base',
    workouts: [
      workout(1, 'Monday', 'quick', 30, { duration: 30, focus: 'mixed' }),
      workout(3, 'Wednesday', 'station', 30, { stations: ['skierg', 'wall_balls', 'burpee_broad_jump'], sets: 2 }),
      workout(5, 'Friday', 'rest', 0, {}),
      workout(6, 'Saturday', 'coverage', 45, { coverage: 50 }),
    ]
  },
  {
    week: 2,
    theme: 'Base',
    workouts: [
      workout(1, 'Monday', 'quick', 30, { duration: 30, focus: 'cardio' }),
      workout(3, 'Wednesday', 'station', 30, { stations: ['sled_push', 'sled_pull', 'farmers_carry'], sets: 2 }),
      workout(5, 'Friday', 'rest', 0, {}),
      workout(6, 'Saturday', 'coverage', 45, { coverage: 50 }),
    ]
  },
  {
    week: 3,
    theme: 'Base',
    workouts: [
      workout(1, 'Monday', 'quick', 30, { duration: 30, focus: 'strength' }),
      workout(3, 'Wednesday', 'station', 35, { stations: ['rowing', 'sandbag_lunges', 'wall_balls'], sets: 2 }),
      workout(5, 'Friday', 'rest', 0, {}),
      workout(6, 'Saturday', 'coverage', 45, { coverage: 50 }),
    ]
  },
  // Weeks 4-6: Build
  {
    week: 4,
    theme: 'Build',
    workouts: [
      workout(1, 'Monday', 'quick', 45, { duration: 45, focus: 'mixed' }),
      workout(3, 'Wednesday', 'station', 40, { stations: ['skierg', 'sled_push', 'burpee_broad_jump', 'wall_balls'], sets: 2 }),
      workout(5, 'Friday', 'quick', 20, { duration: 20, focus: 'cardio' }),
      workout(6, 'Saturday', 'coverage', 60, { coverage: 75 }),
    ]
  },
  {
    week: 5,
    theme: 'Build',
    workouts: [
      workout(1, 'Monday', 'quick', 45, { duration: 45, focus: 'strength' }),
      workout(3, 'Wednesday', 'station', 40, { stations: ['sled_pull', 'rowing', 'farmers_carry', 'sandbag_lunges'], sets: 2 }),
      workout(5, 'Friday', 'quick', 20, { duration: 20, focus: 'mixed' }),
      workout(6, 'Saturday', 'coverage', 60, { coverage: 75 }),
    ]
  },
  {
    week: 6,
    theme: 'Build',
    workouts: [
      workout(1, 'Monday', 'quick', 45, { duration: 45, focus: 'mixed' }),
      workout(3, 'Wednesday', 'station', 45, { stations: ['skierg', 'sled_push', 'sled_pull', 'burpee_broad_jump'], sets: 2 }),
      workout(5, 'Friday', 'quick', 25, { duration: 25, focus: 'cardio' }),
      workout(6, 'Saturday', 'coverage', 60, { coverage: 75 }),
    ]
  },
  // Weeks 7-9: Peak
  {
    week: 7,
    theme: 'Peak',
    workouts: [
      workout(1, 'Monday', 'quick', 45, { duration: 45, focus: 'mixed' }),
      workout(3, 'Wednesday', 'station', 50, { stations: ['skierg', 'sled_push', 'sled_pull', 'burpee_broad_jump', 'rowing'], sets: 2 }),
      workout(5, 'Friday', 'quick', 30, { duration: 30, focus: 'strength' }),
      workout(6, 'Saturday', 'coverage', 75, { coverage: 100 }),
    ]
  },
  {
    week: 8,
    theme: 'Peak',
    workouts: [
      workout(1, 'Monday', 'quick', 45, { duration: 45, focus: 'cardio' }),
      workout(3, 'Wednesday', 'station', 55, { stations: ['rowing', 'farmers_carry', 'sandbag_lunges', 'wall_balls', 'burpee_broad_jump'], sets: 2 }),
      workout(5, 'Friday', 'quick', 30, { duration: 30, focus: 'mixed' }),
      workout(6, 'Saturday', 'coverage', 75, { coverage: 100 }),
    ]
  },
  {
    week: 9,
    theme: 'Peak',
    workouts: [
      workout(1, 'Monday', 'quick', 45, { duration: 45, focus: 'strength' }),
      workout(3, 'Wednesday', 'station', 60, { stations: ['skierg', 'sled_push', 'sled_pull', 'burpee_broad_jump', 'rowing', 'farmers_carry'], sets: 2 }),
      workout(5, 'Friday', 'quick', 30, { duration: 30, focus: 'cardio' }),
      workout(6, 'Saturday', 'coverage', 75, { coverage: 100 }),
    ]
  },
  // Weeks 10-11: Race Simulation
  {
    week: 10,
    theme: 'Race Simulation',
    workouts: [
      workout(1, 'Monday', 'quick', 30, { duration: 30, focus: 'mixed' }),
      workout(3, 'Wednesday', 'full', 75, {}),
      workout(5, 'Friday', 'rest', 0, {}),
      workout(6, 'Saturday', 'coverage', 60, { coverage: 75 }),
    ]
  },
  {
    week: 11,
    theme: 'Race Simulation',
    workouts: [
      workout(1, 'Monday', 'quick', 30, { duration: 30, focus: 'cardio' }),
      workout(3, 'Wednesday', 'full', 75, {}),
      workout(5, 'Friday', 'rest', 0, {}),
      workout(6, 'Saturday', 'coverage', 60, { coverage: 75 }),
    ]
  },
  // Week 12: Taper
  {
    week: 12,
    theme: 'Taper',
    workouts: [
      workout(1, 'Monday', 'quick', 20, { duration: 20, focus: 'mixed' }),
      workout(3, 'Wednesday', 'station', 25, { stations: ['skierg', 'wall_balls'], sets: 1 }),
      workout(5, 'Friday', 'rest', 0, {}),
      workout(6, 'Saturday', 'coverage', 45, { coverage: 50 }),
    ]
  },
];

export const TRAINING_PROGRAMS: TrainingProgram[] = [
  {
    id: 'foundation-8-week',
    name: '8-Week Foundation',
    description: 'Build your HYROX fitness base with progressive workouts. Perfect for beginners or those returning to training.',
    weeks: 8,
    difficulty: 'beginner',
    workoutsPerWeek: 3,
    schedule: FOUNDATION_SCHEDULE,
  },
  {
    id: 'race-prep-12-week',
    name: '12-Week Race Prep',
    description: 'Comprehensive race preparation program with periodized training. Includes full race simulations in final weeks.',
    weeks: 12,
    difficulty: 'intermediate',
    workoutsPerWeek: 4,
    schedule: RACE_PREP_SCHEDULE,
  },
];

export function getProgramById(id: string): TrainingProgram | undefined {
  return TRAINING_PROGRAMS.find(p => p.id === id);
}

export function getWorkoutTypeLabel(type: string): string {
  switch (type) {
    case 'quick': return 'Quick Workout';
    case 'station': return 'Station Practice';
    case 'coverage': return 'Race Coverage';
    case 'full': return 'Full Simulation';
    case 'rest': return 'Rest Day';
    default: return type;
  }
}

export type WorkoutTypeIconName = 'bolt' | 'weights' | 'target' | 'flag' | 'moon' | 'muscle';

export function getWorkoutTypeIcon(type: string): WorkoutTypeIconName {
  switch (type) {
    case 'quick': return 'bolt';
    case 'station': return 'weights';
    case 'coverage': return 'target';
    case 'full': return 'flag';
    case 'rest': return 'moon';
    default: return 'muscle';
  }
}
