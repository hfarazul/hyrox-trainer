import { HyroxStation, Equipment } from './types';

// ROX Zone transition time (~7 minutes for all 8 transitions)
export const ROX_ZONE_TRANSITION_TIME_SECONDS = 420;

// Official work values for scaling (used in race coverage mode)
export const OFFICIAL_WORK = {
  skierg: { value: 1000, unit: 'm' },
  sled_push: { value: 50, unit: 'm' },
  sled_pull: { value: 50, unit: 'm' },
  burpee_broad_jump: { value: 80, unit: 'm' },
  rowing: { value: 1000, unit: 'm' },
  farmers_carry: { value: 200, unit: 'm' },
  sandbag_lunges: { value: 100, unit: 'm' },
  wall_balls: { value: 100, unit: 'reps', womenValue: 75 },
};

export const HYROX_STATIONS: HyroxStation[] = [
  {
    id: 'skierg',
    name: 'SkiErg',
    order: 1,
    description: 'Vertical pulling movement simulating cross-country skiing',
    officialRequirement: '1000m',
    videoUrl: 'https://www.youtube.com/watch?v=dU-gLHDPOj4',
    weights: { menOpen: 'N/A', menPro: 'N/A', womenOpen: 'N/A', womenPro: 'N/A' },
    muscleGroups: ['lats', 'shoulders', 'triceps', 'core'],
    tips: ['Use your whole body', 'Hinge at hips', 'Pull through with core'],
    alternatives: [
      { name: 'Medicine Ball Slams', description: '100 reps of explosive ball slams', equipmentNeeded: ['medicine_ball'], intensity: 'advanced', conversionFactor: 1.0, videoUrl: 'https://www.youtube.com/watch?v=N7t9BX-DExI', baseValue: 100, unit: 'reps' },
      { name: 'Battle Rope Slams', description: '3 min of alternating slams', equipmentNeeded: ['battle_ropes'], intensity: 'advanced', conversionFactor: 1.0, baseValue: 180, unit: 's' },
      { name: 'Dumbbell Pullovers', description: '50 reps lying pullovers', equipmentNeeded: ['dumbbells'], intensity: 'intermediate', conversionFactor: 0.8, baseValue: 50, unit: 'reps' },
      { name: 'Burpee Pull-ups', description: '30 burpee to pull-up', equipmentNeeded: ['pull_up_bar'], intensity: 'advanced', conversionFactor: 1.2, baseValue: 30, unit: 'reps' },
      { name: 'Jumping Jacks + Arm Circles', description: '200 jumping jacks with arm circles', equipmentNeeded: [], intensity: 'beginner', conversionFactor: 0.6, baseValue: 200, unit: 'reps' }
    ]
  },
  {
    id: 'sled_push',
    name: 'Sled Push',
    order: 2,
    description: 'Push a weighted sled across the floor',
    officialRequirement: '50m',
    videoUrl: 'https://www.youtube.com/watch?v=DeTUDPo6_YM',
    weights: { menOpen: '152kg', menPro: '202kg', womenOpen: '102kg', womenPro: '152kg' },
    muscleGroups: ['quads', 'glutes', 'calves', 'core'],
    tips: ['Stay low', 'Drive through legs', 'Keep arms extended'],
    alternatives: [
      { name: 'Weighted Hill Sprints', description: '4x50m uphill with vest', equipmentNeeded: ['weighted_vest'], intensity: 'advanced', conversionFactor: 1.0, baseValue: 200, unit: 'm' },
      { name: 'Wall Drives', description: '60 seconds wall push drives', equipmentNeeded: [], intensity: 'intermediate', conversionFactor: 0.7, baseValue: 60, unit: 's' },
      { name: 'Resistance Band Pushes', description: '60 seconds pushing against band', equipmentNeeded: ['resistance_bands'], intensity: 'intermediate', conversionFactor: 0.8, baseValue: 60, unit: 's' },
      { name: 'Bear Crawls', description: '100m forward bear crawl', equipmentNeeded: [], intensity: 'advanced', conversionFactor: 0.9, baseValue: 100, unit: 'm' },
      { name: 'Stair Climbs with Weight', description: '5 floors with heavy backpack', equipmentNeeded: ['backpack'], intensity: 'advanced', conversionFactor: 1.0, baseValue: 5, unit: 'floors' }
    ]
  },
  {
    id: 'sled_pull',
    name: 'Sled Pull',
    order: 3,
    description: 'Pull a weighted sled using a rope',
    officialRequirement: '50m',
    videoUrl: 'https://www.youtube.com/watch?v=Wgi3b40uDEY',
    weights: { menOpen: '103kg', menPro: '153kg', womenOpen: '78kg', womenPro: '103kg' },
    muscleGroups: ['back', 'biceps', 'grip', 'core'],
    tips: ['Sit back into it', 'Hand over hand technique', 'Stay low'],
    alternatives: [
      { name: 'Rope Pulls with Weight', description: 'Pull weighted bag 50m with rope', equipmentNeeded: ['rope', 'backpack'], intensity: 'advanced', conversionFactor: 1.0, baseValue: 50, unit: 'm' },
      { name: 'Resistance Band Rows', description: '100 seated band rows', equipmentNeeded: ['resistance_bands'], intensity: 'intermediate', conversionFactor: 0.8, baseValue: 100, unit: 'reps' },
      { name: 'Towel Rows', description: '60 inverted rows using towel over bar', equipmentNeeded: ['towel', 'pull_up_bar'], intensity: 'intermediate', conversionFactor: 0.9, baseValue: 60, unit: 'reps' },
      { name: 'Heavy Bent Over Rows', description: '60 heavy dumbbell rows', equipmentNeeded: ['dumbbells'], intensity: 'advanced', conversionFactor: 0.9, baseValue: 60, unit: 'reps' },
      { name: 'Backwards Drags', description: 'Drag heavy bag backwards 100m', equipmentNeeded: ['backpack'], intensity: 'advanced', conversionFactor: 1.0, baseValue: 100, unit: 'm' }
    ]
  },
  {
    id: 'burpee_broad_jump',
    name: 'Burpee Broad Jumps',
    order: 4,
    description: 'Burpee followed by a forward broad jump',
    officialRequirement: '80m',
    videoUrl: 'https://www.youtube.com/watch?v=_yN-Lp7bfzM',
    weights: { menOpen: 'N/A', menPro: 'N/A', womenOpen: 'N/A', womenPro: 'N/A' },
    muscleGroups: ['full_body', 'legs', 'core', 'cardio'],
    tips: ['Pace yourself', 'Controlled jumps', 'Breathe on the way up'],
    alternatives: [
      { name: 'Burpee Broad Jumps', description: 'Same as official - no equipment needed!', equipmentNeeded: [], intensity: 'advanced', conversionFactor: 1.0, videoUrl: 'https://www.youtube.com/watch?v=_yN-Lp7bfzM', baseValue: 80, unit: 'm' },
      { name: 'Burpee Box Jumps', description: '40 burpee to box jump', equipmentNeeded: ['plyo_box'], intensity: 'advanced', conversionFactor: 1.1, baseValue: 40, unit: 'reps' },
      { name: 'Burpee Tuck Jumps', description: '50 burpee to tuck jump', equipmentNeeded: [], intensity: 'advanced', conversionFactor: 0.9, baseValue: 50, unit: 'reps' },
      { name: 'Squat Jump Burpees', description: '60 burpee to squat jump', equipmentNeeded: [], intensity: 'intermediate', conversionFactor: 0.8, baseValue: 60, unit: 'reps' }
    ]
  },
  {
    id: 'rowing',
    name: 'Rowing',
    order: 5,
    description: 'Row 1000m on a Concept2 rowing machine',
    officialRequirement: '1000m',
    videoUrl: 'https://www.youtube.com/watch?v=6jXyP0ZuqUI',
    weights: { menOpen: 'N/A', menPro: 'N/A', womenOpen: 'N/A', womenPro: 'N/A' },
    muscleGroups: ['back', 'legs', 'core', 'arms'],
    tips: ['Legs first', 'Keep back straight', 'Drive through heels'],
    alternatives: [
      { name: 'Assault Bike', description: '50 calories on assault bike', equipmentNeeded: ['assault_bike'], intensity: 'advanced', conversionFactor: 1.0, baseValue: 50, unit: 'cal' },
      { name: 'Kettlebell Swings + Deadlifts', description: '50 swings + 30 deadlifts', equipmentNeeded: ['kettlebell'], intensity: 'advanced', conversionFactor: 0.9, baseValue: 80, unit: 'reps' },
      { name: 'Resistance Band Rows + Squats', description: '60 rows + 40 squats superset', equipmentNeeded: ['resistance_bands'], intensity: 'intermediate', conversionFactor: 0.8, baseValue: 100, unit: 'reps' },
      { name: 'Bent Over Rows + Jump Squats', description: '40 rows + 40 jump squats', equipmentNeeded: ['dumbbells'], intensity: 'advanced', conversionFactor: 0.9, baseValue: 80, unit: 'reps' },
      { name: 'Mountain Climbers + Superman', description: '100 climbers + 30 supermans', equipmentNeeded: [], intensity: 'intermediate', conversionFactor: 0.7, baseValue: 130, unit: 'reps' }
    ]
  },
  {
    id: 'farmers_carry',
    name: 'Farmers Carry',
    order: 6,
    description: 'Carry heavy kettlebells for distance',
    officialRequirement: '200m',
    videoUrl: 'https://www.youtube.com/watch?v=32vmZmkuQO4',
    weights: { menOpen: '2x24kg', menPro: '2x32kg', womenOpen: '2x16kg', womenPro: '2x24kg' },
    muscleGroups: ['grip', 'traps', 'core', 'forearms'],
    tips: ['Tall posture', 'Engage core', 'Take quick steps'],
    alternatives: [
      { name: 'Dumbbell Farmers Carry', description: '200m with heavy dumbbells', equipmentNeeded: ['dumbbells'], intensity: 'advanced', conversionFactor: 1.0, videoUrl: 'https://www.youtube.com/watch?v=j8c9uNjr7nQ', baseValue: 200, unit: 'm' },
      { name: 'Bucket/Jug Carry', description: '200m carrying water jugs', equipmentNeeded: ['water_jugs'], intensity: 'intermediate', conversionFactor: 0.9, baseValue: 200, unit: 'm' },
      { name: 'Heavy Backpack Carry', description: '200m with loaded backpack + weights in hands', equipmentNeeded: ['backpack', 'dumbbells'], intensity: 'advanced', conversionFactor: 1.0, baseValue: 200, unit: 'm' },
      { name: 'Suitcase Carry', description: '200m each side with heavy bag', equipmentNeeded: ['backpack'], intensity: 'intermediate', conversionFactor: 0.8, baseValue: 200, unit: 'm' },
      { name: 'Grocery Bag Carry', description: '200m with heavy bags', equipmentNeeded: [], intensity: 'beginner', conversionFactor: 0.6, baseValue: 200, unit: 'm' }
    ]
  },
  {
    id: 'sandbag_lunges',
    name: 'Sandbag Lunges',
    order: 7,
    description: 'Walking lunges while holding a sandbag',
    officialRequirement: '100m',
    videoUrl: 'https://www.youtube.com/watch?v=L4OMLuZKpyw',
    weights: { menOpen: '20kg', menPro: '30kg', womenOpen: '10kg', womenPro: '20kg' },
    muscleGroups: ['quads', 'glutes', 'core', 'shoulders'],
    tips: ['Knee touches ground', 'Keep torso upright', 'Alternate legs'],
    alternatives: [
      { name: 'Dumbbell Lunges', description: '100m with dumbbells at sides', equipmentNeeded: ['dumbbells'], intensity: 'advanced', conversionFactor: 0.9, baseValue: 100, unit: 'm' },
      { name: 'Backpack Lunges', description: '100m with weighted backpack', equipmentNeeded: ['backpack'], intensity: 'advanced', conversionFactor: 1.0, baseValue: 100, unit: 'm' },
      { name: 'Goblet Lunges', description: '100m holding kettlebell at chest', equipmentNeeded: ['kettlebell'], intensity: 'advanced', conversionFactor: 0.95, baseValue: 100, unit: 'm' },
      { name: 'Bodyweight Lunges', description: '150m bodyweight walking lunges', equipmentNeeded: [], intensity: 'intermediate', conversionFactor: 0.7, baseValue: 150, unit: 'm' },
      { name: 'Bulgarian Split Squats', description: '30 each leg with weight', equipmentNeeded: ['dumbbells'], intensity: 'advanced', conversionFactor: 0.9, baseValue: 60, unit: 'reps' }
    ]
  },
  {
    id: 'wall_balls',
    name: 'Wall Balls',
    order: 8,
    description: 'Throw medicine ball to target on wall',
    officialRequirement: '100 reps (75 women)',
    videoUrl: 'https://www.youtube.com/watch?v=lSNZGkPoLk4',
    weights: { menOpen: '6kg/3m target', menPro: '9kg/3m target', womenOpen: '4kg/2.7m target', womenPro: '6kg/3m target' },
    muscleGroups: ['quads', 'glutes', 'shoulders', 'core'],
    tips: ['Full squat depth', 'Use leg drive', 'Catch and descend smoothly'],
    alternatives: [
      { name: 'Wall Balls', description: 'Same as official with medicine ball', equipmentNeeded: ['medicine_ball', 'wall'], intensity: 'advanced', conversionFactor: 1.0, videoUrl: 'https://www.youtube.com/watch?v=EqjGKsiIMCE', baseValue: 100, unit: 'reps' },
      { name: 'Thrusters', description: '75 dumbbell thrusters', equipmentNeeded: ['dumbbells'], intensity: 'advanced', conversionFactor: 1.0, videoUrl: 'https://www.youtube.com/watch?v=JQnNas11CQo', baseValue: 75, unit: 'reps' },
      { name: 'Goblet Squat to Press', description: '75 goblet squat + press', equipmentNeeded: ['kettlebell'], intensity: 'advanced', conversionFactor: 0.95, baseValue: 75, unit: 'reps' },
      { name: 'Jump Squats + Push Press', description: '50 jump squats + 50 push press', equipmentNeeded: ['dumbbells'], intensity: 'advanced', conversionFactor: 0.9, baseValue: 100, unit: 'reps' },
      { name: 'Squat + Overhead Reach', description: '100 bodyweight squat with jump reach', equipmentNeeded: [], intensity: 'intermediate', conversionFactor: 0.7, baseValue: 100, unit: 'reps' }
    ]
  }
];

