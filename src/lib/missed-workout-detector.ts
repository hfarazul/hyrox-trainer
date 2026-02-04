import { ScheduledWorkoutExtended, CompletedProgramWorkout, ScheduledWorkoutTypeExtended } from './types';
import { GeneratedProgram } from './program-generator';

export interface MissedWorkout {
  week: number;
  dayOfWeek: number;
  dayName: string;
  workout: ScheduledWorkoutExtended;
  daysSinceMissed: number;
  importance: 'critical' | 'high' | 'medium' | 'low';
  suggestedAction: 'skip' | 'makeup_condensed' | 'makeup_full';
  impactOnReadiness: number; // Negative points impact
}

export interface MissedWorkoutSummary {
  missedWorkouts: MissedWorkout[];
  totalMissed: number;
  readinessImpact: number;
  recommendations: string[];
}

/**
 * Calculate current week in program based on start date
 */
export function getCurrentWeek(startDate: string | Date, totalWeeks: number): number {
  const start = new Date(startDate);
  const now = new Date();

  // Normalize to start of day
  start.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);

  const diffTime = now.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const week = Math.floor(diffDays / 7) + 1;

  return Math.max(1, Math.min(week, totalWeeks));
}

/**
 * Get the date for a specific week/day in the program
 */
function getDateForWorkout(startDate: string | Date, week: number, dayOfWeek: number): Date {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  // Calculate days from start: (week-1)*7 gives the start of that week
  // then add days to get to the right day of week
  // Adjust for the start day of week
  const startDayOfWeek = start.getDay();
  const daysFromStart = (week - 1) * 7 + (dayOfWeek - startDayOfWeek + 7) % 7;

  // If we're in week 1 and the day is before the start day, it's actually in that same week
  if (week === 1 && dayOfWeek < startDayOfWeek) {
    // This day hasn't happened yet in week 1
    return new Date(start.getTime() + (dayOfWeek - startDayOfWeek + 7) * 24 * 60 * 60 * 1000);
  }

  const workoutDate = new Date(start.getTime() + daysFromStart * 24 * 60 * 60 * 1000);
  return workoutDate;
}

/**
 * Calculate days since a workout was missed
 */
function calculateDaysSinceMissed(startDate: string | Date, week: number, dayOfWeek: number): number {
  const workoutDate = getDateForWorkout(startDate, week, dayOfWeek);
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const diffTime = now.getTime() - workoutDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
}

/**
 * Determine workout importance based on type
 * Full simulations are most critical, strength/runs are least
 */
export function calculateWorkoutImportance(
  workoutType: ScheduledWorkoutTypeExtended
): 'critical' | 'high' | 'medium' | 'low' {
  switch (workoutType) {
    case 'full':
      return 'critical';
    case 'coverage':
      return 'high';
    case 'station':
    case 'quick':
      return 'medium';
    case 'run':
    case 'strength':
      return 'low';
    default:
      return 'low';
  }
}

/**
 * Calculate race readiness impact for a missed workout
 */
export function calculateReadinessImpact(
  importance: 'critical' | 'high' | 'medium' | 'low',
  daysSinceMissed: number
): number {
  // Base impact by importance
  const baseImpact: Record<string, number> = {
    critical: -20,
    high: -12,
    medium: -7,
    low: -4,
  };

  let impact = baseImpact[importance];

  // Reduce impact slightly if it was long ago (user has had time to recover)
  if (daysSinceMissed > 14) {
    impact = Math.round(impact * 0.5);
  } else if (daysSinceMissed > 7) {
    impact = Math.round(impact * 0.75);
  }

  return impact;
}

/**
 * Suggest recovery action based on workout importance and days since missed
 */
export function suggestRecoveryAction(
  importance: 'critical' | 'high' | 'medium' | 'low',
  daysSinceMissed: number
): 'skip' | 'makeup_condensed' | 'makeup_full' {
  // If too old, suggest skip
  if (daysSinceMissed > 7) {
    return 'skip';
  }

  // Critical workouts should always be made up if possible
  if (importance === 'critical') {
    return daysSinceMissed <= 3 ? 'makeup_full' : 'makeup_condensed';
  }

  // High importance: full makeup if recent, condensed otherwise
  if (importance === 'high') {
    return daysSinceMissed <= 2 ? 'makeup_full' : 'makeup_condensed';
  }

  // Medium importance: condensed if recent, skip if old
  if (importance === 'medium') {
    return daysSinceMissed <= 3 ? 'makeup_condensed' : 'skip';
  }

  // Low importance: skip unless very recent
  return daysSinceMissed <= 1 ? 'makeup_condensed' : 'skip';
}

