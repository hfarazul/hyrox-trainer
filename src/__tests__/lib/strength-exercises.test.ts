import { describe, it, expect } from 'vitest';
import {
  LOWER_BODY_EXERCISES,
  UPPER_BODY_EXERCISES,
  FULL_BODY_EXERCISES,
  ALL_STRENGTH_EXERCISES,
  getExercisesByCategory,
  getExercisesForEquipment,
  getExercisesForStation,
  STRENGTH_WORKOUT_TEMPLATES,
} from '@/lib/strength-exercises';

describe('Strength Exercises Library', () => {
  describe('Exercise Data Structure', () => {
    it('all exercises have required fields', () => {
      for (const exercise of ALL_STRENGTH_EXERCISES) {
        expect(exercise.id).toBeDefined();
        expect(exercise.name).toBeDefined();
        expect(exercise.sets).toBeGreaterThan(0);
        expect(exercise.reps).toBeDefined();
        expect(exercise.category).toMatch(/^(lower|upper|full)$/);
        expect(Array.isArray(exercise.equipmentNeeded)).toBe(true);
      }
    });

    it('has exercises in all categories', () => {
      expect(LOWER_BODY_EXERCISES.length).toBeGreaterThan(0);
      expect(UPPER_BODY_EXERCISES.length).toBeGreaterThan(0);
      expect(FULL_BODY_EXERCISES.length).toBeGreaterThan(0);
    });

    it('ALL_STRENGTH_EXERCISES contains all category exercises', () => {
      const totalFromCategories =
        LOWER_BODY_EXERCISES.length +
        UPPER_BODY_EXERCISES.length +
        FULL_BODY_EXERCISES.length;

      expect(ALL_STRENGTH_EXERCISES.length).toBe(totalFromCategories);
    });

    it('exercise IDs are unique', () => {
      const ids = ALL_STRENGTH_EXERCISES.map(ex => ex.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('getExercisesByCategory', () => {
    it('returns only lower body exercises for lower category', () => {
      const lowerExercises = getExercisesByCategory('lower');
      expect(lowerExercises.length).toBe(LOWER_BODY_EXERCISES.length);
      expect(lowerExercises.every(ex => ex.category === 'lower')).toBe(true);
    });

    it('returns only upper body exercises for upper category', () => {
      const upperExercises = getExercisesByCategory('upper');
      expect(upperExercises.length).toBe(UPPER_BODY_EXERCISES.length);
      expect(upperExercises.every(ex => ex.category === 'upper')).toBe(true);
    });

    it('returns only full body exercises for full category', () => {
      const fullExercises = getExercisesByCategory('full');
      expect(fullExercises.length).toBe(FULL_BODY_EXERCISES.length);
      expect(fullExercises.every(ex => ex.category === 'full')).toBe(true);
    });
  });

  describe('getExercisesForEquipment', () => {
    it('returns bodyweight exercises when no equipment available', () => {
      const exercises = getExercisesForEquipment([]);
      expect(exercises.length).toBeGreaterThan(0);
      expect(exercises.every(ex => ex.equipmentNeeded.length === 0)).toBe(true);
    });

    it('returns more exercises when dumbbells are available', () => {
      const withoutDumbbells = getExercisesForEquipment([]);
      const withDumbbells = getExercisesForEquipment(['dumbbells']);
      expect(withDumbbells.length).toBeGreaterThan(withoutDumbbells.length);
    });

    it('filters by category when specified', () => {
      const lowerWithBarbell = getExercisesForEquipment(['barbell'], 'lower');
      expect(lowerWithBarbell.every(ex => ex.category === 'lower')).toBe(true);
    });

    it('returns exercises that need any of the available equipment', () => {
      const exercises = getExercisesForEquipment(['barbell', 'dumbbells']);
      // Should include exercises that need barbell OR dumbbells
      const barbellExercise = exercises.find(ex => ex.id === 'back_squat');
      expect(barbellExercise).toBeDefined();
    });
  });

  describe('getExercisesForStation', () => {
    it('returns exercises related to sled_push', () => {
      const sledPushExercises = getExercisesForStation('sled_push');
      expect(sledPushExercises.length).toBeGreaterThan(0);
      expect(
        sledPushExercises.every(ex => ex.relatedStations?.includes('sled_push'))
      ).toBe(true);
    });

    it('returns exercises related to wall_balls', () => {
      const wallBallExercises = getExercisesForStation('wall_balls');
      expect(wallBallExercises.length).toBeGreaterThan(0);
      // Should include thrusters, goblet squats, etc.
    });

    it('returns empty array for unknown station', () => {
      const unknownExercises = getExercisesForStation('unknown_station');
      expect(unknownExercises.length).toBe(0);
    });
  });

  describe('STRENGTH_WORKOUT_TEMPLATES', () => {
    it('has all three workout templates', () => {
      expect(STRENGTH_WORKOUT_TEMPLATES.lowerBody).toBeDefined();
      expect(STRENGTH_WORKOUT_TEMPLATES.upperBody).toBeDefined();
      expect(STRENGTH_WORKOUT_TEMPLATES.fullBody).toBeDefined();
    });

    it('each template has name, focus, exercises, and stationWork', () => {
      for (const key of Object.keys(STRENGTH_WORKOUT_TEMPLATES) as Array<
        keyof typeof STRENGTH_WORKOUT_TEMPLATES
      >) {
        const template = STRENGTH_WORKOUT_TEMPLATES[key];
        expect(template.name).toBeDefined();
        expect(template.focus).toMatch(/^(lower|upper|full)$/);
        expect(Array.isArray(template.exercises)).toBe(true);
        expect(template.exercises.length).toBeGreaterThan(0);
        expect(Array.isArray(template.stationWork)).toBe(true);
      }
    });

    it('lowerBody template has lower focus', () => {
      expect(STRENGTH_WORKOUT_TEMPLATES.lowerBody.focus).toBe('lower');
    });

    it('upperBody template has upper focus', () => {
      expect(STRENGTH_WORKOUT_TEMPLATES.upperBody.focus).toBe('upper');
    });

    it('fullBody template has full focus', () => {
      expect(STRENGTH_WORKOUT_TEMPLATES.fullBody.focus).toBe('full');
    });
  });
});
