import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calculateRanking,
  getRankingInfo,
  getBestAlternative,
  getAllExerciseNames,
  generateFullSimulation,
  generateStationPractice,
  generateQuickWorkout,
  generateRaceCoverageWorkout,
  calculatePacingPlan,
} from '@/lib/workout-generator';
import { HYROX_STATIONS } from '@/lib/hyrox-data';
import type { UserEquipment } from '@/lib/types';

// Mock generateId to return deterministic IDs
vi.mock('@/lib/storage', () => ({
  generateId: vi.fn(() => 'test-workout-id'),
}));

describe('calculateRanking', () => {
  // Elite: < 85%, Fast: 85-100%, Good: 100-115%, Solid: 115-135%, Finish: > 135%

  it('returns "elite" when actual time is < 85% of estimated', () => {
    // 50 min actual vs 75 min estimated = 66.7%
    expect(calculateRanking(50 * 60, 75)).toBe('elite');
  });

  it('returns "fast" when actual time is between 85-100%', () => {
    // 67.5 min actual vs 75 min estimated = 90%
    expect(calculateRanking(67.5 * 60, 75)).toBe('fast');
  });

  it('returns "good" when actual time is between 100-115%', () => {
    // 82.5 min actual vs 75 min estimated = 110%
    expect(calculateRanking(82.5 * 60, 75)).toBe('good');
  });

  it('returns "solid" when actual time is between 115-135%', () => {
    // 93.75 min actual vs 75 min estimated = 125%
    expect(calculateRanking(93.75 * 60, 75)).toBe('solid');
  });

  it('returns "finish" when actual time is > 135% of estimated', () => {
    // 112.5 min actual vs 75 min estimated = 150%
    expect(calculateRanking(112.5 * 60, 75)).toBe('finish');
  });

  // Boundary tests
  it('returns "fast" at exactly 85%', () => {
    // 63.75 min vs 75 min = exactly 85%
    expect(calculateRanking(63.75 * 60, 75)).toBe('fast');
  });

  it('returns "good" at exactly 100%', () => {
    expect(calculateRanking(75 * 60, 75)).toBe('good');
  });

  it('returns "good" at exactly 115% (boundary is exclusive)', () => {
    // 86.25 min vs 75 min = exactly 115%
    // The condition is percentage < 115, so 115% exactly is 'solid'
    // But due to implementation: if (percentage < 115) return 'good'
    // So at exactly 115%, it doesn't satisfy < 115, goes to next check
    expect(calculateRanking(86.25 * 60, 75)).toBe('good');
  });

  it('returns "solid" just above 115%', () => {
    // 86.3 min vs 75 min = ~115.07%
    expect(calculateRanking(86.3 * 60, 75)).toBe('solid');
  });

  it('returns "finish" at exactly 135%', () => {
    // 101.25 min vs 75 min = exactly 135%
    expect(calculateRanking(101.25 * 60, 75)).toBe('finish');
  });
});

describe('getRankingInfo', () => {
  it('returns correct info for elite ranking', () => {
    const info = getRankingInfo('elite');
    expect(info.label).toBe('ELITE');
    expect(info.icon).toBe('trophy');
    expect(info.color).toBe('text-yellow-300');
    expect(info.description).toBe('Top tier performance!');
  });

  it('returns correct info for fast ranking', () => {
    const info = getRankingInfo('fast');
    expect(info.label).toBe('FAST');
    expect(info.icon).toBe('bolt');
    expect(info.color).toBe('text-purple-300');
    expect(info.description).toBe('Great pace!');
  });

  it('returns correct info for good ranking', () => {
    const info = getRankingInfo('good');
    expect(info.label).toBe('GOOD');
    expect(info.icon).toBe('muscle');
    expect(info.color).toBe('text-green-300');
  });

  it('returns correct info for solid ranking', () => {
    const info = getRankingInfo('solid');
    expect(info.label).toBe('SOLID');
    expect(info.icon).toBe('check');
    expect(info.color).toBe('text-blue-300');
  });

  it('returns correct info for finish ranking', () => {
    const info = getRankingInfo('finish');
    expect(info.label).toBe('FINISHER');
    expect(info.icon).toBe('flag');
    expect(info.color).toBe('text-gray-300');
  });
});

