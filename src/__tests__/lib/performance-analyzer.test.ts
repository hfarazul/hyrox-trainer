import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  analyzeRecentPerformance,
  calculateRaceReadiness,
  suggestIntensityModifier,
  CompletedWorkoutData,
} from '@/lib/performance-analyzer';

describe('Performance Analyzer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-02-05'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('analyzeRecentPerformance', () => {
    it('returns stable trend with no data', () => {
      const analysis = analyzeRecentPerformance([], 0, 1);
      expect(analysis.overallTrend).toBe('stable');
      expect(analysis.overallCompletionRate).toBe(0);
    });

    it('calculates completion rates correctly', () => {
      const workouts: CompletedWorkoutData[] = [
        { week: 1, dayOfWeek: 1, completedAt: '2025-02-01', completionStatus: 'full', percentComplete: 100 },
        { week: 1, dayOfWeek: 2, completedAt: '2025-02-02', completionStatus: 'full', percentComplete: 100 },
        { week: 1, dayOfWeek: 4, completedAt: '2025-02-04', completionStatus: 'full', percentComplete: 100 },
      ];

      const analysis = analyzeRecentPerformance(workouts, 4, 1);
      expect(analysis.overallCompletionRate).toBe(75); // 3/4
    });

    it('calculates average RPE correctly', () => {
      const workouts: CompletedWorkoutData[] = [
        { week: 1, dayOfWeek: 1, completedAt: '2025-02-01', rpe: 6, completionStatus: 'full', percentComplete: 100 },
        { week: 1, dayOfWeek: 2, completedAt: '2025-02-02', rpe: 8, completionStatus: 'full', percentComplete: 100 },
        { week: 1, dayOfWeek: 3, completedAt: '2025-02-03', rpe: 7, completionStatus: 'full', percentComplete: 100 },
      ];

      const analysis = analyzeRecentPerformance(workouts, 3, 1);
      expect(analysis.averageRPE).toBe(7);
    });

    it('returns null RPE when no RPE data', () => {
      const workouts: CompletedWorkoutData[] = [
        { week: 1, dayOfWeek: 1, completedAt: '2025-02-01', completionStatus: 'full', percentComplete: 100 },
      ];

      const analysis = analyzeRecentPerformance(workouts, 1, 1);
      expect(analysis.averageRPE).toBeNull();
    });

    it('detects improving trend', () => {
      const workouts: CompletedWorkoutData[] = [
        // Earlier: partial completions
        { week: 1, dayOfWeek: 1, completedAt: '2025-01-20', rpe: 8, completionStatus: 'partial', percentComplete: 50 },
        { week: 1, dayOfWeek: 2, completedAt: '2025-01-21', rpe: 9, completionStatus: 'partial', percentComplete: 60 },
        // Recent: full completions with lower RPE
        { week: 2, dayOfWeek: 1, completedAt: '2025-02-01', rpe: 6, completionStatus: 'full', percentComplete: 100 },
        { week: 2, dayOfWeek: 2, completedAt: '2025-02-02', rpe: 6, completionStatus: 'full', percentComplete: 100 },
      ];

      const analysis = analyzeRecentPerformance(workouts, 4, 2);
      expect(analysis.overallTrend).toBe('improving');
    });

    it('detects declining trend', () => {
      const workouts: CompletedWorkoutData[] = [
        // Earlier: good completions
        { week: 1, dayOfWeek: 1, completedAt: '2025-01-20', rpe: 5, completionStatus: 'full', percentComplete: 100 },
        { week: 1, dayOfWeek: 2, completedAt: '2025-01-21', rpe: 5, completionStatus: 'full', percentComplete: 100 },
        // Recent: poor completions with high RPE
        { week: 2, dayOfWeek: 1, completedAt: '2025-02-01', rpe: 9, completionStatus: 'partial', percentComplete: 50 },
        { week: 2, dayOfWeek: 2, completedAt: '2025-02-02', rpe: 9, completionStatus: 'partial', percentComplete: 40 },
      ];

      const analysis = analyzeRecentPerformance(workouts, 4, 2);
      expect(analysis.overallTrend).toBe('declining');
    });

    it('calculates fatigue score based on RPE', () => {
      const highRPEWorkouts: CompletedWorkoutData[] = [
        { week: 1, dayOfWeek: 1, completedAt: '2025-02-03', rpe: 9, completionStatus: 'full', percentComplete: 100 },
        { week: 1, dayOfWeek: 2, completedAt: '2025-02-04', rpe: 9, completionStatus: 'full', percentComplete: 100 },
      ];

      const analysis = analyzeRecentPerformance(highRPEWorkouts, 2, 3);
      expect(analysis.fatigueScore).toBeGreaterThan(50);
    });

    it('reduces fatigue in early weeks', () => {
      const workouts: CompletedWorkoutData[] = [
        { week: 1, dayOfWeek: 1, completedAt: '2025-02-03', rpe: 7, completionStatus: 'full', percentComplete: 100 },
      ];

      const analysisWeek1 = analyzeRecentPerformance(workouts, 1, 1);
      const analysisWeek4 = analyzeRecentPerformance(workouts, 1, 4);

      expect(analysisWeek1.fatigueScore).toBeLessThan(analysisWeek4.fatigueScore);
    });

    describe('alerts', () => {
      it('generates high fatigue alert', () => {
        const workouts: CompletedWorkoutData[] = [
          { week: 1, dayOfWeek: 1, completedAt: '2025-02-02', rpe: 9, completionStatus: 'full', percentComplete: 100 },
          { week: 1, dayOfWeek: 2, completedAt: '2025-02-03', rpe: 10, completionStatus: 'full', percentComplete: 100 },
          { week: 1, dayOfWeek: 3, completedAt: '2025-02-04', rpe: 9, completionStatus: 'full', percentComplete: 100 },
        ];

        const analysis = analyzeRecentPerformance(workouts, 3, 3);
        const fatigueAlert = analysis.alerts.find(a => a.type === 'high_fatigue');
        expect(fatigueAlert).toBeDefined();
      });

      it('generates low completion alert', () => {
        const workouts: CompletedWorkoutData[] = [
          { week: 1, dayOfWeek: 1, completedAt: '2025-02-01', completionStatus: 'full', percentComplete: 100 },
        ];

        const analysis = analyzeRecentPerformance(workouts, 10, 1);
        const lowCompletionAlert = analysis.alerts.find(a => a.type === 'low_completion');
        expect(lowCompletionAlert).toBeDefined();
      });

      it('generates overtraining alert for high RPE streak', () => {
        const workouts: CompletedWorkoutData[] = [
          { week: 1, dayOfWeek: 1, completedAt: '2025-02-02', rpe: 9, completionStatus: 'full', percentComplete: 100 },
          { week: 1, dayOfWeek: 2, completedAt: '2025-02-03', rpe: 8, completionStatus: 'full', percentComplete: 100 },
          { week: 1, dayOfWeek: 3, completedAt: '2025-02-04', rpe: 9, completionStatus: 'full', percentComplete: 100 },
        ];

        const analysis = analyzeRecentPerformance(workouts, 3, 3);
        const overtrainingAlert = analysis.alerts.find(a => a.type === 'overtraining');
        expect(overtrainingAlert).toBeDefined();
      });
    });

    describe('intensity modifier suggestions', () => {
      it('suggests lower intensity for low completion rate', () => {
        const workouts: CompletedWorkoutData[] = [
          { week: 1, dayOfWeek: 1, completedAt: '2025-02-01', completionStatus: 'full', percentComplete: 100 },
        ];

        const analysis = analyzeRecentPerformance(workouts, 10, 1);
        expect(analysis.suggestedIntensityModifier).toBeLessThan(1);
      });

      it('suggests higher intensity when workouts feel easy', () => {
        const workouts: CompletedWorkoutData[] = [
          { week: 1, dayOfWeek: 1, completedAt: '2025-02-01', rpe: 3, completionStatus: 'full', percentComplete: 100 },
          { week: 1, dayOfWeek: 2, completedAt: '2025-02-02', rpe: 4, completionStatus: 'full', percentComplete: 100 },
          { week: 1, dayOfWeek: 3, completedAt: '2025-02-03', rpe: 3, completionStatus: 'full', percentComplete: 100 },
          { week: 1, dayOfWeek: 4, completedAt: '2025-02-04', rpe: 4, completionStatus: 'full', percentComplete: 100 },
        ];

        const analysis = analyzeRecentPerformance(workouts, 4, 1);
        expect(analysis.suggestedIntensityModifier).toBeGreaterThanOrEqual(1);
      });

      it('clamps modifier between 0.7 and 1.3', () => {
        const lowCompletionWorkouts: CompletedWorkoutData[] = [];
        const analysis = analyzeRecentPerformance(lowCompletionWorkouts, 20, 1);
        expect(analysis.suggestedIntensityModifier).toBeGreaterThanOrEqual(0.7);
        expect(analysis.suggestedIntensityModifier).toBeLessThanOrEqual(1.3);
      });
    });

    describe('recommendations', () => {
      it('recommends sleep for high fatigue', () => {
        const workouts: CompletedWorkoutData[] = [
          { week: 1, dayOfWeek: 1, completedAt: '2025-02-02', rpe: 9, completionStatus: 'full', percentComplete: 100 },
          { week: 1, dayOfWeek: 2, completedAt: '2025-02-03', rpe: 9, completionStatus: 'full', percentComplete: 100 },
          { week: 1, dayOfWeek: 3, completedAt: '2025-02-04', rpe: 9, completionStatus: 'full', percentComplete: 100 },
        ];

        const analysis = analyzeRecentPerformance(workouts, 3, 3);
        const sleepRec = analysis.recommendations.find(r => r.includes('sleep'));
        expect(sleepRec).toBeDefined();
      });

      it('recommends consistency for low completion', () => {
        const workouts: CompletedWorkoutData[] = [
          { week: 1, dayOfWeek: 1, completedAt: '2025-02-01', completionStatus: 'full', percentComplete: 100 },
        ];

        const analysis = analyzeRecentPerformance(workouts, 10, 1);
        const consistencyRec = analysis.recommendations.find(r => r.includes('consistent'));
        expect(consistencyRec).toBeDefined();
      });
    });
  });

  describe('calculateRaceReadiness', () => {
    it('returns 0-100 score', () => {
      const workouts: CompletedWorkoutData[] = [
        { week: 1, dayOfWeek: 1, completedAt: '2025-02-01', completionStatus: 'full', percentComplete: 100 },
      ];

      const readiness = calculateRaceReadiness(workouts, 4, 1, 2, 4, 1);
      expect(readiness.score).toBeGreaterThanOrEqual(0);
      expect(readiness.score).toBeLessThanOrEqual(100);
    });

    it('scores higher for high completion rate', () => {
      const highCompletion: CompletedWorkoutData[] = Array(8).fill(null).map((_, i) => ({
        week: 1,
        dayOfWeek: i + 1,
        completedAt: `2025-02-0${i + 1}`,
        completionStatus: 'full',
        percentComplete: 100,
      }));

      const lowCompletion: CompletedWorkoutData[] = [
        { week: 1, dayOfWeek: 1, completedAt: '2025-02-01', completionStatus: 'full', percentComplete: 100 },
      ];

      const highScore = calculateRaceReadiness(highCompletion, 8, 2, 2, 4, 2);
      const lowScore = calculateRaceReadiness(lowCompletion, 8, 0, 2, 4, 2);

      expect(highScore.score).toBeGreaterThan(lowScore.score);
    });

    it('weights key workout completion heavily', () => {
      const withKeyWorkouts = calculateRaceReadiness([], 10, 5, 5, 4, 2);
      const withoutKeyWorkouts = calculateRaceReadiness([], 10, 0, 5, 4, 2);

      expect(withKeyWorkouts.score).toBeGreaterThan(withoutKeyWorkouts.score);
    });

    it('provides encouraging message near race', () => {
      const workouts: CompletedWorkoutData[] = [
        { week: 1, dayOfWeek: 1, completedAt: '2025-02-01', completionStatus: 'full', percentComplete: 100 },
      ];

      const readiness = calculateRaceReadiness(workouts, 4, 3, 4, 1, 8);
      expect(readiness.message).toContain('Race');
    });

    it('returns factor breakdown', () => {
      const workouts: CompletedWorkoutData[] = [];
      const readiness = calculateRaceReadiness(workouts, 10, 2, 4, 4, 1);

      expect(readiness.factors).toHaveProperty('programCompletion');
      expect(readiness.factors).toHaveProperty('keyWorkoutCompletion');
      expect(readiness.factors).toHaveProperty('performanceTrend');
      expect(readiness.factors).toHaveProperty('weeklyConsistency');
      expect(readiness.factors).toHaveProperty('fatigueManagement');
    });
  });

  describe('suggestIntensityModifier', () => {
    it('extracts modifier from analysis', () => {
      const workouts: CompletedWorkoutData[] = [
        { week: 1, dayOfWeek: 1, completedAt: '2025-02-01', rpe: 5, completionStatus: 'full', percentComplete: 100 },
      ];

      const analysis = analyzeRecentPerformance(workouts, 1, 1);
      const modifier = suggestIntensityModifier(analysis);

      expect(modifier).toBe(analysis.suggestedIntensityModifier);
    });
  });
});
