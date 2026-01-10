import { HYROX_STATIONS, AVERAGE_TIMES, ROX_ZONE_TRANSITION_TIME_SECONDS, OFFICIAL_WORK } from './hyrox-data';
import { GeneratedWorkout, WorkoutBlock, Exercise, UserEquipment, Alternative } from './types';
import { generateId } from './storage';

// Fisher-Yates shuffle for unbiased randomization
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function getBestAlternative(
  stationId: string,
  availableEquipment: string[]
): Alternative | null {
  const station = HYROX_STATIONS.find(s => s.id === stationId);
  if (!station) return null;

  // Sort alternatives by intensity (prefer high) and conversion factor
  const sortedAlts = [...station.alternatives].sort((a, b) => {
    const intensityOrder = { high: 3, medium: 2, low: 1 };
    return (intensityOrder[b.intensity] * b.conversionFactor) -
           (intensityOrder[a.intensity] * a.conversionFactor);
  });

  // Find the best alternative that user has equipment for
  for (const alt of sortedAlts) {
    const hasAllEquipment = alt.equipmentNeeded.every(eq =>
      availableEquipment.includes(eq) || alt.equipmentNeeded.length === 0
    );
    if (hasAllEquipment) return alt;
  }

  // Return bodyweight option if available
  return sortedAlts.find(alt => alt.equipmentNeeded.length === 0) || sortedAlts[0];
}

export function generateFullSimulation(
  userEquipment: UserEquipment[],
  includeRuns: boolean = true
): GeneratedWorkout {
  const availableIds = userEquipment.filter(e => e.available).map(e => e.equipmentId);
  const mainWorkout: WorkoutBlock[] = [];

  for (const station of HYROX_STATIONS) {
    if (includeRuns) {
      mainWorkout.push({
        type: 'run',
        distance: 1000,
        notes: '1km run at race pace'
      });
    }

    const alternative = getBestAlternative(station.id, availableIds);
    mainWorkout.push({
      type: 'station',
      stationId: station.id,
      alternativeName: alternative?.name || station.name,
      notes: alternative?.description || station.officialRequirement
    });
  }

  return {
    id: generateId(),
    name: 'Full HYROX Simulation',
    duration: 75,
    difficulty: 'hard',
    warmup: getWarmup(),
    mainWorkout,
    cooldown: getCooldown()
  };
}

export function generateStationPractice(
  stationIds: string[],
  userEquipment: UserEquipment[],
  sets: number = 3
): GeneratedWorkout {
  const availableIds = userEquipment.filter(e => e.available).map(e => e.equipmentId);
  const mainWorkout: WorkoutBlock[] = [];

  for (let set = 0; set < sets; set++) {
    for (const stationId of stationIds) {
      const station = HYROX_STATIONS.find(s => s.id === stationId);
      if (!station) continue;

      mainWorkout.push({
        type: 'run',
        distance: 400,
        notes: '400m run (recovery between stations)'
      });

      const alternative = getBestAlternative(stationId, availableIds);
      mainWorkout.push({
        type: 'station',
        stationId: station.id,
        alternativeName: alternative?.name || station.name,
        notes: alternative?.description || station.officialRequirement
      });
    }

    if (set < sets - 1) {
      mainWorkout.push({
        type: 'rest',
        duration: 120,
        notes: '2 min rest between sets'
      });
    }
  }

  return {
    id: generateId(),
    name: `Station Practice: ${stationIds.map(id =>
      HYROX_STATIONS.find(s => s.id === id)?.name
    ).join(', ')}`,
    duration: 30 + (stationIds.length * sets * 5),
    difficulty: 'medium',
    warmup: getWarmup(),
    mainWorkout,
    cooldown: getCooldown()
  };
}

export function generateQuickWorkout(
  userEquipment: UserEquipment[],
  durationMinutes: number = 30,
  focus: 'cardio' | 'strength' | 'mixed' = 'mixed'
): GeneratedWorkout {
  const availableIds = userEquipment.filter(e => e.available).map(e => e.equipmentId);
  const mainWorkout: WorkoutBlock[] = [];

  let stations = [...HYROX_STATIONS];

  if (focus === 'cardio') {
    stations = stations.filter(s => ['skierg', 'rowing', 'burpee_broad_jump'].includes(s.id));
  } else if (focus === 'strength') {
    stations = stations.filter(s => ['sled_push', 'sled_pull', 'farmers_carry', 'sandbag_lunges', 'wall_balls'].includes(s.id));
  }

  // Pick random stations based on duration using unbiased shuffle
  const numStations = Math.min(Math.floor(durationMinutes / 8), stations.length);
  const selectedStations = shuffleArray(stations).slice(0, numStations);

  for (const station of selectedStations) {
    mainWorkout.push({
      type: 'run',
      distance: 500,
      notes: '500m run'
    });

    const alternative = getBestAlternative(station.id, availableIds);
    mainWorkout.push({
      type: 'station',
      stationId: station.id,
      alternativeName: alternative?.name || station.name,
      notes: alternative?.description || station.officialRequirement
    });
  }

  return {
    id: generateId(),
    name: `${durationMinutes} Min ${focus.charAt(0).toUpperCase() + focus.slice(1)} Workout`,
    duration: durationMinutes,
    difficulty: durationMinutes > 45 ? 'hard' : durationMinutes > 25 ? 'medium' : 'easy',
    warmup: getShortWarmup(),
    mainWorkout,
    cooldown: getShortCooldown()
  };
}