describe('getBestAlternative', () => {
  it('returns null for invalid station ID', () => {
    expect(getBestAlternative('invalid_station', [])).toBeNull();
  });

  it('returns bodyweight alternative when no equipment available', () => {
    const result = getBestAlternative('burpee_broad_jump', []);
    expect(result).not.toBeNull();
    expect(result!.equipmentNeeded).toEqual([]);
  });

  it('returns equipment-matched alternative when equipment is available', () => {
    const result = getBestAlternative('skierg', ['dumbbells']);
    expect(result).not.toBeNull();
    // Should return an alternative that uses dumbbells
    expect(result!.equipmentNeeded).toContain('dumbbells');
  });

  it('returns best alternative by intensity and conversion factor', () => {
    // Cable machine alternatives have conversionFactor 1.1 (highest)
    const result = getBestAlternative('skierg', ['cable_machine']);
    expect(result).not.toBeNull();
    expect(result!.equipmentNeeded).toContain('cable_machine');
  });

  it('excludes exercises from excludedExercises list', () => {
    const skiergStation = HYROX_STATIONS.find(s => s.id === 'skierg')!;
    const allNames = skiergStation.alternatives.map(a => a.name);

    // Exclude first alternative
    const excluded = [allNames[0]];
    const result = getBestAlternative('skierg', ['dumbbells', 'cable_machine', 'kettlebell'], excluded);

    expect(result).not.toBeNull();
    expect(result!.name).not.toBe(excluded[0]);
  });

  it('falls back to original list if all alternatives are excluded', () => {
    const skiergStation = HYROX_STATIONS.find(s => s.id === 'skierg')!;
    const allNames = skiergStation.alternatives.map(a => a.name);

    // Exclude all alternatives
    const result = getBestAlternative('skierg', [], allNames);

    expect(result).not.toBeNull();
    // Should still return something (falls back to original list)
  });
});

describe('getAllExerciseNames', () => {
  it('returns an array of strings', () => {
    const names = getAllExerciseNames();
    expect(Array.isArray(names)).toBe(true);
    expect(names.every(n => typeof n === 'string')).toBe(true);
  });

  it('returns sorted unique exercise names', () => {
    const names = getAllExerciseNames();
    // Check it's sorted
    const sorted = [...names].sort();
    expect(names).toEqual(sorted);

    // Check uniqueness
    const unique = [...new Set(names)];
    expect(names.length).toBe(unique.length);
  });

  it('includes known alternatives', () => {
    const names = getAllExerciseNames();
    expect(names).toContain('Medicine Ball Slams');
    expect(names).toContain('Thrusters');
    expect(names).toContain('Burpee Broad Jumps');
  });
});

describe('generateFullSimulation', () => {
  const mockEquipment: UserEquipment[] = [
    { equipmentId: 'dumbbells', available: true },
    { equipmentId: 'kettlebell', available: true },
  ];

  it('generates workout with correct structure', () => {
    const workout = generateFullSimulation(mockEquipment);

    expect(workout.id).toBe('test-workout-id');
    expect(workout.name).toBe('Full HYROX Simulation');
    expect(workout.difficulty).toBe('hard');
    expect(workout.warmup).toBeDefined();
    expect(workout.mainWorkout).toBeDefined();
    expect(workout.cooldown).toBeDefined();
  });

  it('includes runs when includeRuns is true (default)', () => {
    const workout = generateFullSimulation(mockEquipment, true);

    expect(workout.duration).toBe(75);
    const runBlocks = workout.mainWorkout.filter(b => b.type === 'run');
    expect(runBlocks.length).toBe(8); // 8 runs for 8 stations
  });

  it('excludes runs when includeRuns is false', () => {
    const workout = generateFullSimulation(mockEquipment, false);

    expect(workout.duration).toBe(35);
    const runBlocks = workout.mainWorkout.filter(b => b.type === 'run');
    expect(runBlocks.length).toBe(0);
  });

  it('has 8 station blocks', () => {
    const workout = generateFullSimulation(mockEquipment);
    const stationBlocks = workout.mainWorkout.filter(b => b.type === 'station');
    expect(stationBlocks.length).toBe(8);
  });

  it('respects excluded exercises', () => {
    const workout = generateFullSimulation(mockEquipment, true, ['Dumbbell Pullovers']);
    const stationBlocks = workout.mainWorkout.filter(b => b.type === 'station');

    // None of the stations should use excluded exercise
    const usesExcluded = stationBlocks.some(b => b.alternativeName === 'Dumbbell Pullovers');
    expect(usesExcluded).toBe(false);
  });
});

