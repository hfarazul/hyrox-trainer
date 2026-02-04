// Core Hyrox Types

export interface HyroxStation {
  id: string;
  name: string;
  order: number;
  description: string;
  officialRequirement: string;
  videoUrl?: string; // YouTube video URL for exercise demo
  weights: {
    menOpen: string;
    menPro: string;
    womenOpen: string;
    womenPro: string;
  };
  alternatives: Alternative[];
  muscleGroups: string[];
  tips: string[];
}

export interface Alternative {
  name: string;
  description: string;
  equipmentNeeded: string[];
  intensity: 'beginner' | 'intermediate' | 'advanced';
  conversionFactor: number;
  videoUrl?: string; // YouTube video URL for exercise demo
  baseValue?: number; // Base value at 100% coverage (e.g., 100 for "100 reps")
  unit?: string; // Unit type (e.g., "reps", "m", "s", "cal")
}

export interface Equipment {
  id: string;
  name: string;
  category: 'cardio' | 'weights' | 'bodyweight' | 'resistance' | 'other';
}

export interface UserEquipment {
  equipmentId: string;
  available: boolean;
  weight?: number;
}

export type PerformanceRanking = 'elite' | 'fast' | 'good' | 'solid' | 'finish';

export interface WorkoutSession {
  id: string;
  date: string;
  type: 'full_simulation' | 'station_practice' | 'quick_workout' | 'custom';
  stations: StationResult[];
  totalTime: number;
  notes?: string;
  partial?: boolean; // true if workout was stopped early
  ranking?: PerformanceRanking;
  isPR?: boolean; // true if this was a personal record
  estimatedDuration?: number; // expected workout duration in minutes
  gymMode?: boolean; // true if workout was generated without runs
}

export interface RaceSimulatorConfig {
  workout: GeneratedWorkout;
  type: 'full_simulation' | 'station_practice' | 'quick_workout';
  gymMode?: boolean; // true if workout was generated without runs
}

export interface StationResult {
  stationId: string;
  alternativeUsed?: string;
  timeSeconds: number;
  completed: boolean;
  notes?: string;
}

export interface RaceGoal {
  targetTime: number;
  division: 'men_open' | 'men_pro' | 'women_open' | 'women_pro';
  fiveKTime: number;
  experience: 'beginner' | 'intermediate' | 'advanced';
}

export interface PacingPlan {
  totalTarget: number;
  runPace: number;
  stationTargets: { stationId: string; targetTime: number }[];
  roxZoneTime: number;
}

export interface GeneratedWorkout {
  id: string;
  name: string;
  duration: number;
  difficulty: 'easy' | 'medium' | 'hard';
  warmup: Exercise[];
  mainWorkout: WorkoutBlock[];
  cooldown: Exercise[];
}

export interface Exercise {
  name: string;
  duration?: number;
  reps?: number;
  sets?: number;
  notes?: string;
}

export interface WorkoutBlock {
  type: 'run' | 'station' | 'rest';
  stationId?: string;
  alternativeName?: string;
  allAlternatives?: Alternative[];  // All available alternatives for dropdown selection
  videoUrl?: string; // YouTube video URL for exercise demo
  duration?: number;
  distance?: number;
  reps?: number;
  notes?: string;
}

// Training Program Types

export interface TrainingProgram {
  id: string;
  name: string;
  description: string;
  weeks: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  workoutsPerWeek: number;
  schedule: ProgramWeek[];
}

export interface ProgramWeek {
  week: number;
  theme: string;
  workouts: ScheduledWorkout[];
}

export type ScheduledWorkoutType = 'quick' | 'station' | 'coverage' | 'full' | 'rest';

export interface ScheduledWorkout {
  dayOfWeek: number;  // 0=Sun, 1=Mon, 2=Tue, etc.
  dayName: string;
  type: ScheduledWorkoutType;
  params: {
    duration?: number;
    focus?: 'cardio' | 'strength' | 'mixed';
    coverage?: number;
    stations?: string[];
    sets?: number;
  };
  estimatedMinutes: number;
}

export interface UserProgram {
  id: string;
  programId: string;
  startDate: string;
  completedWorkouts: CompletedProgramWorkout[];
  programData?: string | unknown;  // JSON string or parsed object for personalized programs
}

export interface CompletedProgramWorkout {
  week: number;
  dayOfWeek: number;
  sessionId: string;
  completedAt: string;
  // Performance tracking fields
  actualDuration?: number | null;
  rpe?: number | null;
  completionStatus?: string; // 'full' | 'partial' | 'skipped'
  percentComplete?: number;
}

// Personalized Program Types

export interface ProgramPersonalization {
  raceDate?: string;  // ISO date string, optional
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced';
  daysPerWeek: 3 | 4 | 5 | 6;
  weakStations?: string[];  // Station IDs to focus on
  targetTime?: number;  // Target race time in minutes
}

// New Workout Types for Programs

export type ScheduledWorkoutTypeExtended =
  | 'quick' | 'station' | 'coverage' | 'full' | 'rest'  // Existing
  | 'run' | 'strength';  // New

export interface RunWorkoutParams {
  runType: 'zone2' | 'tempo' | 'intervals';
  duration: number;  // minutes
  targetPace?: string;  // e.g., "5:30-6:00/km"
  hrZone?: string;  // e.g., "65-75% max HR"
  intervals?: {
    reps: number;
    distance: number;  // meters
    rest: number;  // seconds
  };
  notes?: string;
}

export interface StrengthExercise {
  name: string;
  sets: number;
  reps: string;  // e.g., "8-10" or "5x5"
  notes?: string;
  videoUrl?: string;
}

export interface StrengthWorkoutParams {
  focus: 'lower' | 'upper' | 'full';
  exercises: StrengthExercise[];
  stationWork?: string[];  // Station IDs for hybrid work
  notes?: string;
}

// Extended ScheduledWorkout for new types
export interface ScheduledWorkoutExtended {
  dayOfWeek: number;
  dayName: string;
  type: ScheduledWorkoutTypeExtended;
  estimatedMinutes: number;
  params: {
    // Existing params
    duration?: number;
    focus?: 'cardio' | 'strength' | 'mixed';
    coverage?: number;
    stations?: string[];
    sets?: number;
    // New params for run/strength
    runType?: 'zone2' | 'tempo' | 'intervals';
    targetPace?: string;
    hrZone?: string;
    intervals?: {
      reps: number;
      distance: number;
      rest: number;
    };
    strengthFocus?: 'lower' | 'upper' | 'full';
    exercises?: StrengthExercise[];
    stationWork?: string[];
    // Makeup workout params
    isMakeup?: boolean;
    originalWeek?: number;
    originalDayOfWeek?: number;
    condenseFactor?: number;
  };
}

// Extended UserProgram with personalization
export interface UserProgramExtended extends UserProgram {
  raceDate?: string;
  fitnessLevel?: 'beginner' | 'intermediate' | 'advanced';
  daysPerWeek?: number;
  weakStations?: string[];
  programData?: string;  // JSON string of generated schedule
}