/**
 * Find all missed workouts in a program
 */
export function findMissedWorkouts(
  startDate: string | Date,
  programData: GeneratedProgram,
  completedWorkouts: CompletedProgramWorkout[]
): MissedWorkout[] {
  const missedWorkouts: MissedWorkout[] = [];
  const currentWeek = getCurrentWeek(startDate, programData.weeks);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayDayOfWeek = today.getDay();

  // Create a Set of completed workout keys for fast lookup
  const completedKeys = new Set(
    completedWorkouts.map(cw => `${cw.week}-${cw.dayOfWeek}`)
  );

  // Iterate through all weeks up to and including current week
  for (const weekSchedule of programData.schedule) {
    if (weekSchedule.week > currentWeek) continue;

    for (const workout of weekSchedule.workouts) {
      // Skip rest days
      if (workout.type === 'rest') continue;

      // For current week, only check days before today
      if (weekSchedule.week === currentWeek && workout.dayOfWeek >= todayDayOfWeek) {
        continue;
      }

      // Check if this workout was completed
      const key = `${weekSchedule.week}-${workout.dayOfWeek}`;
      if (completedKeys.has(key)) {
        continue;
      }

      // This workout was missed
      const daysSinceMissed = calculateDaysSinceMissed(startDate, weekSchedule.week, workout.dayOfWeek);
      const importance = calculateWorkoutImportance(workout.type);
      const suggestedAction = suggestRecoveryAction(importance, daysSinceMissed);
      const impactOnReadiness = calculateReadinessImpact(importance, daysSinceMissed);

      missedWorkouts.push({
        week: weekSchedule.week,
        dayOfWeek: workout.dayOfWeek,
        dayName: workout.dayName,
        workout,
        daysSinceMissed,
        importance,
        suggestedAction,
        impactOnReadiness,
      });
    }
  }

  // Sort by importance (critical first) then by recency (most recent first)
  const importanceOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  missedWorkouts.sort((a, b) => {
    const importanceDiff = importanceOrder[a.importance] - importanceOrder[b.importance];
    if (importanceDiff !== 0) return importanceDiff;
    return a.daysSinceMissed - b.daysSinceMissed;
  });

  return missedWorkouts;
}

/**
 * Generate recommendations based on missed workouts
 */
export function generateRecommendations(missedWorkouts: MissedWorkout[]): string[] {
  const recommendations: string[] = [];

  if (missedWorkouts.length === 0) {
    return recommendations;
  }

  const criticalMissed = missedWorkouts.filter(m => m.importance === 'critical');
  const highMissed = missedWorkouts.filter(m => m.importance === 'high');
  const recentMissed = missedWorkouts.filter(m => m.daysSinceMissed <= 3);

  if (criticalMissed.length > 0) {
    recommendations.push(
      `You have ${criticalMissed.length} critical workout${criticalMissed.length > 1 ? 's' : ''} (full simulations) missed. These are essential for race preparation.`
    );
  }

  if (highMissed.length > 0) {
    recommendations.push(
      `${highMissed.length} race coverage workout${highMissed.length > 1 ? 's' : ''} missed. Consider doing condensed versions to maintain fitness.`
    );
  }

  if (recentMissed.length > 0 && recentMissed.length <= 3) {
    recommendations.push(
      'You can still make up recent workouts. Focus on the most important ones first.'
    );
  }

  if (missedWorkouts.length > 5) {
    recommendations.push(
      'Many workouts missed. Consider reducing program intensity and focusing on consistency.'
    );
  }

  if (missedWorkouts.every(m => m.importance === 'low')) {
    recommendations.push(
      'Missed workouts are low priority. Focus on upcoming key sessions instead.'
    );
  }

  return recommendations;
}

/**
 * Get a complete summary of missed workouts
 */
export function getMissedWorkoutSummary(
  startDate: string | Date,
  programData: GeneratedProgram,
  completedWorkouts: CompletedProgramWorkout[]
): MissedWorkoutSummary {
  const missedWorkouts = findMissedWorkouts(startDate, programData, completedWorkouts);
  const totalMissed = missedWorkouts.length;
  const readinessImpact = missedWorkouts.reduce((sum, m) => sum + m.impactOnReadiness, 0);
  const recommendations = generateRecommendations(missedWorkouts);

  return {
    missedWorkouts,
    totalMissed,
    readinessImpact,
    recommendations,
  };
}
