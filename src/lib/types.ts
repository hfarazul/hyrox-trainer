// Core Hyrox Types

export interface HyroxStation {
  id: string;
  name: string;
  order: number;
  description: string;
  officialRequirement: string;
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

export interface WorkoutSession {
  id: string;
  date: string;
  type: 'full_simulation' | 'station_practice' | 'quick_workout' | 'custom';
  stations: StationResult[];
  totalTime: number;
  notes?: string;
  partial?: boolean; // true if workout was stopped early
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
  duration?: number;
  distance?: number;
  reps?: number;
  notes?: string;
}
