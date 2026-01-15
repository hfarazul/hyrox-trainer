'use client';

import { WorkoutSession, UserEquipment, RaceGoal, UserProgram } from './types';

const STORAGE_KEYS = {
  EQUIPMENT: 'hyrox_equipment',
  SESSIONS: 'hyrox_sessions',
  RACE_GOAL: 'hyrox_race_goal',
  EXCLUDED_EXERCISES: 'hyrox_excluded_exercises',
  USER_PROGRAM: 'hyrox_user_program',
  INCLUDE_RUNS: 'hyrox_include_runs',
};

const MAX_SESSIONS = 100;

// Safe JSON parse with validation
function safeJsonParse<T>(data: string | null, validator: (parsed: unknown) => T | null): T | null {
  if (!data) return null;
  try {
    const parsed = JSON.parse(data);
    return validator(parsed);
  } catch {
    console.error('Failed to parse stored data');
    return null;
  }
}

// Validators
function validateEquipmentArray(parsed: unknown): UserEquipment[] | null {
  if (!Array.isArray(parsed)) return null;
  return parsed.filter(
    (item): item is UserEquipment =>
      typeof item === 'object' &&
      item !== null &&
      typeof item.equipmentId === 'string' &&
      typeof item.available === 'boolean'
  );
}

function validateSessionsArray(parsed: unknown): WorkoutSession[] | null {
  if (!Array.isArray(parsed)) return null;
  return parsed.filter(
    (item): item is WorkoutSession =>
      typeof item === 'object' &&
      item !== null &&
      typeof item.id === 'string' &&
      typeof item.date === 'string' &&
      typeof item.totalTime === 'number' &&
      Array.isArray(item.stations)
  );
}

function validateRaceGoal(parsed: unknown): RaceGoal | null {
  if (
    typeof parsed === 'object' &&
    parsed !== null &&
    'targetTime' in parsed &&
    'division' in parsed &&
    'fiveKTime' in parsed &&
    'experience' in parsed
  ) {
    return parsed as RaceGoal;
  }
  return null;
}

export function saveEquipment(equipment: UserEquipment[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.EQUIPMENT, JSON.stringify(equipment));
  }
}

export function loadEquipment(): UserEquipment[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(STORAGE_KEYS.EQUIPMENT);
  return safeJsonParse(data, validateEquipmentArray) ?? [];
}

export function saveSessions(sessions: WorkoutSession[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
  }
}

export function loadSessions(): WorkoutSession[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(STORAGE_KEYS.SESSIONS);
  return safeJsonParse(data, validateSessionsArray) ?? [];
}

export function addSession(session: WorkoutSession): void {
  const sessions = loadSessions();
  sessions.unshift(session);
  // Limit sessions to prevent unbounded growth
  if (sessions.length > MAX_SESSIONS) {
    sessions.length = MAX_SESSIONS;
  }
  saveSessions(sessions);
}

export function updateSession(session: WorkoutSession): void {
  const sessions = loadSessions();
  const index = sessions.findIndex(s => s.id === session.id);
  if (index !== -1) {
    sessions[index] = session;
  } else {
    // If not found, add as new session
    sessions.unshift(session);
    if (sessions.length > MAX_SESSIONS) {
      sessions.length = MAX_SESSIONS;
    }
  }
  saveSessions(sessions);
}

export function deleteSession(sessionId: string): void {
  const sessions = loadSessions();
  const filtered = sessions.filter(s => s.id !== sessionId);
  saveSessions(filtered);
}

export function saveRaceGoal(goal: RaceGoal): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.RACE_GOAL, JSON.stringify(goal));
  }
}

export function loadRaceGoal(): RaceGoal | null {
  if (typeof window === 'undefined') return null;
  const data = localStorage.getItem(STORAGE_KEYS.RACE_GOAL);
  return safeJsonParse(data, validateRaceGoal);
}

// Excluded exercises storage
export function saveExcludedExercises(exercises: string[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.EXCLUDED_EXERCISES, JSON.stringify(exercises));
  }
}

export function loadExcludedExercises(): string[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(STORAGE_KEYS.EXCLUDED_EXERCISES);
  if (!data) return [];
  try {
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) {
      return parsed;
    }
  } catch {
    console.error('Failed to parse excluded exercises');
  }
  return [];
}

// Include runs preference (gym mode toggle)
export function saveIncludeRuns(includeRuns: boolean): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.INCLUDE_RUNS, JSON.stringify(includeRuns));
  }
}

export function loadIncludeRuns(): boolean {
  if (typeof window === 'undefined') return true;
  const data = localStorage.getItem(STORAGE_KEYS.INCLUDE_RUNS);
  if (!data) return true; // Default to true (include runs)
  try {
    return JSON.parse(data) === false ? false : true;
  } catch {
    return true;
  }
}

export function generateId(): string {
  // Use crypto.randomUUID for secure ID generation
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback with better entropy
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint32Array(4);
    crypto.getRandomValues(array);
    return Array.from(array, n => n.toString(16).padStart(8, '0')).join('-');
  }
  // Last resort fallback
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '0:00';
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function parseTimeToSeconds(timeStr: string): number {
  const parts = timeStr.split(':');
  if (parts.length === 2) {
    const mins = parseInt(parts[0], 10);
    const secs = parseInt(parts[1], 10);
    if (!isNaN(mins) && !isNaN(secs)) {
      return mins * 60 + secs;
    }
  }
  const mins = parseInt(timeStr, 10);
  return isNaN(mins) ? 0 : mins * 60;
}

// User Program storage
function validateUserProgram(parsed: unknown): UserProgram | null {
  if (
    typeof parsed === 'object' &&
    parsed !== null &&
    'id' in parsed &&
    'programId' in parsed &&
    'startDate' in parsed &&
    'completedWorkouts' in parsed &&
    Array.isArray((parsed as UserProgram).completedWorkouts)
  ) {
    return parsed as UserProgram;
  }
  return null;
}

export function saveUserProgram(program: UserProgram): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.USER_PROGRAM, JSON.stringify(program));
  }
}

export function loadUserProgram(): UserProgram | null {
  if (typeof window === 'undefined') return null;
  const data = localStorage.getItem(STORAGE_KEYS.USER_PROGRAM);
  return safeJsonParse(data, validateUserProgram);
}

export function clearUserProgram(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEYS.USER_PROGRAM);
  }
}

export function addCompletedProgramWorkout(
  week: number,
  dayOfWeek: number,
  sessionId: string
): void {
  const program = loadUserProgram();
  if (!program) return;

  program.completedWorkouts.push({
    week,
    dayOfWeek,
    sessionId,
    completedAt: new Date().toISOString(),
  });

  saveUserProgram(program);
}
