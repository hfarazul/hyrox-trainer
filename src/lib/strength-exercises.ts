import { StrengthExercise } from './types';

// Strength Exercise Library
// Organized by focus area for hybrid HYROX training

export interface StrengthExerciseDefinition extends StrengthExercise {
  id: string;
  category: 'lower' | 'upper' | 'full';
  equipmentNeeded: string[];  // References equipment IDs from hyrox-data.ts
  relatedStations?: string[];  // HYROX stations this helps prepare for
}

// Lower Body Exercises
export const LOWER_BODY_EXERCISES: StrengthExerciseDefinition[] = [
  {
    id: 'back_squat',
    name: 'Back Squat',
    sets: 4,
    reps: '8-10',
    category: 'lower',
    equipmentNeeded: ['barbell'],
    relatedStations: ['sled_push', 'sled_pull', 'wall_balls'],
    notes: 'Focus on depth and controlled tempo',
  },
  {
    id: 'romanian_deadlift',
    name: 'Romanian Deadlift',
    sets: 3,
    reps: '10-12',
    category: 'lower',
    equipmentNeeded: ['barbell', 'dumbbells'],
    relatedStations: ['sled_pull', 'sandbag_lunges'],
    notes: 'Maintain flat back, feel hamstring stretch',
  },
  {
    id: 'leg_press',
    name: 'Leg Press',
    sets: 3,
    reps: '12-15',
    category: 'lower',
    equipmentNeeded: ['leg_press'],
    relatedStations: ['sled_push'],
    notes: 'Full range of motion, dont lock knees',
  },
  {
    id: 'walking_lunges',
    name: 'Walking Lunges',
    sets: 3,
    reps: '20 steps',
    category: 'lower',
    equipmentNeeded: ['dumbbells'],
    relatedStations: ['sandbag_lunges'],
    notes: 'Knee touches ground each rep',
  },
  {
    id: 'goblet_squat',
    name: 'Goblet Squat',
    sets: 3,
    reps: '12-15',
    category: 'lower',
    equipmentNeeded: ['kettlebell', 'dumbbells'],
    relatedStations: ['wall_balls', 'sled_push'],
    notes: 'Keep chest up, elbows inside knees',
  },
  {
    id: 'calf_raises',
    name: 'Calf Raises',
    sets: 3,
    reps: '15-20',
    category: 'lower',
    equipmentNeeded: [],
    relatedStations: ['sled_push', 'farmers_carry'],
    notes: 'Full range, pause at top',
  },
];

// Upper Body Exercises
export const UPPER_BODY_EXERCISES: StrengthExerciseDefinition[] = [
  {
    id: 'bench_press',
    name: 'Bench Press',
    sets: 4,
    reps: '8-10',
    category: 'upper',
    equipmentNeeded: ['barbell'],
    relatedStations: ['sled_push', 'burpee_broad_jump'],
    notes: 'Control the weight, full range of motion',
  },
  {
    id: 'bent_over_row',
    name: 'Bent Over Row',
    sets: 4,
    reps: '8-10',
    category: 'upper',
    equipmentNeeded: ['barbell', 'dumbbells'],
    relatedStations: ['sled_pull', 'rowing'],
    notes: 'Pull to lower chest, squeeze shoulder blades',
  },
  {
    id: 'overhead_press',
    name: 'Overhead Press',
    sets: 3,
    reps: '8-10',
    category: 'upper',
    equipmentNeeded: ['barbell', 'dumbbells'],
    relatedStations: ['wall_balls', 'skierg'],
    notes: 'Brace core, full lockout overhead',
  },
  {
    id: 'pull_ups',
    name: 'Pull-ups',
    sets: 3,
    reps: '8-12',
    category: 'upper',
    equipmentNeeded: ['pull_up_bar'],
    relatedStations: ['sled_pull', 'skierg'],
    notes: 'Full dead hang to chin over bar',
  },
  {
    id: 'dumbbell_rows',
    name: 'Dumbbell Rows',
    sets: 3,
    reps: '10-12',
    category: 'upper',
    equipmentNeeded: ['dumbbells'],
    relatedStations: ['sled_pull', 'rowing'],
    notes: 'One arm at a time, pull to hip',
  },
  {
    id: 'push_ups',
    name: 'Push-ups',
    sets: 3,
    reps: '15-20',
    category: 'upper',
    equipmentNeeded: [],
    relatedStations: ['burpee_broad_jump'],
    notes: 'Full range, chest to floor',
  },
  {
    id: 'face_pulls',
    name: 'Face Pulls',
    sets: 3,
    reps: '15-20',
    category: 'upper',
    equipmentNeeded: ['cable_machine', 'resistance_bands'],
    relatedStations: ['sled_pull', 'rowing'],
    notes: 'Pull to face, external rotation at end',
  },
];