export function generateRaceCoverageWorkout(
  userEquipment: UserEquipment[],
  coveragePercent: number = 50,
  isWomen: boolean = false
): GeneratedWorkout {
  const availableIds = userEquipment.filter(e => e.available).map(e => e.equipmentId);
  const mainWorkout: WorkoutBlock[] = [];
  const scale = coveragePercent / 100;

  // Scale run distance (1000m at 100%, 500m at 50%, etc.)
  const runDistance = Math.round(1000 * scale);

  for (const station of HYROX_STATIONS) {
    // Add scaled run
    mainWorkout.push({
      type: 'run',
      distance: runDistance,
      notes: `${runDistance}m run (${coveragePercent}% of race distance)`
    });

    // Get official work for this station
    const work = OFFICIAL_WORK[station.id as keyof typeof OFFICIAL_WORK];
    let scaledValue: number;
    let workDescription: string;

    if (work) {
      // Use women's value for wall balls if applicable
      const baseValue = isWomen && 'womenValue' in work ? work.womenValue! : work.value;
      scaledValue = Math.round(baseValue * scale);
      workDescription = `${scaledValue}${work.unit} (${coveragePercent}% of ${baseValue}${work.unit})`;
    } else {
      workDescription = station.officialRequirement;
    }

    // Get alternative if needed
    const alternative = getBestAlternative(station.id, availableIds);
    mainWorkout.push({
      type: 'station',
      stationId: station.id,
      alternativeName: alternative?.name || station.name,
      notes: workDescription
    });
  }

  // Estimate duration based on coverage
  const baseDuration = 75; // Full race ~75 min
  const estimatedDuration = Math.round(baseDuration * scale);

  return {
    id: generateId(),
    name: `${coveragePercent}% Race Coverage`,
    duration: estimatedDuration,
    difficulty: coveragePercent >= 75 ? 'hard' : coveragePercent >= 50 ? 'medium' : 'easy',
    warmup: coveragePercent >= 75 ? getWarmup() : getShortWarmup(),
    mainWorkout,
    cooldown: coveragePercent >= 75 ? getCooldown() : getShortCooldown()
  };
}

function getWarmup(): Exercise[] {
  return [
    { name: 'Light Jog', duration: 300, notes: '5 min easy pace' },
    { name: 'Arm Circles', reps: 20, notes: 'Forward and backward' },
    { name: 'Leg Swings', reps: 15, notes: 'Each leg, front to back' },
    { name: 'Hip Circles', reps: 10, notes: 'Each direction' },
    { name: 'Bodyweight Squats', reps: 15 },
    { name: 'Lunges', reps: 10, notes: 'Each leg' },
    { name: 'Push-ups', reps: 10 },
    { name: 'Mountain Climbers', duration: 30 }
  ];
}

function getShortWarmup(): Exercise[] {
  return [
    { name: 'Jumping Jacks', duration: 60 },
    { name: 'Arm Circles', reps: 15 },
    { name: 'Bodyweight Squats', reps: 10 },
    { name: 'Lunges', reps: 5, notes: 'Each leg' }
  ];
}

function getCooldown(): Exercise[] {
  return [
    { name: 'Walk', duration: 300, notes: '5 min easy walk' },
    { name: 'Quad Stretch', duration: 30, notes: 'Each leg' },
    { name: 'Hamstring Stretch', duration: 30, notes: 'Each leg' },
    { name: 'Hip Flexor Stretch', duration: 30, notes: 'Each side' },
    { name: 'Shoulder Stretch', duration: 30, notes: 'Each arm' },
    { name: 'Child\'s Pose', duration: 60 }
  ];
}

function getShortCooldown(): Exercise[] {
  return [
    { name: 'Walk', duration: 120, notes: '2 min easy walk' },
    { name: 'Full Body Stretch', duration: 180, notes: 'Focus on worked muscles' }
  ];
}

export function calculatePacingPlan(
  targetTimeMinutes: number,
  fiveKTimeMinutes: number,
  experience: 'beginner' | 'intermediate' | 'advanced'
): { stationId: string; targetTime: number; stationName: string }[] {
  const avgTimes = AVERAGE_TIMES[experience];
  const totalStationTime = Object.entries(avgTimes)
    .filter(([key]) => key !== 'runPer1k')
    .reduce((sum, [, val]) => sum + val, 0);

  const totalRunTime = avgTimes.runPer1k * 8;
  const avgTotalTime = totalStationTime + totalRunTime + ROX_ZONE_TRANSITION_TIME_SECONDS;

  const scaleFactor = (targetTimeMinutes * 60) / avgTotalTime;

  return HYROX_STATIONS.map(station => ({
    stationId: station.id,
    stationName: station.name,
    targetTime: Math.round(avgTimes[station.id as keyof typeof avgTimes] * scaleFactor)
  }));
}