export const AVAILABLE_EQUIPMENT: Equipment[] = [
  { id: 'skierg', name: 'SkiErg', category: 'cardio' },
  { id: 'rowing_machine', name: 'Rowing Machine', category: 'cardio' },
  { id: 'assault_bike', name: 'Assault/Air Bike', category: 'cardio' },
  { id: 'treadmill', name: 'Treadmill', category: 'cardio' },
  { id: 'sled', name: 'Sled', category: 'weights' },
  { id: 'dumbbells', name: 'Dumbbells', category: 'weights' },
  { id: 'kettlebell', name: 'Kettlebell', category: 'weights' },
  { id: 'barbell', name: 'Barbell', category: 'weights' },
  { id: 'medicine_ball', name: 'Medicine Ball', category: 'weights' },
  { id: 'sandbag', name: 'Sandbag', category: 'weights' },
  { id: 'weighted_vest', name: 'Weighted Vest', category: 'weights' },
  { id: 'pull_up_bar', name: 'Pull-up Bar', category: 'bodyweight' },
  { id: 'plyo_box', name: 'Plyo Box', category: 'bodyweight' },
  { id: 'resistance_bands', name: 'Resistance Bands', category: 'resistance' },
  { id: 'battle_ropes', name: 'Battle Ropes', category: 'resistance' },
  { id: 'rope', name: 'Rope/Climbing Rope', category: 'other' },
  { id: 'backpack', name: 'Backpack (loadable)', category: 'other' },
  { id: 'towel', name: 'Towel', category: 'other' },
  { id: 'water_jugs', name: 'Water Jugs/Buckets', category: 'other' },
  { id: 'wall', name: 'Wall (for wall balls)', category: 'other' },
];