// Full Body Exercises
export const FULL_BODY_EXERCISES: StrengthExerciseDefinition[] = [
  {
    id: 'clean_and_press',
    name: 'Clean and Press',
    sets: 4,
    reps: '6-8',
    category: 'full',
    equipmentNeeded: ['barbell', 'dumbbells'],
    relatedStations: ['wall_balls', 'skierg'],
    notes: 'Explosive clean, controlled press',
  },
  {
    id: 'thrusters',
    name: 'Thrusters',
    sets: 3,
    reps: '10-12',
    category: 'full',
    equipmentNeeded: ['barbell', 'dumbbells'],
    relatedStations: ['wall_balls'],
    notes: 'Squat to press in one movement',
  },
  {
    id: 'kettlebell_swings',
    name: 'Kettlebell Swings',
    sets: 4,
    reps: '15-20',
    category: 'full',
    equipmentNeeded: ['kettlebell'],
    relatedStations: ['skierg', 'rowing'],
    notes: 'Hip hinge, power from glutes',
  },
  {
    id: 'deadlift',
    name: 'Deadlift',
    sets: 4,
    reps: '5-8',
    category: 'full',
    equipmentNeeded: ['barbell'],
    relatedStations: ['sled_pull', 'farmers_carry'],
    notes: 'Maintain neutral spine, drive through heels',
  },
  {
    id: 'burpees',
    name: 'Burpees',
    sets: 3,
    reps: '10-15',
    category: 'full',
    equipmentNeeded: [],
    relatedStations: ['burpee_broad_jump'],
    notes: 'Full chest to floor, jump at top',
  },
  {
    id: 'renegade_rows',
    name: 'Renegade Rows',
    sets: 3,
    reps: '8 each side',
    category: 'full',
    equipmentNeeded: ['dumbbells'],
    relatedStations: ['rowing', 'sled_pull', 'burpee_broad_jump'],
    notes: 'Plank position, minimize hip rotation',
  },
];

// All exercises combined
export const ALL_STRENGTH_EXERCISES: StrengthExerciseDefinition[] = [
  ...LOWER_BODY_EXERCISES,
  ...UPPER_BODY_EXERCISES,
  ...FULL_BODY_EXERCISES,
];

// Helper function to get exercises by category
export function getExercisesByCategory(
  category: 'lower' | 'upper' | 'full'
): StrengthExerciseDefinition[] {
  return ALL_STRENGTH_EXERCISES.filter(ex => ex.category === category);
}

// Helper function to get exercises that can be done with available equipment
export function getExercisesForEquipment(
  availableEquipment: string[],
  category?: 'lower' | 'upper' | 'full'
): StrengthExerciseDefinition[] {
  let exercises = category
    ? getExercisesByCategory(category)
    : ALL_STRENGTH_EXERCISES;

  return exercises.filter(ex =>
    ex.equipmentNeeded.length === 0 ||
    ex.equipmentNeeded.some(eq => availableEquipment.includes(eq))
  );
}

// Helper function to get exercises that help with specific stations
export function getExercisesForStation(stationId: string): StrengthExerciseDefinition[] {
  return ALL_STRENGTH_EXERCISES.filter(
    ex => ex.relatedStations?.includes(stationId)
  );
}

// Pre-built workout templates for different focuses
export const STRENGTH_WORKOUT_TEMPLATES = {
  lowerBody: {
    name: 'Lower Body Power',
    focus: 'lower' as const,
    exercises: [
      { ...LOWER_BODY_EXERCISES[0], sets: 4, reps: '8' },      // Back Squat
      { ...LOWER_BODY_EXERCISES[1], sets: 3, reps: '10' },     // Romanian Deadlift
      { ...LOWER_BODY_EXERCISES[3], sets: 3, reps: '20 steps' }, // Walking Lunges
      { ...LOWER_BODY_EXERCISES[5], sets: 3, reps: '15' },     // Calf Raises
    ],
    stationWork: ['sled_push', 'sandbag_lunges'],
  },
  upperBody: {
    name: 'Upper Body Strength',
    focus: 'upper' as const,
    exercises: [
      { ...UPPER_BODY_EXERCISES[0], sets: 4, reps: '8' },      // Bench Press
      { ...UPPER_BODY_EXERCISES[1], sets: 4, reps: '8' },      // Bent Over Row
      { ...UPPER_BODY_EXERCISES[2], sets: 3, reps: '10' },     // Overhead Press
      { ...UPPER_BODY_EXERCISES[3], sets: 3, reps: 'max' },    // Pull-ups
    ],
    stationWork: ['sled_pull', 'wall_balls', 'farmers_carry'],
  },
  fullBody: {
    name: 'Full Body Power',
    focus: 'full' as const,
    exercises: [
      { ...FULL_BODY_EXERCISES[3], sets: 4, reps: '5' },       // Deadlift
      { ...FULL_BODY_EXERCISES[0], sets: 3, reps: '6' },       // Clean and Press
      { ...FULL_BODY_EXERCISES[2], sets: 4, reps: '15' },      // KB Swings
      { ...FULL_BODY_EXERCISES[4], sets: 3, reps: '10' },      // Burpees
    ],
    stationWork: ['skierg', 'rowing'],
  },
};