describe('generateStationPractice', () => {
  const mockEquipment: UserEquipment[] = [
    { equipmentId: 'dumbbells', available: true },
  ];

  it('generates workout for specified stations', () => {
    const workout = generateStationPractice(['skierg', 'rowing'], mockEquipment);

    expect(workout.name).toContain('SkiErg');
    expect(workout.name).toContain('Rowing');
  });

  it('includes correct number of sets', () => {
    const sets = 3;
    const stationIds = ['skierg', 'rowing'];
    const workout = generateStationPractice(stationIds, mockEquipment, sets, [], true);

    const stationBlocks = workout.mainWorkout.filter(b => b.type === 'station');
    expect(stationBlocks.length).toBe(stationIds.length * sets);
  });

  it('includes rest blocks between sets', () => {
    const sets = 3;
    const workout = generateStationPractice(['skierg'], mockEquipment, sets);

    const restBlocks = workout.mainWorkout.filter(b => b.type === 'rest');
    expect(restBlocks.length).toBe(sets - 1); // Rest between sets, not after last
  });

  it('includes runs between stations when includeRuns is true', () => {
    const workout = generateStationPractice(['skierg', 'rowing'], mockEquipment, 2, [], true);

    const runBlocks = workout.mainWorkout.filter(b => b.type === 'run');
    // 2 stations * 2 sets = 4 runs
    expect(runBlocks.length).toBe(4);
    expect(runBlocks[0].distance).toBe(400);
  });

  it('excludes runs when includeRuns is false', () => {
    const workout = generateStationPractice(['skierg'], mockEquipment, 2, [], false);

    const runBlocks = workout.mainWorkout.filter(b => b.type === 'run');
    expect(runBlocks.length).toBe(0);
  });
});

describe('generateQuickWorkout', () => {
  const mockEquipment: UserEquipment[] = [
    { equipmentId: 'dumbbells', available: true },
  ];

  it('generates workout with correct duration-based name', () => {
    const workout = generateQuickWorkout(mockEquipment, 30, 'mixed');
    expect(workout.name).toBe('30 Min Mixed Workout');
  });

  it('filters stations by cardio focus', () => {
    const workout = generateQuickWorkout(mockEquipment, 30, 'cardio', [], true);

    const stationBlocks = workout.mainWorkout.filter(b => b.type === 'station');
    // Cardio stations: skierg, rowing, burpee_broad_jump
    const validCardioIds = ['skierg', 'rowing', 'burpee_broad_jump'];

    stationBlocks.forEach(block => {
      expect(validCardioIds).toContain(block.stationId);
    });
  });

  it('filters stations by strength focus', () => {
    const workout = generateQuickWorkout(mockEquipment, 30, 'strength', [], true);

    const stationBlocks = workout.mainWorkout.filter(b => b.type === 'station');
    const validStrengthIds = ['sled_push', 'sled_pull', 'farmers_carry', 'sandbag_lunges', 'wall_balls'];

    stationBlocks.forEach(block => {
      expect(validStrengthIds).toContain(block.stationId);
    });
  });

  it('calculates number of stations based on duration', () => {
    // numStations = floor(durationMinutes / 8)
    const workout30 = generateQuickWorkout(mockEquipment, 30);
    const workout60 = generateQuickWorkout(mockEquipment, 60);

    const stations30 = workout30.mainWorkout.filter(b => b.type === 'station').length;
    const stations60 = workout60.mainWorkout.filter(b => b.type === 'station').length;

    expect(stations30).toBeLessThanOrEqual(Math.floor(30 / 8));
    expect(stations60).toBeLessThanOrEqual(Math.floor(60 / 8));
    expect(stations60).toBeGreaterThan(stations30);
  });

  it('sets difficulty based on duration', () => {
    const easyWorkout = generateQuickWorkout(mockEquipment, 20);
    const mediumWorkout = generateQuickWorkout(mockEquipment, 35);
    const hardWorkout = generateQuickWorkout(mockEquipment, 50);

    expect(easyWorkout.difficulty).toBe('easy');
    expect(mediumWorkout.difficulty).toBe('medium');
    expect(hardWorkout.difficulty).toBe('hard');
  });

  it('includes 500m runs between stations', () => {
    const workout = generateQuickWorkout(mockEquipment, 30, 'mixed', [], true);

    const runBlocks = workout.mainWorkout.filter(b => b.type === 'run');
    if (runBlocks.length > 0) {
      expect(runBlocks[0].distance).toBe(500);
    }
  });
});

