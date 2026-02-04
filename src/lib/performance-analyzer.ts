/**
 * Performance Analyzer
 *
 * Analyzes workout completion data to provide insights, trends, and recommendations.
 * Used to calculate race readiness and suggest intensity adjustments.
 */

export interface CompletedWorkoutData {
  week: number;
  dayOfWeek: number;
  completedAt: string;
  actualDuration?: number | null;
  rpe?: number | null;
  completionStatus: string;
  percentComplete: number;
}

export interface PerformanceAnalysis {
  overallTrend: 'improving' | 'stable' | 'declining';
  recentCompletionRate: number; // 0-100, last 7 days
  overallCompletionRate: number; // 0-100, all time
  averageRPE: number | null;
  fatigueScore: number; // 0-100, higher = more fatigued
  suggestedIntensityModifier: number; // 0.7-1.3
  alerts: PerformanceAlert[];
  recommendations: string[];
}

export interface PerformanceAlert {
  type: 'high_fatigue' | 'low_completion' | 'overtraining' | 'undertrained' | 'inconsistent';
  severity: 'info' | 'warning' | 'critical';
  message: string;
}

export interface RaceReadinessScore {
  score: number; // 0-100
  factors: {
    programCompletion: number;
    keyWorkoutCompletion: number;
    performanceTrend: number;
    weeklyConsistency: number;
    fatigueManagement: number;
  };
  message: string;
}

/**
 * Calculate the number of days between two dates
 */
function daysBetween(date1: Date, date2: Date): number {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.floor(Math.abs((date1.getTime() - date2.getTime()) / oneDay));
}

/**
 * Get workouts from the last N days
 */
function getRecentWorkouts(workouts: CompletedWorkoutData[], days: number): CompletedWorkoutData[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  return workouts.filter(w => new Date(w.completedAt) >= cutoff);
}

/**
 * Calculate average RPE from workouts that have RPE data
 */
function calculateAverageRPE(workouts: CompletedWorkoutData[]): number | null {
  const workoutsWithRPE = workouts.filter(w => w.rpe != null);
  if (workoutsWithRPE.length === 0) return null;

  const sum = workoutsWithRPE.reduce((acc, w) => acc + (w.rpe || 0), 0);
  return Math.round((sum / workoutsWithRPE.length) * 10) / 10;
}

/**
 * Calculate fatigue score based on recent RPE and workout frequency
 * Higher score = more fatigued
 */
function calculateFatigueScore(
  recentWorkouts: CompletedWorkoutData[],
  weeksInProgram: number
): number {
  if (recentWorkouts.length === 0) return 0;

  const avgRPE = calculateAverageRPE(recentWorkouts);
  if (avgRPE === null) return 30; // Default moderate fatigue if no RPE data

  // Base fatigue from RPE (scale 1-10 to 0-60)
  const rpeFatigue = Math.max(0, (avgRPE - 4) * 15);

  // Additional fatigue from high workout frequency in last 3 days
  const last3Days = getRecentWorkouts(recentWorkouts, 3);
  const frequencyFatigue = Math.min(last3Days.length * 10, 30);

  // Reduce fatigue accumulation in early weeks (body adapting)
  const weekModifier = weeksInProgram <= 2 ? 0.7 : 1;

  return Math.min(100, Math.round((rpeFatigue + frequencyFatigue) * weekModifier));
}

/**
 * Determine performance trend based on recent vs earlier RPE and completion
 */
function determinePerformanceTrend(
  workouts: CompletedWorkoutData[]
): 'improving' | 'stable' | 'declining' {
  if (workouts.length < 4) return 'stable';

  const midpoint = Math.floor(workouts.length / 2);
  const earlier = workouts.slice(0, midpoint);
  const recent = workouts.slice(midpoint);

  const earlierRPE = calculateAverageRPE(earlier);
  const recentRPE = calculateAverageRPE(recent);

  const earlierCompletion = earlier.filter(w => w.completionStatus === 'full').length / earlier.length;
  const recentCompletion = recent.filter(w => w.completionStatus === 'full').length / recent.length;

  // If completion is improving and RPE is stable or decreasing = improving
  // If completion is declining or RPE is increasing significantly = declining

  const completionDelta = recentCompletion - earlierCompletion;
  const rpeDelta = (recentRPE || 5) - (earlierRPE || 5);

  if (completionDelta > 0.1 && rpeDelta <= 0.5) return 'improving';
  if (completionDelta < -0.15 || rpeDelta > 1.5) return 'declining';

  return 'stable';
}

