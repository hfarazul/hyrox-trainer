import { describe, it, expect } from 'vitest';
import {
  applyIntensityModifier,
  generateMakeupWorkout,
  applyIntensityToSchedule,
  recalculateSchedule,
  isWorkoutAdapted,
  getAdaptationDescription,
} from '@/lib/program-adapter';
import { ScheduledWorkoutExtended } from '@/lib/types';
import { GeneratedProgram, GeneratedProgramWeek } from '@/lib/program-generator';
import { MissedWorkout } from '@/lib/missed-workout-detector';

describe('Program Adapter', () => {
  describe('applyIntensityModifier', () => {
    describe('rest days', () => {
      it('returns rest days unchanged', () => {
        const restWorkout: ScheduledWorkoutExtended = {
          dayOfWeek: 0,
          dayName: 'Sunday',
          type: 'rest',
          estimatedMinutes: 0,
          params: {},
        };

        const result = applyIntensityModifier(restWorkout, 0.7);
        expect(result).toEqual(restWorkout);
      });
    });

    describe('coverage workouts', () => {
      const coverageWorkout: ScheduledWorkoutExtended = {
        dayOfWeek: 6,
        dayName: 'Saturday',
        type: 'coverage',
        estimatedMinutes: 60,
        params: { coverage: 50 },
      };

      it('scales coverage percentage with modifier', () => {
        const easier = applyIntensityModifier(coverageWorkout, 0.8);
        const harder = applyIntensityModifier(coverageWorkout, 1.2);

        expect(easier.params.coverage).toBe(40); // 50 * 0.8
        expect(harder.params.coverage).toBe(60); // 50 * 1.2
      });

      it('scales duration with modifier', () => {
        const easier = applyIntensityModifier(coverageWorkout, 0.8);
        const harder = applyIntensityModifier(coverageWorkout, 1.2);

        expect(easier.estimatedMinutes).toBe(48); // 60 * 0.8
        expect(harder.estimatedMinutes).toBe(72); // 60 * 1.2
      });

      it('clamps coverage to minimum 25', () => {
        const veryEasy = applyIntensityModifier(coverageWorkout, 0.4); // Below range, clamped to 0.7
        expect(veryEasy.params.coverage).toBeGreaterThanOrEqual(25);
      });

      it('clamps coverage to maximum 150', () => {
        const veryHard = applyIntensityModifier({ ...coverageWorkout, params: { coverage: 130 } }, 1.3);
        expect(veryHard.params.coverage).toBeLessThanOrEqual(150);
      });
    });

    describe('run workouts (zone2/tempo)', () => {
      const zone2Workout: ScheduledWorkoutExtended = {
        dayOfWeek: 4,
        dayName: 'Thursday',
        type: 'run',
        estimatedMinutes: 30,
        params: { runType: 'zone2', duration: 30 },
      };

      it('scales duration for zone2 runs', () => {
        const easier = applyIntensityModifier(zone2Workout, 0.8);
        expect(easier.params.duration).toBe(24); // 30 * 0.8
        expect(easier.estimatedMinutes).toBe(24);
      });

      it('scales duration for tempo runs', () => {
        const tempoWorkout: ScheduledWorkoutExtended = {
          ...zone2Workout,
          params: { runType: 'tempo', duration: 35 },
        };

        const harder = applyIntensityModifier(tempoWorkout, 1.2);
        expect(harder.params.duration).toBe(42); // 35 * 1.2
      });

      it('clamps duration to minimum 15', () => {
        const short = applyIntensityModifier({ ...zone2Workout, params: { ...zone2Workout.params, duration: 18 } }, 0.7);
        expect(short.params.duration).toBeGreaterThanOrEqual(15);
      });
    });

    describe('run workouts (intervals)', () => {
      const intervalWorkout: ScheduledWorkoutExtended = {
        dayOfWeek: 2,
        dayName: 'Tuesday',
        type: 'run',
        estimatedMinutes: 40,
        params: {
          runType: 'intervals',
          intervals: { reps: 6, distance: 400, rest: 90 },
        },
      };

      it('scales interval reps', () => {
        const easier = applyIntensityModifier(intervalWorkout, 0.8);
        const harder = applyIntensityModifier(intervalWorkout, 1.2);

        expect(easier.params.intervals?.reps).toBe(5); // 6 * 0.8 rounded
        expect(harder.params.intervals?.reps).toBe(7); // 6 * 1.2 rounded
      });

      it('scales interval distance', () => {
        const easier = applyIntensityModifier(intervalWorkout, 0.8);
        const harder = applyIntensityModifier(intervalWorkout, 1.2);

        expect(easier.params.intervals?.distance).toBe(320); // 400 * 0.8
        expect(harder.params.intervals?.distance).toBe(480); // 400 * 1.2
      });

      it('inversely scales rest (shorter rest when harder)', () => {
        const easier = applyIntensityModifier(intervalWorkout, 0.8);
        const harder = applyIntensityModifier(intervalWorkout, 1.2);

        expect(easier.params.intervals?.rest).toBeGreaterThan(90); // More rest
        expect(harder.params.intervals?.rest).toBeLessThan(90); // Less rest
      });

      it('clamps interval reps to minimum 3', () => {
        const veryEasy = applyIntensityModifier({ ...intervalWorkout, params: { ...intervalWorkout.params, intervals: { reps: 4, distance: 400, rest: 90 } } }, 0.7);
        expect(veryEasy.params.intervals?.reps).toBeGreaterThanOrEqual(3);
      });
    });

    describe('station workouts', () => {
      const stationWorkout: ScheduledWorkoutExtended = {
        dayOfWeek: 2,
        dayName: 'Tuesday',
        type: 'station',
        estimatedMinutes: 35,
        params: { stations: ['skierg', 'rowing'], sets: 2 },
      };

      it('scales sets with modifier', () => {
        const harder = applyIntensityModifier(stationWorkout, 1.3);
        expect(harder.params.sets).toBe(3); // 2 * 1.3 rounded
      });

      it('scales duration with modifier', () => {
        const easier = applyIntensityModifier(stationWorkout, 0.8);
        expect(easier.estimatedMinutes).toBe(28); // 35 * 0.8
      });

      it('clamps sets to minimum 1', () => {
        const veryEasy = applyIntensityModifier(stationWorkout, 0.7);
        expect(veryEasy.params.sets).toBeGreaterThanOrEqual(1);
      });

      it('clamps sets to maximum 3', () => {
        const veryHard = applyIntensityModifier({ ...stationWorkout, params: { ...stationWorkout.params, sets: 3 } }, 1.3);
        expect(veryHard.params.sets).toBeLessThanOrEqual(3);
      });
    });

    describe('strength workouts', () => {
      const strengthWorkout: ScheduledWorkoutExtended = {
        dayOfWeek: 1,
        dayName: 'Monday',
        type: 'strength',
        estimatedMinutes: 45,
        params: {
          strengthFocus: 'lower',
          exercises: [
            { name: 'Squat', sets: 4, reps: '8-10', notes: '' },
            { name: 'Lunges', sets: 3, reps: '20 steps', notes: '' },
            { name: 'Pull-ups', sets: 3, reps: 'max', notes: '' },
          ],
        },
      };

      it('scales exercise sets', () => {
        const easier = applyIntensityModifier(strengthWorkout, 0.8);
        const harder = applyIntensityModifier(strengthWorkout, 1.2);

        expect(easier.params.exercises?.[0].sets).toBe(3); // 4 * 0.8 rounded
        expect(harder.params.exercises?.[0].sets).toBe(5); // 4 * 1.2 rounded
      });

      it('inversely scales rep ranges (more reps when easier)', () => {
        const easier = applyIntensityModifier(strengthWorkout, 0.8);
        const harder = applyIntensityModifier(strengthWorkout, 1.2);

        // Inverse scaling: easier = 2 - 0.8 = 1.2x reps
        // Harder = 2 - 1.2 = 0.8x reps
        expect(easier.params.exercises?.[0].reps).toBe('10-12'); // 8-10 * 1.2
        expect(harder.params.exercises?.[0].reps).toBe('6-8'); // 8-10 * 0.8
      });

      it('scales step-based exercises inversely', () => {
        const easier = applyIntensityModifier(strengthWorkout, 0.8);
        // Inverse: 20 * 1.2 = 24 steps
        expect(easier.params.exercises?.[1].reps).toMatch(/\d+ steps/);
      });

      it('preserves "max" reps unchanged', () => {
        const modified = applyIntensityModifier(strengthWorkout, 0.8);
        expect(modified.params.exercises?.[2].reps).toBe('max');
      });

      it('clamps sets to minimum 2', () => {
        const lowSetWorkout: ScheduledWorkoutExtended = {
          ...strengthWorkout,
          params: {
            ...strengthWorkout.params,
            exercises: [{ name: 'Test', sets: 2, reps: '10', notes: '' }],
          },
        };
        const veryEasy = applyIntensityModifier(lowSetWorkout, 0.7);
        expect(veryEasy.params.exercises?.[0].sets).toBeGreaterThanOrEqual(2);
      });

      it('clamps sets to maximum 5', () => {
        const highSetWorkout: ScheduledWorkoutExtended = {
          ...strengthWorkout,
          params: {
            ...strengthWorkout.params,
            exercises: [{ name: 'Test', sets: 5, reps: '5', notes: '' }],
          },
        };
        const veryHard = applyIntensityModifier(highSetWorkout, 1.3);
        expect(veryHard.params.exercises?.[0].sets).toBeLessThanOrEqual(5);
      });
    });

    describe('full simulation workouts', () => {
      const fullWorkout: ScheduledWorkoutExtended = {
        dayOfWeek: 6,
        dayName: 'Saturday',
        type: 'full',
        estimatedMinutes: 90,
        params: {},
      };

      it('scales duration only', () => {
        const easier = applyIntensityModifier(fullWorkout, 0.8);
        expect(easier.estimatedMinutes).toBe(72); // 90 * 0.8
      });

      it('clamps duration between 60 and 120', () => {
        const veryEasy = applyIntensityModifier(fullWorkout, 0.5);
        const veryHard = applyIntensityModifier(fullWorkout, 1.5);

        expect(veryEasy.estimatedMinutes).toBeGreaterThanOrEqual(60);
        expect(veryHard.estimatedMinutes).toBeLessThanOrEqual(120);
      });
    });

    describe('quick workouts', () => {
      const quickWorkout: ScheduledWorkoutExtended = {
        dayOfWeek: 3,
        dayName: 'Wednesday',
        type: 'quick',
        estimatedMinutes: 25,
        params: { duration: 25 },
      };

      it('scales duration', () => {
        const easier = applyIntensityModifier(quickWorkout, 0.8);
        expect(easier.params.duration).toBe(20); // 25 * 0.8
        expect(easier.estimatedMinutes).toBe(20);
      });

      it('clamps duration between 15 and 45', () => {
        const veryEasy = applyIntensityModifier({ ...quickWorkout, params: { duration: 20 } }, 0.7);
        expect(veryEasy.params.duration).toBeGreaterThanOrEqual(15);
      });
    });

    describe('modifier clamping', () => {
      const workout: ScheduledWorkoutExtended = {
        dayOfWeek: 1,
        dayName: 'Monday',
        type: 'coverage',
        estimatedMinutes: 60,
        params: { coverage: 50 },
      };

      it('clamps modifier below 0.7 to 0.7', () => {
        const result = applyIntensityModifier(workout, 0.5);
        // Coverage should be 50 * 0.7 = 35
        expect(result.params.coverage).toBe(35);
      });

      it('clamps modifier above 1.3 to 1.3', () => {
        const result = applyIntensityModifier(workout, 1.5);
        // Coverage should be 50 * 1.3 = 65
        expect(result.params.coverage).toBe(65);
      });
    });
  });

  describe('generateMakeupWorkout', () => {
    const missedWorkout: MissedWorkout = {
      week: 1,
      dayOfWeek: 2,
      dayName: 'Tuesday',
      workout: {
        dayOfWeek: 2,
        dayName: 'Tuesday',
        type: 'station',
        estimatedMinutes: 40,
        params: { stations: ['skierg'], sets: 2 },
      },
      daysSinceMissed: 2,
      importance: 'medium',
      suggestedAction: 'makeup_condensed',
      impactOnReadiness: -7,
    };

    it('applies 75% factor for 1-3 days late', () => {
      const makeup = generateMakeupWorkout(missedWorkout, 2);
      // With 0.75 modifier, sets: 2 * 0.75 = 1.5 → rounded to 2 (min 1)
      expect(makeup.estimatedMinutes).toBe(30); // 40 * 0.75
    });

    it('applies 50% factor for 4-7 days late (clamped to 0.7)', () => {
      const makeup = generateMakeupWorkout(missedWorkout, 5);
      // Note: 0.5 gets clamped to 0.7 by applyIntensityModifier
      expect(makeup.estimatedMinutes).toBe(28); // 40 * 0.7 (clamped)
      expect(makeup.params.condenseFactor).toBe(0.5); // Original factor preserved
    });

    it('applies 35% factor for 7+ days late (clamped to 0.7)', () => {
      const makeup = generateMakeupWorkout(missedWorkout, 10);
      // Note: 0.35 gets clamped to 0.7 by applyIntensityModifier
      expect(makeup.estimatedMinutes).toBe(28); // 40 * 0.7 (clamped)
      expect(makeup.params.condenseFactor).toBe(0.35); // Original factor preserved
    });

    it('marks workout as makeup', () => {
      const makeup = generateMakeupWorkout(missedWorkout, 2);
      expect(makeup.params.isMakeup).toBe(true);
    });

    it('includes original week and day', () => {
      const makeup = generateMakeupWorkout(missedWorkout, 2);
      expect(makeup.params.originalWeek).toBe(1);
      expect(makeup.params.originalDayOfWeek).toBe(2);
    });

    it('includes condense factor', () => {
      const makeup1 = generateMakeupWorkout(missedWorkout, 2);
      const makeup2 = generateMakeupWorkout(missedWorkout, 5);

      expect(makeup1.params.condenseFactor).toBe(0.75);
      expect(makeup2.params.condenseFactor).toBe(0.5);
    });
  });

  describe('applyIntensityToSchedule', () => {
    const schedule: GeneratedProgramWeek[] = [
      {
        week: 1,
        phase: 'Build',
        theme: 'Week 1',
        workouts: [
          { dayOfWeek: 1, dayName: 'Monday', type: 'strength', estimatedMinutes: 45, params: {} },
          { dayOfWeek: 2, dayName: 'Tuesday', type: 'station', estimatedMinutes: 35, params: { sets: 2 } },
        ],
      },
      {
        week: 2,
        phase: 'Build',
        theme: 'Week 2',
        workouts: [
          { dayOfWeek: 1, dayName: 'Monday', type: 'coverage', estimatedMinutes: 60, params: { coverage: 50 } },
        ],
      },
    ];

    it('applies modifier to all weeks', () => {
      const result = applyIntensityToSchedule(schedule, 0.8);

      expect(result.length).toBe(2);
      expect(result[0].workouts[0].estimatedMinutes).toBe(36); // 45 * 0.8
      expect(result[1].workouts[0].params.coverage).toBe(40); // 50 * 0.8
    });

    it('preserves week metadata', () => {
      const result = applyIntensityToSchedule(schedule, 0.8);

      expect(result[0].week).toBe(1);
      expect(result[0].phase).toBe('Build');
      expect(result[0].theme).toBe('Week 1');
    });
  });

  describe('recalculateSchedule', () => {
    const program: GeneratedProgram = {
      id: 'test-program',
      name: 'Test Program',
      weeks: 2,
      schedule: [
        {
          week: 1,
          phase: 'Build',
          theme: 'Week 1',
          workouts: [
            { dayOfWeek: 1, dayName: 'Monday', type: 'coverage', estimatedMinutes: 60, params: { coverage: 50 } },
          ],
        },
      ],
      personalization: { fitnessLevel: 'intermediate', daysPerWeek: 4 },
    };

    it('applies intensity modifier to program', () => {
      const result = recalculateSchedule(program, [], 0.8);

      expect(result.schedule[0].workouts[0].params.coverage).toBe(40);
    });

    it('preserves program metadata', () => {
      const result = recalculateSchedule(program, [], 0.8);

      expect(result.id).toBe('test-program');
      expect(result.name).toBe('Test Program');
      expect(result.weeks).toBe(2);
      expect(result.personalization).toEqual(program.personalization);
    });
  });

  describe('isWorkoutAdapted', () => {
    const workout: ScheduledWorkoutExtended = {
      dayOfWeek: 1,
      dayName: 'Monday',
      type: 'strength',
      estimatedMinutes: 45,
      params: {},
    };

    it('returns false for modifier of 1.0', () => {
      expect(isWorkoutAdapted(workout, 1.0)).toBe(false);
    });

    it('returns false for modifier very close to 1.0', () => {
      expect(isWorkoutAdapted(workout, 1.005)).toBe(false);
    });

    it('returns true for modifier significantly different from 1.0', () => {
      expect(isWorkoutAdapted(workout, 0.8)).toBe(true);
      expect(isWorkoutAdapted(workout, 1.2)).toBe(true);
    });
  });

  describe('getAdaptationDescription', () => {
    it('returns "Reduced intensity" for very low modifier', () => {
      expect(getAdaptationDescription(0.75)).toBe('Reduced intensity (recovery focus)');
    });

    it('returns "Slightly reduced" for low modifier', () => {
      expect(getAdaptationDescription(0.9)).toBe('Slightly reduced intensity');
    });

    it('returns "Standard intensity" for normal modifier', () => {
      expect(getAdaptationDescription(1.0)).toBe('Standard intensity');
      expect(getAdaptationDescription(1.03)).toBe('Standard intensity');
    });

    it('returns "Slightly increased" for high modifier', () => {
      expect(getAdaptationDescription(1.1)).toBe('Slightly increased intensity');
    });

    it('returns "Increased intensity" for very high modifier', () => {
      expect(getAdaptationDescription(1.25)).toBe('Increased intensity (challenge mode)');
    });
  });
});
