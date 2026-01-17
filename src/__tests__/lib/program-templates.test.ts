import { describe, it, expect } from 'vitest';
import {
  PROGRAM_TEMPLATES,
  DEFAULT_WEAK_STATIONS,
  getTemplateById,
  getTemplateForWeeks,
  getExtendedWorkoutTypeLabel,
  getExtendedWorkoutTypeIcon,
  ProgramWeekTemplate,
} from '@/lib/program-templates';

describe('Program Templates', () => {
  describe('PROGRAM_TEMPLATES structure', () => {
    it('has both 8-week and 12-week templates', () => {
      expect(PROGRAM_TEMPLATES.length).toBe(2);
      expect(PROGRAM_TEMPLATES.some(t => t.weeks === 8)).toBe(true);
      expect(PROGRAM_TEMPLATES.some(t => t.weeks === 12)).toBe(true);
    });

    it('each template has required fields', () => {
      for (const template of PROGRAM_TEMPLATES) {
        expect(template.id).toBeDefined();
        expect(template.name).toBeDefined();
        expect(template.description).toBeDefined();
        expect(template.weeks).toBeGreaterThan(0);
        expect(template.targetLevel).toMatch(/^(beginner|intermediate|advanced)$/);
        expect(template.defaultDaysPerWeek).toBeGreaterThanOrEqual(3);
        expect(template.defaultDaysPerWeek).toBeLessThanOrEqual(6);
        expect(Array.isArray(template.schedule)).toBe(true);
      }
    });

    it('8-week template has 8 weeks of schedule', () => {
      const eightWeek = PROGRAM_TEMPLATES.find(t => t.weeks === 8);
      expect(eightWeek?.schedule.length).toBe(8);
    });

    it('12-week template has 12 weeks of schedule', () => {
      const twelveWeek = PROGRAM_TEMPLATES.find(t => t.weeks === 12);
      expect(twelveWeek?.schedule.length).toBe(12);
    });
  });

  describe('Week structure', () => {
    it('each week has phase, theme, and workouts', () => {
      for (const template of PROGRAM_TEMPLATES) {
        for (const week of template.schedule) {
          expect(week.week).toBeGreaterThan(0);
          expect(week.phase).toBeDefined();
          expect(week.theme).toBeDefined();
          expect(Array.isArray(week.workouts)).toBe(true);
          expect(week.workouts.length).toBeGreaterThan(0);
        }
      }
    });

    it('weeks are numbered sequentially', () => {
      for (const template of PROGRAM_TEMPLATES) {
        for (let i = 0; i < template.schedule.length; i++) {
          expect(template.schedule[i].week).toBe(i + 1);
        }
      }
    });

    it('deload weeks are marked correctly', () => {
      for (const template of PROGRAM_TEMPLATES) {
        const deloadWeeks = template.schedule.filter(w => w.isDeload);
        expect(deloadWeeks.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Workout structure', () => {
    it('each workout has required fields', () => {
      for (const template of PROGRAM_TEMPLATES) {
        for (const week of template.schedule) {
          for (const workout of week.workouts) {
            expect(workout.dayOfWeek).toBeGreaterThanOrEqual(0);
            expect(workout.dayOfWeek).toBeLessThanOrEqual(6);
            expect(workout.dayName).toBeDefined();
            expect(workout.type).toBeDefined();
            expect(typeof workout.estimatedMinutes).toBe('number');
            expect(workout.params).toBeDefined();
          }
        }
      }
    });

    it('includes new workout types (run and strength)', () => {
      let hasRunWorkout = false;
      let hasStrengthWorkout = false;

      for (const template of PROGRAM_TEMPLATES) {
        for (const week of template.schedule) {
          for (const workout of week.workouts) {
            if (workout.type === 'run') hasRunWorkout = true;
            if (workout.type === 'strength') hasStrengthWorkout = true;
          }
        }
      }

      expect(hasRunWorkout).toBe(true);
      expect(hasStrengthWorkout).toBe(true);
    });

    it('run workouts have runType and duration', () => {
      for (const template of PROGRAM_TEMPLATES) {
        for (const week of template.schedule) {
          for (const workout of week.workouts) {
            if (workout.type === 'run') {
              expect(workout.params.runType).toMatch(/^(zone2|tempo|intervals)$/);
              expect(workout.params.duration).toBeGreaterThan(0);
            }
          }
        }
      }
    });

    it('interval runs have interval params', () => {
      for (const template of PROGRAM_TEMPLATES) {
        for (const week of template.schedule) {
          for (const workout of week.workouts) {
            if (workout.type === 'run' && workout.params.runType === 'intervals') {
              expect(workout.params.intervals).toBeDefined();
              expect(workout.params.intervals?.reps).toBeGreaterThan(0);
              expect(workout.params.intervals?.distance).toBeGreaterThan(0);
              expect(workout.params.intervals?.rest).toBeGreaterThan(0);
            }
          }
        }
      }
    });

    it('strength workouts have focus and exercises', () => {
      for (const template of PROGRAM_TEMPLATES) {
        for (const week of template.schedule) {
          for (const workout of week.workouts) {
            if (workout.type === 'strength') {
              expect(workout.params.strengthFocus).toMatch(/^(lower|upper|full)$/);
              expect(Array.isArray(workout.params.exercises)).toBe(true);
              expect(workout.params.exercises?.length).toBeGreaterThan(0);
            }
          }
        }
      }
    });

    it('station workouts have stations array', () => {
      for (const template of PROGRAM_TEMPLATES) {
        for (const week of template.schedule) {
          for (const workout of week.workouts) {
            if (workout.type === 'station') {
              expect(Array.isArray(workout.params.stations)).toBe(true);
              expect(workout.params.stations?.length).toBeGreaterThan(0);
            }
          }
        }
      }
    });

    it('coverage workouts have coverage percentage', () => {
      for (const template of PROGRAM_TEMPLATES) {
        for (const week of template.schedule) {
          for (const workout of week.workouts) {
            if (workout.type === 'coverage') {
              expect(workout.params.coverage).toBeGreaterThan(0);
              expect(workout.params.coverage).toBeLessThanOrEqual(150);
            }
          }
        }
      }
    });
  });

  describe('getTemplateById', () => {
    it('returns template for valid ID', () => {
      const template = getTemplateById('personalized-8-week');
      expect(template).toBeDefined();
      expect(template?.weeks).toBe(8);
    });

    it('returns undefined for invalid ID', () => {
      const template = getTemplateById('non-existent');
      expect(template).toBeUndefined();
    });
  });

  describe('getTemplateForWeeks', () => {
    it('returns 8-week template for <= 10 weeks until race', () => {
      expect(getTemplateForWeeks(8).weeks).toBe(8);
      expect(getTemplateForWeeks(10).weeks).toBe(8);
    });

    it('returns 12-week template for > 10 weeks until race', () => {
      expect(getTemplateForWeeks(11).weeks).toBe(12);
      expect(getTemplateForWeeks(14).weeks).toBe(12);
    });
  });

  describe('DEFAULT_WEAK_STATIONS', () => {
    it('contains the common difficult stations', () => {
      expect(DEFAULT_WEAK_STATIONS).toContain('burpee_broad_jump');
      expect(DEFAULT_WEAK_STATIONS).toContain('sandbag_lunges');
      expect(DEFAULT_WEAK_STATIONS).toContain('farmers_carry');
      expect(DEFAULT_WEAK_STATIONS).toContain('wall_balls');
    });
  });

  describe('getExtendedWorkoutTypeLabel', () => {
    it('returns correct labels for all types', () => {
      expect(getExtendedWorkoutTypeLabel('run')).toBe('Running');
      expect(getExtendedWorkoutTypeLabel('strength')).toBe('Strength');
      expect(getExtendedWorkoutTypeLabel('quick')).toBe('Quick Workout');
      expect(getExtendedWorkoutTypeLabel('station')).toBe('Station Practice');
      expect(getExtendedWorkoutTypeLabel('coverage')).toBe('Race Coverage');
      expect(getExtendedWorkoutTypeLabel('full')).toBe('Full Simulation');
      expect(getExtendedWorkoutTypeLabel('rest')).toBe('Rest Day');
    });

    it('returns type as-is for unknown types', () => {
      expect(getExtendedWorkoutTypeLabel('unknown')).toBe('unknown');
    });
  });

  describe('getExtendedWorkoutTypeIcon', () => {
    it('returns correct icons for all types', () => {
      expect(getExtendedWorkoutTypeIcon('run')).toBe('runner');
      expect(getExtendedWorkoutTypeIcon('strength')).toBe('dumbbell');
      expect(getExtendedWorkoutTypeIcon('quick')).toBe('bolt');
      expect(getExtendedWorkoutTypeIcon('station')).toBe('weights');
      expect(getExtendedWorkoutTypeIcon('coverage')).toBe('target');
      expect(getExtendedWorkoutTypeIcon('full')).toBe('flag');
      expect(getExtendedWorkoutTypeIcon('rest')).toBe('moon');
    });

    it('returns muscle icon for unknown types', () => {
      expect(getExtendedWorkoutTypeIcon('unknown')).toBe('muscle');
    });
  });

  describe('Program periodization', () => {
    it('8-week program has Specificity and Peak/Taper phases', () => {
      const eightWeek = PROGRAM_TEMPLATES.find(t => t.weeks === 8);
      const phases = new Set(eightWeek?.schedule.map(w => w.phase));
      expect(phases.has('Specificity')).toBe(true);
      expect(phases.has('Peak') || phases.has('Taper')).toBe(true);
    });

    it('12-week program has Base, Pace, and Peak phases', () => {
      const twelveWeek = PROGRAM_TEMPLATES.find(t => t.weeks === 12);
      const phases = new Set(twelveWeek?.schedule.map(w => w.phase));
      expect(phases.has('Base')).toBe(true);
      expect(phases.has('Pace')).toBe(true);
      expect(phases.has('Accelerate') || phases.has('Prime') || phases.has('Taper')).toBe(true);
    });

    it('taper week is the last week', () => {
      for (const template of PROGRAM_TEMPLATES) {
        const lastWeek = template.schedule[template.schedule.length - 1];
        expect(lastWeek.phase).toBe('Taper');
        expect(lastWeek.isDeload).toBe(true);
      }
    });
  });
});