/**
 * Calculate suggested intensity modifier based on performance analysis
 */
function calculateIntensityModifier(
  averageRPE: number | null,
  completionRate: number,
  fatigueScore: number
): number {
  let modifier = 1.0;

  // Reduce intensity if completion rate is low
  if (completionRate < 70) modifier -= 0.1;
  else if (completionRate < 50) modifier -= 0.2;

  // Reduce intensity if RPE is consistently high
  if (averageRPE !== null) {
    if (averageRPE > 8) modifier -= 0.1;
    else if (averageRPE < 5 && completionRate > 90) modifier += 0.05;
  }

  // Reduce intensity if fatigue is high
  if (fatigueScore > 70) modifier -= 0.1;
  else if (fatigueScore > 85) modifier -= 0.15;

  // Clamp to valid range
  return Math.max(0.7, Math.min(1.3, Math.round(modifier * 100) / 100));
}

/**
 * Generate alerts based on performance data
 */
function generateAlerts(
  averageRPE: number | null,
  completionRate: number,
  fatigueScore: number,
  recentWorkouts: CompletedWorkoutData[]
): PerformanceAlert[] {
  const alerts: PerformanceAlert[] = [];

  // High fatigue alert
  if (fatigueScore > 70) {
    alerts.push({
      type: 'high_fatigue',
      severity: fatigueScore > 85 ? 'critical' : 'warning',
      message: fatigueScore > 85
        ? 'Very high fatigue detected. Consider taking an extra rest day.'
        : 'Elevated fatigue levels. Focus on recovery and sleep.',
    });
  }

  // Low completion alert
  if (completionRate < 60) {
    alerts.push({
      type: 'low_completion',
      severity: completionRate < 40 ? 'critical' : 'warning',
      message: completionRate < 40
        ? 'Workout completion is very low. Consider adjusting your program.'
        : 'Some workouts are being missed. Try to maintain consistency.',
    });
  }

  // Overtraining warning (high RPE + high fatigue)
  if (averageRPE !== null && averageRPE > 7.5 && fatigueScore > 60) {
    alerts.push({
      type: 'overtraining',
      severity: 'warning',
      message: 'Signs of potential overtraining. Prioritize rest and recovery.',
    });
  }

  // Check for 3+ consecutive high RPE workouts
  const consecutiveHighRPE = recentWorkouts
    .filter(w => w.rpe != null && w.rpe >= 8)
    .length;

  if (consecutiveHighRPE >= 3) {
    alerts.push({
      type: 'overtraining',
      severity: 'critical',
      message: 'Multiple consecutive hard workouts. A deload may be needed.',
    });
  }

  return alerts;
}

/**
 * Generate recommendations based on performance analysis
 */
function generateRecommendations(
  analysis: Omit<PerformanceAnalysis, 'recommendations'>
): string[] {
  const recommendations: string[] = [];

  if (analysis.fatigueScore > 60) {
    recommendations.push('Prioritize 8+ hours of sleep for recovery');
    recommendations.push('Consider light stretching or foam rolling');
  }

  if (analysis.averageRPE !== null && analysis.averageRPE < 5) {
    recommendations.push('Workouts feel easy - consider increasing intensity');
  }

  if (analysis.recentCompletionRate < 70) {
    recommendations.push('Schedule workouts at consistent times to build habit');
  }

  if (analysis.overallTrend === 'improving') {
    recommendations.push('Great progress! Stay consistent with your current approach');
  }

  if (analysis.overallTrend === 'declining') {
    recommendations.push('Focus on completing workouts rather than intensity');
    recommendations.push('Review sleep, nutrition, and stress levels');
  }

  if (analysis.suggestedIntensityModifier < 1) {
    recommendations.push('Intensity has been automatically reduced to aid recovery');
  }

  return recommendations;
}

/**
 * Main function to analyze recent workout performance
 */
