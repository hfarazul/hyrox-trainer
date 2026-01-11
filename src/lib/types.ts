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
  intensity: 'low' | 'medium' | 'high';
  conversionFactor: number;
  videoUrl?: string; // YouTube video URL for exercise demo
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
}

export interface RaceSimulatorConfig {
  workout: GeneratedWorkout;
  type: 'full_simulation' | 'station_practice' | 'quick_workout';
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
}

export interface CompletedProgramWorkout {
  week: number;
  dayOfWeek: number;
  sessionId: string;
  completedAt: string;
}