describe('generateRaceCoverageWorkout', () => {
  const mockEquipment: UserEquipment[] = [
    { equipmentId: 'dumbbells', available: true },
  ];

  it('scales duration based on coverage percentage', () => {
    const workout50 = generateRaceCoverageWorkout(mockEquipment, 50);
    const workout100 = generateRaceCoverageWorkout(mockEquipment, 100);

    // 50% of 75min = ~38min, 100% = 75min
    expect(workout50.duration).toBe(38); // Math.round(75 * 0.5)
    expect(workout100.duration).toBe(75);
  });

  it('scales run distance based on coverage', () => {
    const workout50 = generateRaceCoverageWorkout(mockEquipment, 50, false, [], true);

    const runBlocks = workout50.mainWorkout.filter(b => b.type === 'run');
    expect(runBlocks[0].distance).toBe(500); // 1000m * 0.5
  });

  it('includes all 8 stations regardless of coverage', () => {
    const workout = generateRaceCoverageWorkout(mockEquipment, 25);

    const stationBlocks = workout.mainWorkout.filter(b => b.type === 'station');
    expect(stationBlocks.length).toBe(8);
  });

  it('sets difficulty based on coverage percentage', () => {
    const easy = generateRaceCoverageWorkout(mockEquipment, 25);
    const medium = generateRaceCoverageWorkout(mockEquipment, 50);
    const hard = generateRaceCoverageWorkout(mockEquipment, 75);

    expect(easy.difficulty).toBe('easy');
    expect(medium.difficulty).toBe('medium');
    expect(hard.difficulty).toBe('hard');
  });

  it('names workout with coverage percentage', () => {
    const workout = generateRaceCoverageWorkout(mockEquipment, 75);
    expect(workout.name).toBe('75% Race Coverage');
  });

  it('excludes runs when includeRuns is false', () => {
    const workout = generateRaceCoverageWorkout(mockEquipment, 50, false, [], false);

    const runBlocks = workout.mainWorkout.filter(b => b.type === 'run');
    expect(runBlocks.length).toBe(0);
    // Duration should be based on 35min without runs
    expect(workout.duration).toBe(18); // Math.round(35 * 0.5)
  });
});

describe('calculatePacingPlan', () => {
  it('returns pacing for all 8 stations', () => {
    const plan = calculatePacingPlan(75, 25, 'intermediate');

    expect(plan.length).toBe(8);
    expect(plan.every(p => p.stationId && p.stationName && typeof p.targetTime === 'number')).toBe(true);
  });

  it('scales target times based on target time minutes', () => {
    const fastPlan = calculatePacingPlan(60, 25, 'intermediate');
    const slowPlan = calculatePacingPlan(90, 25, 'intermediate');

    // Faster target time should have smaller station times
    const fastTotal = fastPlan.reduce((sum, p) => sum + p.targetTime, 0);
    const slowTotal = slowPlan.reduce((sum, p) => sum + p.targetTime, 0);

    expect(fastTotal).toBeLessThan(slowTotal);
  });

  it('returns different times for different experience levels', () => {
    const beginnerPlan = calculatePacingPlan(75, 25, 'beginner');
    const advancedPlan = calculatePacingPlan(75, 25, 'advanced');

    // Beginners have different base times than advanced
    // The distribution should differ even with same target
    expect(beginnerPlan).not.toEqual(advancedPlan);
  });

  it('includes correct station names', () => {
    const plan = calculatePacingPlan(75, 25, 'intermediate');

    const stationNames = plan.map(p => p.stationName);
    expect(stationNames).toContain('SkiErg');
    expect(stationNames).toContain('Sled Push');
    expect(stationNames).toContain('Wall Balls');
  });

  it('all target times are positive integers', () => {
    const plan = calculatePacingPlan(75, 25, 'intermediate');

    plan.forEach(p => {
      expect(p.targetTime).toBeGreaterThan(0);
      expect(Number.isInteger(p.targetTime)).toBe(true);
    });
  });
});