export function analyzeRecentPerformance(
  completedWorkouts: CompletedWorkoutData[],
  totalScheduledWorkouts: number,
  weeksInProgram: number
): PerformanceAnalysis {
  // Sort by completion date
  const sorted = [...completedWorkouts].sort(
    (a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
  );

  const recentWorkouts = getRecentWorkouts(sorted, 7);

  // Calculate completion rates
  const overallCompletionRate = totalScheduledWorkouts > 0
    ? Math.round((completedWorkouts.length / totalScheduledWorkouts) * 100)
    : 0;

  // For recent completion, estimate expected workouts (roughly 1 per day)
  const recentExpected = Math.min(7, totalScheduledWorkouts - (completedWorkouts.length - recentWorkouts.length));
  const recentCompletionRate = recentExpected > 0
    ? Math.round((recentWorkouts.length / recentExpected) * 100)
    : 100;

  const averageRPE = calculateAverageRPE(recentWorkouts);
  const fatigueScore = calculateFatigueScore(recentWorkouts, weeksInProgram);
  const overallTrend = determinePerformanceTrend(sorted);
  const suggestedIntensityModifier = calculateIntensityModifier(
    averageRPE,
    recentCompletionRate,
    fatigueScore
  );
  const alerts = generateAlerts(averageRPE, recentCompletionRate, fatigueScore, recentWorkouts);

  const partialAnalysis = {
    overallTrend,
    recentCompletionRate: Math.min(100, recentCompletionRate),
    overallCompletionRate: Math.min(100, overallCompletionRate),
    averageRPE,
    fatigueScore,
    suggestedIntensityModifier,
    alerts,
  };

  return {
    ...partialAnalysis,
    recommendations: generateRecommendations(partialAnalysis),
  };
}

/**
 * Calculate race readiness score (0-100)
 */
export function calculateRaceReadiness(
  completedWorkouts: CompletedWorkoutData[],
  totalScheduledWorkouts: number,
  keyWorkoutsCompleted: number, // full sims, high coverage workouts
  totalKeyWorkouts: number,
  weeksUntilRace: number | null,
  weeksInProgram: number
): RaceReadinessScore {
  // Factor weights
  const weights = {
    programCompletion: 0.30,
    keyWorkoutCompletion: 0.25,
    performanceTrend: 0.20,
    weeklyConsistency: 0.15,
    fatigueManagement: 0.10,
  };

  // Program completion (0-100)
  const programCompletion = totalScheduledWorkouts > 0
    ? Math.round((completedWorkouts.length / totalScheduledWorkouts) * 100)
    : 0;

  // Key workout completion (0-100)
  const keyWorkoutCompletion = totalKeyWorkouts > 0
    ? Math.round((keyWorkoutsCompleted / totalKeyWorkouts) * 100)
    : 100;

  // Performance trend (0-100)
  const sorted = [...completedWorkouts].sort(
    (a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
  );
  const trend = determinePerformanceTrend(sorted);
  const performanceTrend = trend === 'improving' ? 100 : trend === 'stable' ? 75 : 40;

  // Weekly consistency (0-100) - based on completion variance
  const recentWorkouts = getRecentWorkouts(sorted, 14);
  const weeklyConsistency = recentWorkouts.length >= 4 ? 80 : recentWorkouts.length * 20;

  // Fatigue management (0-100) - lower fatigue = better race readiness
  const fatigueScore = calculateFatigueScore(recentWorkouts, weeksInProgram);
  const fatigueManagement = Math.max(0, 100 - fatigueScore);

  const factors = {
    programCompletion,
    keyWorkoutCompletion,
    performanceTrend,
    weeklyConsistency,
    fatigueManagement,
  };

  // Calculate weighted score
  const score = Math.round(
    factors.programCompletion * weights.programCompletion +
    factors.keyWorkoutCompletion * weights.keyWorkoutCompletion +
    factors.performanceTrend * weights.performanceTrend +
    factors.weeklyConsistency * weights.weeklyConsistency +
    factors.fatigueManagement * weights.fatigueManagement
  );

  // Generate message based on score and weeks until race
  let message: string;
  if (weeksUntilRace !== null && weeksUntilRace <= 1) {
    message = score >= 80
      ? 'Race ready! Focus on rest and mental preparation.'
      : score >= 60
      ? 'Race week! Trust your training and stay positive.'
      : 'Race is near. Focus on what you can control.';
  } else if (score >= 90) {
    message = 'Excellent race readiness. Stay consistent!';
  } else if (score >= 75) {
    message = 'On track for race day. Keep up the good work.';
  } else if (score >= 60) {
    message = 'Making progress. Prioritize key workouts.';
  } else {
    message = 'Behind schedule. Focus on consistency over intensity.';
  }

  return { score: Math.min(100, Math.max(0, score)), factors, message };
}

/**
 * Suggest intensity modifier for future workouts
 */
export function suggestIntensityModifier(analysis: PerformanceAnalysis): number {
  return analysis.suggestedIntensityModifier;
}