export const DIVISION_INFO = {
  men_open: { label: 'Men Open', sledPush: '152kg', sledPull: '103kg', farmers: '2x24kg', sandbag: '20kg', wallBall: '6kg/100 reps' },
  men_pro: { label: 'Men Pro', sledPush: '202kg', sledPull: '153kg', farmers: '2x32kg', sandbag: '30kg', wallBall: '9kg/100 reps' },
  women_open: { label: 'Women Open', sledPush: '102kg', sledPull: '78kg', farmers: '2x16kg', sandbag: '10kg', wallBall: '4kg/75 reps' },
  women_pro: { label: 'Women Pro', sledPush: '152kg', sledPull: '103kg', farmers: '2x24kg', sandbag: '20kg', wallBall: '6kg/75 reps' },
};

// Average station times by skill level (in seconds)
export const AVERAGE_TIMES = {
  beginner: {
    skierg: 300, sled_push: 180, sled_pull: 150, burpee_broad_jump: 300,
    rowing: 270, farmers_carry: 120, sandbag_lunges: 180, wall_balls: 300,
    runPer1k: 360 // 6 min/km
  },
  intermediate: {
    skierg: 240, sled_push: 120, sled_pull: 100, burpee_broad_jump: 240,
    rowing: 220, farmers_carry: 90, sandbag_lunges: 140, wall_balls: 240,
    runPer1k: 300 // 5 min/km
  },
  advanced: {
    skierg: 180, sled_push: 80, sled_pull: 70, burpee_broad_jump: 180,
    rowing: 180, farmers_carry: 70, sandbag_lunges: 100, wall_balls: 180,
    runPer1k: 240 // 4 min/km
  }
};
