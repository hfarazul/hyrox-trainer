import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  calculateWeeksUntilRace,
  selectProgramTemplate,
  adjustWeekForDaysPerWeek,
  addWeakStationFocus,
  adjustForFitnessLevel,
  generatePersonalizedProgram,
  validatePersonalization,
  getProgramSummary,
  scaleRepString,
  scaleValue,
} from '@/lib/program-generator';
import { PROGRAM_TEMPLATES } from '@/lib/program-templates';

describe('Program Generator', () => {
  describe('calculateWeeksUntilRace', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-01-15'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns null when no race date provided', () => {
      expect(calculateWeeksUntilRace(undefined)).toBeNull();
    });

    it('calculates correct weeks for future race', () => {
      // 8 weeks from Jan 15
      expect(calculateWeeksUntilRace('2025-03-12')).toBe(8);
    });

    it('calculates correct weeks for race 12 weeks away', () => {
      // 12 weeks from Jan 15
      expect(calculateWeeksUntilRace('2025-04-09')).toBe(12);
    });

    it('returns 0 for past race date', () => {
      expect(calculateWeeksUntilRace('2025-01-01')).toBe(0);
    });

    it('handles race date on same day', () => {
      expect(calculateWeeksUntilRace('2025-01-15')).toBe(0);
    });

    it('rounds up partial weeks', () => {
      // 1 day = 1 week (rounds up)
      expect(calculateWeeksUntilRace('2025-01-16')).toBe(1);
    });
  });

  describe('selectProgramTemplate', () => {
    it('returns 12-week template for beginner with no race date', () => {
      const template = selectProgramTemplate(null, 'beginner');
      expect(template.weeks).toBe(12);
    });

    it('returns 8-week template for intermediate with no race date', () => {
      const template = selectProgramTemplate(null, 'intermediate');
      expect(template.weeks).toBe(8);
    });

    it('returns 8-week template for advanced with no race date', () => {
      const template = selectProgramTemplate(null, 'advanced');
      expect(template.weeks).toBe(8);
    });

    it('returns 8-week template when 8 weeks until race', () => {
      const template = selectProgramTemplate(8, 'beginner');
      expect(template.weeks).toBe(8);
    });

    it('returns 8-week template when 10 weeks until race', () => {
      const template = selectProgramTemplate(10, 'intermediate');
      expect(template.weeks).toBe(8);
    });

    it('returns 12-week template when 11 weeks until race', () => {
      const template = selectProgramTemplate(11, 'beginner');
      expect(template.weeks).toBe(12);
    });

    it('returns 12-week template when 14 weeks until race', () => {
      const template = selectProgramTemplate(14, 'intermediate');
      expect(template.weeks).toBe(12);
    });
  });

  describe('adjustWeekForDaysPerWeek', () => {
    const mockWeek = {
      week: 1,
      phase: 'Test',
      theme: 'Test Week',
      workouts: [
        { dayOfWeek: 1, dayName: 'Monday', type: 'strength' as const, estimatedMinutes: 45, params: {} },
        { dayOfWeek: 2, dayName: 'Tuesday', type: 'station' as const, estimatedMinutes: 30, params: {} },
        { dayOfWeek: 3, dayName: 'Wednesday', type: 'rest' as const, estimatedMinutes: 0, params: {} },
        { dayOfWeek: 4, dayName: 'Thursday', type: 'run' as const, estimatedMinutes: 30, params: {} },
        { dayOfWeek: 5, dayName: 'Friday', type: 'quick' as const, estimatedMinutes: 20, params: {} },
        { dayOfWeek: 6, dayName: 'Saturday', type: 'coverage' as const, estimatedMinutes: 60, params: {} },
      ],
    };

    it('keeps 6 workouts for 6 days per week', () => {
      const adjusted = adjustWeekForDaysPerWeek(mockWeek, 6);
      expect(adjusted.workouts.length).toBe(6);
    });

    it('keeps 4 workouts for 4 days per week', () => {
      const adjusted = adjustWeekForDaysPerWeek(mockWeek, 4);
      expect(adjusted.workouts.length).toBe(4);
    });

    it('keeps 3 workouts for 3 days per week', () => {
      const adjusted = adjustWeekForDaysPerWeek(mockWeek, 3);
      expect(adjusted.workouts.length).toBe(3);
    });

    it('prioritizes Saturday (simulation day)', () => {
      const adjusted = adjustWeekForDaysPerWeek(mockWeek, 3);
      const hasSaturday = adjusted.workouts.some(w => w.dayOfWeek === 6);
      expect(hasSaturday).toBe(true);
    });

    it('prioritizes Monday (strength day)', () => {
      const adjusted = adjustWeekForDaysPerWeek(mockWeek, 3);
      const hasMonday = adjusted.workouts.some(w => w.dayOfWeek === 1);
      expect(hasMonday).toBe(true);
    });

    it('preserves week metadata', () => {
      const adjusted = adjustWeekForDaysPerWeek(mockWeek, 4);
      expect(adjusted.week).toBe(1);
      expect(adjusted.phase).toBe('Test');
      expect(adjusted.theme).toBe('Test Week');
    });

    it('sorts workouts by day of week', () => {
      const adjusted = adjustWeekForDaysPerWeek(mockWeek, 4);
      for (let i = 1; i < adjusted.workouts.length; i++) {
        expect(adjusted.workouts[i].dayOfWeek).toBeGreaterThan(
          adjusted.workouts[i - 1].dayOfWeek
        );
      }
    });
  });

  describe('addWeakStationFocus', () => {
    const mockSchedule = [
      {
        week: 1,
        phase: 'Test',
        theme: 'Test',
        workouts: [
          {
            dayOfWeek: 2,
            dayName: 'Tuesday',
            type: 'station' as const,
            estimatedMinutes: 30,
            params: { stations: ['skierg', 'rowing'] },
          },
        ],
      },
      {
        week: 2,
        phase: 'Test',
        theme: 'Test',
        isDeload: true,
        workouts: [
          {
            dayOfWeek: 2,
            dayName: 'Tuesday',
            type: 'station' as const,
            estimatedMinutes: 20,
            params: { stations: ['skierg'] },
          },
        ],
      },
    ];

    it('returns unchanged schedule when no weak stations', () => {
      const result = addWeakStationFocus(mockSchedule, []);
      expect(result).toEqual(mockSchedule);
    });

    it('adds weak station to station practice workouts', () => {
      const result = addWeakStationFocus(mockSchedule, ['burpee_broad_jump']);
      const week1Workout = result[0].workouts[0];
      expect(week1Workout.params.stations).toContain('burpee_broad_jump');
    });

    it('does not modify deload weeks', () => {
      const result = addWeakStationFocus(mockSchedule, ['burpee_broad_jump']);
      const week2Workout = result[1].workouts[0];
      expect(week2Workout.params.stations).not.toContain('burpee_broad_jump');
    });

    it('increases estimated time when adding station', () => {
      const result = addWeakStationFocus(mockSchedule, ['burpee_broad_jump']);
      const week1Workout = result[0].workouts[0];
      expect(week1Workout.estimatedMinutes).toBe(35); // 30 + 5
    });

    it('rotates through weak stations across weeks', () => {
      const extendedSchedule = [
        ...mockSchedule,
        {
          week: 3,
          phase: 'Test',
          theme: 'Test',
          workouts: [
            {
              dayOfWeek: 2,
              dayName: 'Tuesday',
              type: 'station' as const,
              estimatedMinutes: 30,
              params: { stations: ['skierg'] },
            },
          ],
        },
      ];

      const result = addWeakStationFocus(extendedSchedule, ['burpee_broad_jump', 'wall_balls']);
      const week1Stations = result[0].workouts[0].params.stations;
      const week3Stations = result[2].workouts[0].params.stations;

      // Week 1 should add first weak station, week 3 should add second
      expect(week1Stations).toContain('burpee_broad_jump');
      expect(week3Stations).toContain('wall_balls');
    });
  });

  describe('adjustForFitnessLevel', () => {
    const mockSchedule = [
      {
        week: 1,
        phase: 'Test',
        theme: 'Test',
        workouts: [
          {
            dayOfWeek: 6,
            dayName: 'Saturday',
            type: 'coverage' as const,
            estimatedMinutes: 60,
            params: { coverage: 75 },
          },
          {
            dayOfWeek: 5,
            dayName: 'Friday',
            type: 'run' as const,
            estimatedMinutes: 30,
            params: { runType: 'intervals' as const, duration: 30, intervals: { reps: 6, distance: 400, rest: 90 } },
          },
        ],
      },
    ];

    it('returns unchanged schedule for intermediate', () => {
      const result = adjustForFitnessLevel(mockSchedule, 'intermediate');
      expect(result[0].workouts[0].params.coverage).toBe(75);
    });

    it('reduces coverage for beginners', () => {
      const result = adjustForFitnessLevel(mockSchedule, 'beginner');
      expect(result[0].workouts[0].params.coverage).toBe(50); // 75 - 25
    });

    it('reduces interval reps for beginners', () => {
      const result = adjustForFitnessLevel(mockSchedule, 'beginner');
      expect(result[0].workouts[1].params.intervals?.reps).toBe(4); // 6 - 2
    });

    it('increases coverage for advanced', () => {
      const result = adjustForFitnessLevel(mockSchedule, 'advanced');
      expect(result[0].workouts[0].params.coverage).toBe(100); // 75 + 25
    });

    it('increases interval reps for advanced', () => {
      const result = adjustForFitnessLevel(mockSchedule, 'advanced');
      expect(result[0].workouts[1].params.intervals?.reps).toBe(8); // 6 + 2
    });

    it('caps coverage at 150 for advanced', () => {
      const highCoverageSchedule = [
        {
          week: 1,
          phase: 'Test',
          theme: 'Test',
          workouts: [
            {
              dayOfWeek: 6,
              dayName: 'Saturday',
              type: 'coverage' as const,
              estimatedMinutes: 90,
              params: { coverage: 140 },
            },
          ],
        },
      ];
      const result = adjustForFitnessLevel(highCoverageSchedule, 'advanced');
      expect(result[0].workouts[0].params.coverage).toBe(150);
    });

    it('floors coverage at 25 for beginners', () => {
      const lowCoverageSchedule = [
        {
          week: 1,
          phase: 'Test',
          theme: 'Test',
          workouts: [
            {
              dayOfWeek: 6,
              dayName: 'Saturday',
              type: 'coverage' as const,
              estimatedMinutes: 30,
              params: { coverage: 25 },
            },
          ],
        },
      ];
      const result = adjustForFitnessLevel(lowCoverageSchedule, 'beginner');
      expect(result[0].workouts[0].params.coverage).toBe(25);
    });

    // NEW TESTS: Interval distance and rest scaling
    it('scales interval distance for beginners', () => {
      const result = adjustForFitnessLevel(mockSchedule, 'beginner');
      expect(result[0].workouts[1].params.intervals?.distance).toBe(320); // 400 * 0.8
    });

    it('scales interval rest for beginners', () => {
      const result = adjustForFitnessLevel(mockSchedule, 'beginner');
      expect(result[0].workouts[1].params.intervals?.rest).toBe(113); // 90 * 1.25 rounded
    });

    it('scales interval distance for advanced', () => {
      const result = adjustForFitnessLevel(mockSchedule, 'advanced');
      expect(result[0].workouts[1].params.intervals?.distance).toBe(480); // 400 * 1.2
    });

    it('scales interval rest for advanced', () => {
      const result = adjustForFitnessLevel(mockSchedule, 'advanced');
      expect(result[0].workouts[1].params.intervals?.rest).toBe(72); // 90 * 0.8
    });

    // NEW TESTS: Zone2/Tempo run scaling
    describe('zone2/tempo run scaling', () => {
      const runSchedule = [
        {
          week: 1,
          phase: 'Test',
          theme: 'Test',
          workouts: [
            {
              dayOfWeek: 1,
              dayName: 'Monday',
              type: 'run' as const,
              estimatedMinutes: 30,
              params: { runType: 'zone2' as const, duration: 30 },
            },
            {
              dayOfWeek: 4,
              dayName: 'Thursday',
              type: 'run' as const,
              estimatedMinutes: 35,
              params: { runType: 'tempo' as const, duration: 35 },
            },
          ],
        },
      ];

      it('reduces zone2 duration for beginners', () => {
        const result = adjustForFitnessLevel(runSchedule, 'beginner');
        expect(result[0].workouts[0].params.duration).toBe(24); // 30 * 0.8
        expect(result[0].workouts[0].estimatedMinutes).toBe(24);
      });

      it('reduces tempo duration for beginners', () => {
        const result = adjustForFitnessLevel(runSchedule, 'beginner');
        expect(result[0].workouts[1].params.duration).toBe(28); // 35 * 0.8
      });

      it('increases zone2 duration for advanced', () => {
        const result = adjustForFitnessLevel(runSchedule, 'advanced');
        expect(result[0].workouts[0].params.duration).toBe(36); // 30 * 1.2
      });

      it('increases tempo duration for advanced', () => {
        const result = adjustForFitnessLevel(runSchedule, 'advanced');
        expect(result[0].workouts[1].params.duration).toBe(42); // 35 * 1.2
      });

      it('enforces minimum duration of 15 minutes', () => {
        const shortRunSchedule = [
          {
            week: 1,
            phase: 'Test',
            theme: 'Test',
            workouts: [
              {
                dayOfWeek: 1,
                dayName: 'Monday',
                type: 'run' as const,
                estimatedMinutes: 15,
                params: { runType: 'zone2' as const, duration: 15 },
              },
            ],
          },
        ];
        const result = adjustForFitnessLevel(shortRunSchedule, 'beginner');
        expect(result[0].workouts[0].params.duration).toBe(15); // Min 15, not 12
      });
    });

    // NEW TESTS: Station practice scaling
    describe('station practice scaling', () => {
      const stationSchedule = [
        {
          week: 1,
          phase: 'Test',
          theme: 'Test',
          workouts: [
            {
              dayOfWeek: 2,
              dayName: 'Tuesday',
              type: 'station' as const,
              estimatedMinutes: 30,
              params: { stations: ['skierg', 'rowing'], sets: 2 },
            },
          ],
        },
      ];

      it('scales sets for beginners', () => {
        const result = adjustForFitnessLevel(stationSchedule, 'beginner');
        expect(result[0].workouts[0].params.sets).toBe(2); // 2 * 0.75 = 1.5 rounds to 2
      });

      it('scales sets for advanced', () => {
        const result = adjustForFitnessLevel(stationSchedule, 'advanced');
        expect(result[0].workouts[0].params.sets).toBe(3); // 2 * 1.25 = 2.5 rounds to 3
      });

      it('reduces duration for beginners', () => {
        const result = adjustForFitnessLevel(stationSchedule, 'beginner');
        expect(result[0].workouts[0].estimatedMinutes).toBe(24); // 30 * 0.8
      });

      it('increases duration for advanced', () => {
        const result = adjustForFitnessLevel(stationSchedule, 'advanced');
        expect(result[0].workouts[0].estimatedMinutes).toBe(35); // 30 * 1.15 rounded
      });

      it('enforces minimum 1 set', () => {
        const singleSetSchedule = [
          {
            week: 1,
            phase: 'Test',
            theme: 'Test',
            workouts: [
              {
                dayOfWeek: 2,
                dayName: 'Tuesday',
                type: 'station' as const,
                estimatedMinutes: 20,
                params: { stations: ['skierg'], sets: 1 },
              },
            ],
          },
        ];
        const result = adjustForFitnessLevel(singleSetSchedule, 'beginner');
        expect(result[0].workouts[0].params.sets).toBe(1); // Min 1
      });

      it('enforces maximum 3 sets', () => {
        const multiSetSchedule = [
          {
            week: 1,
            phase: 'Test',
            theme: 'Test',
            workouts: [
              {
                dayOfWeek: 2,
                dayName: 'Tuesday',
                type: 'station' as const,
                estimatedMinutes: 45,
                params: { stations: ['skierg'], sets: 3 },
              },
            ],
          },
        ];
        const result = adjustForFitnessLevel(multiSetSchedule, 'advanced');
        expect(result[0].workouts[0].params.sets).toBe(3); // Max 3, not 4
      });
    });

    // NEW TESTS: Strength workout scaling
    describe('strength workout scaling', () => {
      const strengthSchedule = [
        {
          week: 1,
          phase: 'Test',
          theme: 'Test',
          workouts: [
            {
              dayOfWeek: 1,
              dayName: 'Monday',
              type: 'strength' as const,
              estimatedMinutes: 45,
              params: {
                strengthFocus: 'lower' as const,
                exercises: [
                  { name: 'Back Squat', sets: 4, reps: '8-10', notes: '' },
                  { name: 'Pull-ups', sets: 3, reps: 'max', notes: '' },
                  { name: 'Lunges', sets: 3, reps: '20 steps', notes: '' },
                  { name: 'Single Leg', sets: 3, reps: '8 each side', notes: '' },
                ],
                stationWork: ['sled_push'],
              },
            },
          ],
        },
      ];

      it('reduces sets for beginners', () => {
        const result = adjustForFitnessLevel(strengthSchedule, 'beginner');
        const exercises = result[0].workouts[0].params.exercises!;
        expect(exercises[0].sets).toBe(3); // 4 * 0.75 = 3
        expect(exercises[1].sets).toBe(2); // 3 * 0.75 = 2.25 rounds to 2
      });

      it('increases sets for advanced', () => {
        const result = adjustForFitnessLevel(strengthSchedule, 'advanced');
        const exercises = result[0].workouts[0].params.exercises!;
        expect(exercises[0].sets).toBe(5); // 4 * 1.25 = 5
        expect(exercises[1].sets).toBe(4); // 3 * 1.25 = 3.75 rounds to 4
      });

      it('increases reps for beginners (range format)', () => {
        const result = adjustForFitnessLevel(strengthSchedule, 'beginner');
        const exercises = result[0].workouts[0].params.exercises!;
        expect(exercises[0].reps).toBe('10-12'); // 8-10 + 2
      });

      it('decreases reps for advanced (range format)', () => {
        const result = adjustForFitnessLevel(strengthSchedule, 'advanced');
        const exercises = result[0].workouts[0].params.exercises!;
        expect(exercises[0].reps).toBe('6-8'); // 8-10 - 2
      });

      it('preserves "max" reps unchanged', () => {
        const result = adjustForFitnessLevel(strengthSchedule, 'beginner');
        const exercises = result[0].workouts[0].params.exercises!;
        expect(exercises[1].reps).toBe('max');
      });

      it('scales step patterns', () => {
        const result = adjustForFitnessLevel(strengthSchedule, 'beginner');
        const exercises = result[0].workouts[0].params.exercises!;
        expect(exercises[2].reps).toBe('22 steps'); // 20 + 2
      });

      it('scales "each side" patterns', () => {
        const result = adjustForFitnessLevel(strengthSchedule, 'beginner');
        const exercises = result[0].workouts[0].params.exercises!;
        expect(exercises[3].reps).toBe('10 each side'); // 8 + 2
      });

      it('reduces duration for beginners', () => {
        const result = adjustForFitnessLevel(strengthSchedule, 'beginner');
        expect(result[0].workouts[0].estimatedMinutes).toBe(38); // 45 * 0.85 rounded
      });

      it('increases duration for advanced', () => {
        const result = adjustForFitnessLevel(strengthSchedule, 'advanced');
        expect(result[0].workouts[0].estimatedMinutes).toBe(52); // 45 * 1.15 rounded
      });

      it('enforces minimum 2 sets', () => {
        const lowSetSchedule = [
          {
            week: 1,
            phase: 'Test',
            theme: 'Test',
            workouts: [
              {
                dayOfWeek: 1,
                dayName: 'Monday',
                type: 'strength' as const,
                estimatedMinutes: 30,
                params: {
                  strengthFocus: 'lower' as const,
                  exercises: [{ name: 'Squat', sets: 2, reps: '10', notes: '' }],
                },
              },
            ],
          },
        ];
        const result = adjustForFitnessLevel(lowSetSchedule, 'beginner');
        expect(result[0].workouts[0].params.exercises![0].sets).toBe(2); // Min 2
      });

      it('enforces maximum 5 sets', () => {
        const highSetSchedule = [
          {
            week: 1,
            phase: 'Test',
            theme: 'Test',
            workouts: [
              {
                dayOfWeek: 1,
                dayName: 'Monday',
                type: 'strength' as const,
                estimatedMinutes: 60,
                params: {
                  strengthFocus: 'lower' as const,
                  exercises: [{ name: 'Squat', sets: 5, reps: '5', notes: '' }],
                },
              },
            ],
          },
        ];
        const result = adjustForFitnessLevel(highSetSchedule, 'advanced');
        expect(result[0].workouts[0].params.exercises![0].sets).toBe(5); // Max 5, not 6
      });
    });
  });

  describe('scaleRepString', () => {
    it('returns unchanged for intermediate', () => {
      expect(scaleRepString('8-10', 'intermediate')).toBe('8-10');
      expect(scaleRepString('max', 'intermediate')).toBe('max');
      expect(scaleRepString('20 steps', 'intermediate')).toBe('20 steps');
    });

    describe('range format (X-Y)', () => {
      it('increases reps for beginners', () => {
        expect(scaleRepString('8-10', 'beginner')).toBe('10-12');
        expect(scaleRepString('5-8', 'beginner')).toBe('7-10');
      });

      it('decreases reps for advanced', () => {
        expect(scaleRepString('8-10', 'advanced')).toBe('6-8');
        expect(scaleRepString('10-12', 'advanced')).toBe('8-10');
      });

      it('enforces minimum 4 reps', () => {
        expect(scaleRepString('5-6', 'advanced')).toBe('4-6'); // 5-2=3 -> 4, 6-2=4
      });
    });

    describe('single number format', () => {
      it('increases for beginners', () => {
        expect(scaleRepString('10', 'beginner')).toBe('12');
        expect(scaleRepString('8', 'beginner')).toBe('10');
      });

      it('decreases for advanced', () => {
        expect(scaleRepString('10', 'advanced')).toBe('8');
        expect(scaleRepString('8', 'advanced')).toBe('6');
      });

      it('enforces minimum 4', () => {
        expect(scaleRepString('5', 'advanced')).toBe('4'); // 5-2=3 -> 4
      });
    });

    describe('special formats', () => {
      it('preserves "max" unchanged', () => {
        expect(scaleRepString('max', 'beginner')).toBe('max');
        expect(scaleRepString('max', 'advanced')).toBe('max');
        expect(scaleRepString('MAX', 'beginner')).toBe('MAX');
      });

      it('scales step patterns', () => {
        expect(scaleRepString('20 steps', 'beginner')).toBe('22 steps');
        expect(scaleRepString('20 steps', 'advanced')).toBe('18 steps');
      });

      it('scales "each side" patterns', () => {
        expect(scaleRepString('8 each side', 'beginner')).toBe('10 each side');
        expect(scaleRepString('8 each side', 'advanced')).toBe('6 each side');
      });

      it('enforces minimum 4 for step patterns', () => {
        expect(scaleRepString('5 steps', 'advanced')).toBe('4 steps'); // 5-2=3 -> 4
      });

      it('returns unknown formats unchanged', () => {
        expect(scaleRepString('AMRAP', 'beginner')).toBe('AMRAP');
        expect(scaleRepString('to failure', 'advanced')).toBe('to failure');
      });
    });
  });

  describe('scaleValue', () => {
    it('returns unchanged for intermediate', () => {
      expect(scaleValue(100, 'intermediate', 0.8, 1.2)).toBe(100);
    });

    it('applies beginner multiplier', () => {
      expect(scaleValue(100, 'beginner', 0.8, 1.2)).toBe(80);
      expect(scaleValue(45, 'beginner', 0.75, 1.25)).toBe(34); // 33.75 rounds to 34
    });

    it('applies advanced multiplier', () => {
      expect(scaleValue(100, 'advanced', 0.8, 1.2)).toBe(120);
      expect(scaleValue(45, 'advanced', 0.75, 1.25)).toBe(56); // 56.25 rounds to 56
    });

    it('enforces minimum value', () => {
      expect(scaleValue(10, 'beginner', 0.5, 1.5, 8)).toBe(8); // 5 < 8, use 8
    });

    it('enforces maximum value', () => {
      expect(scaleValue(100, 'advanced', 0.8, 1.5, undefined, 120)).toBe(120); // 150 > 120, use 120
    });

    it('enforces both min and max', () => {
      expect(scaleValue(100, 'beginner', 0.5, 1.5, 60, 80)).toBe(60); // 50 < 60, use 60
      expect(scaleValue(100, 'advanced', 0.5, 1.5, 60, 120)).toBe(120); // 150 > 120, use 120
    });

    it('rounds to nearest integer', () => {
      expect(scaleValue(33, 'beginner', 0.8, 1.2)).toBe(26); // 26.4 rounds to 26
      expect(scaleValue(33, 'advanced', 0.8, 1.2)).toBe(40); // 39.6 rounds to 40
    });
  });

  describe('generatePersonalizedProgram', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-01-15'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('generates 8-week program for intermediate with 8 weeks until race', () => {
      const program = generatePersonalizedProgram({
        raceDate: '2025-03-12',
        fitnessLevel: 'intermediate',
        daysPerWeek: 4,
      });

      expect(program.weeks).toBe(8);
      expect(program.schedule.length).toBe(8);
    });

    it('generates 12-week program for beginner with no race date', () => {
      const program = generatePersonalizedProgram({
        fitnessLevel: 'beginner',
        daysPerWeek: 4,
      });

      expect(program.weeks).toBe(12);
      expect(program.schedule.length).toBe(12);
    });

    it('adjusts workouts to match days per week', () => {
      const program = generatePersonalizedProgram({
        fitnessLevel: 'intermediate',
        daysPerWeek: 3,
      });

      for (const week of program.schedule) {
        expect(week.workouts.length).toBeLessThanOrEqual(3);
      }
    });

    it('includes personalization in output', () => {
      const personalization = {
        raceDate: '2025-04-01',
        fitnessLevel: 'advanced' as const,
        daysPerWeek: 5 as const,
        weakStations: ['wall_balls', 'burpee_broad_jump'],
      };

      const program = generatePersonalizedProgram(personalization);
      expect(program.personalization).toEqual(personalization);
    });

    it('generates unique program ID', () => {
      const program1 = generatePersonalizedProgram({
        fitnessLevel: 'intermediate',
        daysPerWeek: 4,
      });

      const program2 = generatePersonalizedProgram({
        fitnessLevel: 'intermediate',
        daysPerWeek: 4,
      });

      expect(program1.id).not.toBe(program2.id);
    });

    it('uses default weak stations when not provided', () => {
      const program = generatePersonalizedProgram({
        fitnessLevel: 'intermediate',
        daysPerWeek: 4,
      });

      // Check that some station workouts have default weak stations added
      const hasWeakStationWork = program.schedule.some(week =>
        week.workouts.some(
          w =>
            w.type === 'station' &&
            w.params.stations?.some(s =>
              ['burpee_broad_jump', 'sandbag_lunges', 'farmers_carry', 'wall_balls'].includes(s)
            )
        )
      );
      expect(hasWeakStationWork).toBe(true);
    });
  });

  describe('validatePersonalization', () => {
    it('validates correct input', () => {
      const result = validatePersonalization({
        fitnessLevel: 'intermediate',
        daysPerWeek: 4,
      });
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('requires fitness level', () => {
      const result = validatePersonalization({
        daysPerWeek: 4,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Fitness level is required');
    });

    it('validates fitness level values', () => {
      const result = validatePersonalization({
        fitnessLevel: 'super' as any,
        daysPerWeek: 4,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid fitness level');
    });

    it('requires days per week', () => {
      const result = validatePersonalization({
        fitnessLevel: 'intermediate',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Days per week is required');
    });

    it('validates days per week range', () => {
      const result = validatePersonalization({
        fitnessLevel: 'intermediate',
        daysPerWeek: 7 as any,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Days per week must be between 3 and 6');
    });

    it('validates race date is in future', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-01-15'));

      const result = validatePersonalization({
        fitnessLevel: 'intermediate',
        daysPerWeek: 4,
        raceDate: '2025-01-01',
      });

      vi.useRealTimers();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Race date must be in the future');
    });

    it('allows valid future race date', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-01-15'));

      const result = validatePersonalization({
        fitnessLevel: 'intermediate',
        daysPerWeek: 4,
        raceDate: '2025-04-01',
      });

      vi.useRealTimers();

      expect(result.valid).toBe(true);
    });
  });

  describe('getProgramSummary', () => {
    it('counts all workout types correctly', () => {
      const program = generatePersonalizedProgram({
        fitnessLevel: 'intermediate',
        daysPerWeek: 6,
      });

      const summary = getProgramSummary(program);

      expect(summary.totalWorkouts).toBeGreaterThan(0);
      expect(summary.runWorkouts).toBeGreaterThan(0);
      expect(summary.strengthWorkouts).toBeGreaterThan(0);
      expect(summary.stationWorkouts).toBeGreaterThan(0);
      expect(summary.coverageWorkouts).toBeGreaterThan(0);

      // Total should equal sum of all types
      const sumOfTypes =
        summary.runWorkouts +
        summary.strengthWorkouts +
        summary.stationWorkouts +
        summary.coverageWorkouts +
        summary.fullSimulations +
        summary.restDays;

      expect(summary.totalWorkouts).toBe(sumOfTypes);
    });
  });
});
