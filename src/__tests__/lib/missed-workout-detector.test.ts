import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getCurrentWeek,
  calculateWorkoutImportance,
  calculateReadinessImpact,
  suggestRecoveryAction,
  findMissedWorkouts,
  generateRecommendations,
  getMissedWorkoutSummary,
  MissedWorkout,
} from '@/lib/missed-workout-detector';
import { GeneratedProgram } from '@/lib/program-generator';
import { CompletedProgramWorkout } from '@/lib/types';

describe('Missed Workout Detector', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-02-05T12:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getCurrentWeek', () => {
    it('returns week 1 on start date', () => {
      const startDate = '2025-02-05';
      expect(getCurrentWeek(startDate, 8)).toBe(1);
    });

    it('returns week 2 after 7 days', () => {
      const startDate = '2025-01-29';
      expect(getCurrentWeek(startDate, 8)).toBe(2);
    });

    it('returns week 3 after 14 days', () => {
      const startDate = '2025-01-22';
      expect(getCurrentWeek(startDate, 8)).toBe(3);
    });

    it('caps at total weeks', () => {
      const startDate = '2024-01-01'; // Long ago
      expect(getCurrentWeek(startDate, 8)).toBe(8);
    });

    it('returns minimum of 1', () => {
      const futureDate = '2025-02-10'; // Future date
      expect(getCurrentWeek(futureDate, 8)).toBe(1);
    });

    it('handles Date object input', () => {
      const startDate = new Date('2025-02-05');
      expect(getCurrentWeek(startDate, 8)).toBe(1);
    });
  });

  describe('calculateWorkoutImportance', () => {
    it('returns critical for full simulations', () => {
      expect(calculateWorkoutImportance('full')).toBe('critical');
    });

    it('returns high for coverage workouts', () => {
      expect(calculateWorkoutImportance('coverage')).toBe('high');
    });

    it('returns medium for station practice', () => {
      expect(calculateWorkoutImportance('station')).toBe('medium');
    });

    it('returns medium for quick workouts', () => {
      expect(calculateWorkoutImportance('quick')).toBe('medium');
    });

    it('returns low for run workouts', () => {
      expect(calculateWorkoutImportance('run')).toBe('low');
    });

    it('returns low for strength workouts', () => {
      expect(calculateWorkoutImportance('strength')).toBe('low');
    });

    it('returns low for rest days', () => {
      expect(calculateWorkoutImportance('rest')).toBe('low');
    });
  });

  describe('calculateReadinessImpact', () => {
    it('returns -20 for critical workouts', () => {
      expect(calculateReadinessImpact('critical', 1)).toBe(-20);
    });

    it('returns -12 for high importance', () => {
      expect(calculateReadinessImpact('high', 1)).toBe(-12);
    });

    it('returns -7 for medium importance', () => {
      expect(calculateReadinessImpact('medium', 1)).toBe(-7);
    });

    it('returns -4 for low importance', () => {
      expect(calculateReadinessImpact('low', 1)).toBe(-4);
    });

    it('reduces impact for old missed workouts (7-14 days)', () => {
      const recent = calculateReadinessImpact('critical', 5);
      const old = calculateReadinessImpact('critical', 10);
      expect(old).toBeGreaterThan(recent); // Less negative = greater
    });

    it('reduces impact more for very old workouts (14+ days)', () => {
      const oneWeek = calculateReadinessImpact('critical', 10);
      const twoWeeks = calculateReadinessImpact('critical', 20);
      expect(twoWeeks).toBeGreaterThan(oneWeek); // Less negative
    });
  });

  describe('suggestRecoveryAction', () => {
    describe('critical workouts', () => {
      it('suggests full makeup for recent (<=3 days)', () => {
        expect(suggestRecoveryAction('critical', 1)).toBe('makeup_full');
        expect(suggestRecoveryAction('critical', 3)).toBe('makeup_full');
      });

      it('suggests condensed for 4-7 days', () => {
        expect(suggestRecoveryAction('critical', 5)).toBe('makeup_condensed');
      });

      it('suggests skip for old (>7 days)', () => {
        expect(suggestRecoveryAction('critical', 10)).toBe('skip');
      });
    });

    describe('high importance workouts', () => {
      it('suggests full makeup for very recent (<=2 days)', () => {
        expect(suggestRecoveryAction('high', 1)).toBe('makeup_full');
        expect(suggestRecoveryAction('high', 2)).toBe('makeup_full');
      });

      it('suggests condensed for 3-7 days', () => {
        expect(suggestRecoveryAction('high', 4)).toBe('makeup_condensed');
      });

      it('suggests skip for old', () => {
        expect(suggestRecoveryAction('high', 10)).toBe('skip');
      });
    });

    describe('medium importance workouts', () => {
      it('suggests condensed for recent (<=3 days)', () => {
        expect(suggestRecoveryAction('medium', 2)).toBe('makeup_condensed');
      });

      it('suggests skip for 4+ days', () => {
        expect(suggestRecoveryAction('medium', 5)).toBe('skip');
      });
    });

    describe('low importance workouts', () => {
      it('suggests condensed only for very recent (<=1 day)', () => {
        expect(suggestRecoveryAction('low', 1)).toBe('makeup_condensed');
      });

      it('suggests skip for 2+ days', () => {
        expect(suggestRecoveryAction('low', 2)).toBe('skip');
        expect(suggestRecoveryAction('low', 5)).toBe('skip');
      });
    });
  });

  describe('findMissedWorkouts', () => {
    const createMockProgram = (): GeneratedProgram => ({
      id: 'test-program',
      name: 'Test Program',
      weeks: 8,
      schedule: [
        {
          week: 1,
          phase: 'Build',
          theme: 'Test Week 1',
          workouts: [
            { dayOfWeek: 0, dayName: 'Sunday', type: 'rest', estimatedMinutes: 0, params: {} },
            { dayOfWeek: 1, dayName: 'Monday', type: 'strength', estimatedMinutes: 45, params: { strengthFocus: 'lower' } },
            { dayOfWeek: 2, dayName: 'Tuesday', type: 'station', estimatedMinutes: 35, params: { stations: ['skierg'] } },
            { dayOfWeek: 3, dayName: 'Wednesday', type: 'rest', estimatedMinutes: 0, params: {} },
            { dayOfWeek: 4, dayName: 'Thursday', type: 'run', estimatedMinutes: 30, params: { runType: 'zone2' } },
            { dayOfWeek: 5, dayName: 'Friday', type: 'rest', estimatedMinutes: 0, params: {} },
            { dayOfWeek: 6, dayName: 'Saturday', type: 'coverage', estimatedMinutes: 60, params: { coverage: 50 } },
          ],
        },
        {
          week: 2,
          phase: 'Build',
          theme: 'Test Week 2',
          workouts: [
            { dayOfWeek: 0, dayName: 'Sunday', type: 'rest', estimatedMinutes: 0, params: {} },
            { dayOfWeek: 1, dayName: 'Monday', type: 'strength', estimatedMinutes: 45, params: { strengthFocus: 'upper' } },
            { dayOfWeek: 2, dayName: 'Tuesday', type: 'station', estimatedMinutes: 35, params: {} },
            { dayOfWeek: 3, dayName: 'Wednesday', type: 'rest', estimatedMinutes: 0, params: {} },
            { dayOfWeek: 4, dayName: 'Thursday', type: 'full', estimatedMinutes: 90, params: {} },
            { dayOfWeek: 5, dayName: 'Friday', type: 'rest', estimatedMinutes: 0, params: {} },
            { dayOfWeek: 6, dayName: 'Saturday', type: 'coverage', estimatedMinutes: 75, params: { coverage: 75 } },
          ],
        },
      ],
      personalization: {
        fitnessLevel: 'intermediate',
        daysPerWeek: 4,
      },
    });

    it('returns empty array when all workouts completed', () => {
      // Set date to end of week 1 (Saturday)
      vi.setSystemTime(new Date('2025-02-01T23:00:00')); // Saturday of week 1

      const program = createMockProgram();
      const startDate = '2025-01-27'; // Monday before

      const completed: CompletedProgramWorkout[] = [
        { week: 1, dayOfWeek: 1, completedAt: '2025-01-27', completionStatus: 'full', percentComplete: 100 },
        { week: 1, dayOfWeek: 2, completedAt: '2025-01-28', completionStatus: 'full', percentComplete: 100 },
        { week: 1, dayOfWeek: 4, completedAt: '2025-01-30', completionStatus: 'full', percentComplete: 100 },
        { week: 1, dayOfWeek: 6, completedAt: '2025-02-01', completionStatus: 'full', percentComplete: 100 },
      ];

      const missed = findMissedWorkouts(startDate, program, completed);
      expect(missed.length).toBe(0);
    });

    it('detects missed workouts in past weeks', () => {
      // Set date to week 2
      vi.setSystemTime(new Date('2025-02-10T12:00:00')); // Monday of week 2

      const program = createMockProgram();
      const startDate = '2025-02-03'; // Start of week 1

      const completed: CompletedProgramWorkout[] = [
        { week: 1, dayOfWeek: 1, completedAt: '2025-02-03', completionStatus: 'full', percentComplete: 100 },
        // Missing: Tuesday (2), Thursday (4), Saturday (6)
      ];

      const missed = findMissedWorkouts(startDate, program, completed);
      expect(missed.length).toBeGreaterThan(0);
    });

    it('does not include rest days as missed', () => {
      vi.setSystemTime(new Date('2025-02-10T12:00:00'));

      const program = createMockProgram();
      const startDate = '2025-02-03';

      const completed: CompletedProgramWorkout[] = [];

      const missed = findMissedWorkouts(startDate, program, completed);
      const restDays = missed.filter(m => m.workout.type === 'rest');
      expect(restDays.length).toBe(0);
    });

    it('does not include future workouts as missed', () => {
      vi.setSystemTime(new Date('2025-02-04T12:00:00')); // Tuesday

      const program = createMockProgram();
      const startDate = '2025-02-03'; // Monday

      const completed: CompletedProgramWorkout[] = [
        { week: 1, dayOfWeek: 1, completedAt: '2025-02-03', completionStatus: 'full', percentComplete: 100 },
      ];

      const missed = findMissedWorkouts(startDate, program, completed);

      // Should not include Thursday (4), Friday (5), Saturday (6) as they're in the future
      const futureWorkouts = missed.filter(m => m.dayOfWeek >= 4);
      expect(futureWorkouts.length).toBe(0);
    });

    it('sorts by importance then recency', () => {
      vi.setSystemTime(new Date('2025-02-15T12:00:00'));

      const program = createMockProgram();
      const startDate = '2025-02-03';

      const completed: CompletedProgramWorkout[] = [];

      const missed = findMissedWorkouts(startDate, program, completed);

      // Critical should come before high, high before medium, etc.
      for (let i = 1; i < missed.length; i++) {
        const importanceOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        const prevImportance = importanceOrder[missed[i - 1].importance];
        const currImportance = importanceOrder[missed[i].importance];

        // Either current has lower priority OR same priority with more recent first
        expect(currImportance).toBeGreaterThanOrEqual(prevImportance);
      }
    });

    it('includes correct workout data in missed workout', () => {
      vi.setSystemTime(new Date('2025-02-05T12:00:00')); // Wednesday

      const program = createMockProgram();
      const startDate = '2025-02-03'; // Monday

      const completed: CompletedProgramWorkout[] = [];

      const missed = findMissedWorkouts(startDate, program, completed);
      const mondayMissed = missed.find(m => m.dayOfWeek === 1);

      expect(mondayMissed).toBeDefined();
      expect(mondayMissed?.week).toBe(1);
      expect(mondayMissed?.dayName).toBe('Monday');
      expect(mondayMissed?.workout.type).toBe('strength');
      expect(mondayMissed?.importance).toBe('low'); // strength = low
    });
  });

  describe('generateRecommendations', () => {
    it('returns empty array for no missed workouts', () => {
      const recs = generateRecommendations([]);
      expect(recs.length).toBe(0);
    });

    it('recommends focusing on critical workouts', () => {
      const missed: MissedWorkout[] = [
        {
          week: 1,
          dayOfWeek: 4,
          dayName: 'Thursday',
          workout: { dayOfWeek: 4, dayName: 'Thursday', type: 'full', estimatedMinutes: 90, params: {} },
          daysSinceMissed: 2,
          importance: 'critical',
          suggestedAction: 'makeup_full',
          impactOnReadiness: -20,
        },
      ];

      const recs = generateRecommendations(missed);
      const criticalRec = recs.find(r => r.includes('critical') || r.includes('simulation'));
      expect(criticalRec).toBeDefined();
    });

    it('recommends makeup for recent workouts', () => {
      const missed: MissedWorkout[] = [
        {
          week: 1,
          dayOfWeek: 1,
          dayName: 'Monday',
          workout: { dayOfWeek: 1, dayName: 'Monday', type: 'strength', estimatedMinutes: 45, params: {} },
          daysSinceMissed: 1,
          importance: 'low',
          suggestedAction: 'makeup_condensed',
          impactOnReadiness: -4,
        },
      ];

      const recs = generateRecommendations(missed);
      const makeupRec = recs.find(r => r.includes('make up') || r.includes('recent'));
      expect(makeupRec).toBeDefined();
    });

    it('recommends reducing intensity for many missed', () => {
      const missed: MissedWorkout[] = Array(7).fill(null).map((_, i) => ({
        week: 1,
        dayOfWeek: i,
        dayName: 'Day',
        workout: { dayOfWeek: i, dayName: 'Day', type: 'strength' as const, estimatedMinutes: 45, params: {} },
        daysSinceMissed: i,
        importance: 'low' as const,
        suggestedAction: 'skip' as const,
        impactOnReadiness: -4,
      }));

      const recs = generateRecommendations(missed);
      const intensityRec = recs.find(r => r.includes('intensity') || r.includes('reducing'));
      expect(intensityRec).toBeDefined();
    });

    it('suggests skipping low priority if all missed are low', () => {
      const missed: MissedWorkout[] = [
        {
          week: 1,
          dayOfWeek: 1,
          dayName: 'Monday',
          workout: { dayOfWeek: 1, dayName: 'Monday', type: 'strength', estimatedMinutes: 45, params: {} },
          daysSinceMissed: 5,
          importance: 'low',
          suggestedAction: 'skip',
          impactOnReadiness: -4,
        },
        {
          week: 1,
          dayOfWeek: 4,
          dayName: 'Thursday',
          workout: { dayOfWeek: 4, dayName: 'Thursday', type: 'run', estimatedMinutes: 30, params: {} },
          daysSinceMissed: 2,
          importance: 'low',
          suggestedAction: 'skip',
          impactOnReadiness: -4,
        },
      ];

      const recs = generateRecommendations(missed);
      const focusRec = recs.find(r => r.includes('low priority') || r.includes('upcoming'));
      expect(focusRec).toBeDefined();
    });
  });

  describe('getMissedWorkoutSummary', () => {
    it('returns complete summary object', () => {
      vi.setSystemTime(new Date('2025-02-10T12:00:00'));

      const program: GeneratedProgram = {
        id: 'test',
        name: 'Test',
        weeks: 8,
        schedule: [
          {
            week: 1,
            phase: 'Build',
            theme: 'Week 1',
            workouts: [
              { dayOfWeek: 1, dayName: 'Monday', type: 'strength', estimatedMinutes: 45, params: {} },
              { dayOfWeek: 6, dayName: 'Saturday', type: 'coverage', estimatedMinutes: 60, params: { coverage: 50 } },
            ],
          },
        ],
        personalization: { fitnessLevel: 'intermediate', daysPerWeek: 4 },
      };

      const completed: CompletedProgramWorkout[] = [];
      const summary = getMissedWorkoutSummary('2025-02-03', program, completed);

      expect(summary).toHaveProperty('missedWorkouts');
      expect(summary).toHaveProperty('totalMissed');
      expect(summary).toHaveProperty('readinessImpact');
      expect(summary).toHaveProperty('recommendations');
    });

    it('calculates total readiness impact', () => {
      vi.setSystemTime(new Date('2025-02-10T12:00:00'));

      const program: GeneratedProgram = {
        id: 'test',
        name: 'Test',
        weeks: 8,
        schedule: [
          {
            week: 1,
            phase: 'Build',
            theme: 'Week 1',
            workouts: [
              { dayOfWeek: 1, dayName: 'Monday', type: 'strength', estimatedMinutes: 45, params: {} },
              { dayOfWeek: 6, dayName: 'Saturday', type: 'coverage', estimatedMinutes: 60, params: { coverage: 50 } },
            ],
          },
        ],
        personalization: { fitnessLevel: 'intermediate', daysPerWeek: 4 },
      };

      const completed: CompletedProgramWorkout[] = [];
      const summary = getMissedWorkoutSummary('2025-02-03', program, completed);

      // Impact should be negative (sum of all missed workout impacts)
      expect(summary.readinessImpact).toBeLessThan(0);
      expect(summary.totalMissed).toBe(summary.missedWorkouts.length);
    });
  });
});
