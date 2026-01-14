import { UserEquipment, WorkoutSession, RaceGoal, UserProgram } from './types';

// Equipment API
export async function fetchEquipment(): Promise<UserEquipment[]> {
  const response = await fetch('/api/equipment');
  if (!response.ok) {
    if (response.status === 401) return [];
    throw new Error('Failed to fetch equipment');
  }
  return response.json();
}

export async function saveEquipmentAPI(equipment: UserEquipment[]): Promise<void> {
  const response = await fetch('/api/equipment', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(equipment),
  });
  if (!response.ok && response.status !== 401) {
    throw new Error('Failed to save equipment');
  }
}

// Sessions API
export async function fetchSessions(): Promise<WorkoutSession[]> {
  const response = await fetch('/api/sessions');
  if (!response.ok) {
    if (response.status === 401) return [];
    throw new Error('Failed to fetch sessions');
  }
  const data = await response.json();
  // Transform database format to app format
  return data.map((session: {
    id: string;
    date: string;
    type: string;
    totalTime: number;
    notes?: string;
    stations: Array<{
      stationId: string;
      alternativeUsed?: string;
      timeSeconds: number;
      completed: boolean;
      notes?: string;
    }>;
  }) => ({
    id: session.id,
    date: session.date,
    type: session.type,
    totalTime: session.totalTime,
    stations: session.stations.map(s => ({
      stationId: s.stationId,
      alternativeUsed: s.alternativeUsed,
      timeSeconds: s.timeSeconds,
      completed: s.completed,
      notes: s.notes,
    })),
  }));
}

export async function addSessionAPI(session: Omit<WorkoutSession, 'id'>): Promise<WorkoutSession> {
  const response = await fetch('/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(session),
  });
  if (!response.ok) {
    throw new Error('Failed to save session');
  }
  return response.json();
}

export async function deleteSessionAPI(sessionId: string): Promise<void> {
  const response = await fetch(`/api/sessions?id=${encodeURIComponent(sessionId)}`, {
    method: 'DELETE',
  });
  if (!response.ok && response.status !== 401) {
    throw new Error('Failed to delete session');
  }
}

// Race Goal API
export async function fetchRaceGoal(): Promise<RaceGoal> {
  const response = await fetch('/api/race-goal');
  if (!response.ok) {
    if (response.status === 401) {
      return {
        targetTime: 75,
        division: 'men_open',
        fiveKTime: 25,
        experience: 'intermediate',
      };
    }
    throw new Error('Failed to fetch race goal');
  }
  return response.json();
}

export async function saveRaceGoalAPI(goal: RaceGoal): Promise<void> {
  const response = await fetch('/api/race-goal', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(goal),
  });
  if (!response.ok && response.status !== 401) {
    throw new Error('Failed to save race goal');
  }
}

// User Program API
export async function fetchUserProgram(): Promise<UserProgram | null> {
  const response = await fetch('/api/user-program');
  if (!response.ok) {
    if (response.status === 401) return null;
    throw new Error('Failed to fetch user program');
  }
  return response.json();
}

export async function startProgramAPI(programId: string): Promise<UserProgram> {
  const response = await fetch('/api/user-program', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ programId }),
  });
  if (!response.ok) {
    throw new Error('Failed to start program');
  }
  return response.json();
}

export async function quitProgramAPI(): Promise<void> {
  const response = await fetch('/api/user-program', {
    method: 'DELETE',
  });
  if (!response.ok && response.status !== 401) {
    throw new Error('Failed to quit program');
  }
}

export async function completeWorkoutAPI(
  week: number,
  dayOfWeek: number,
  sessionId?: string
): Promise<void> {
  const response = await fetch('/api/user-program/complete-workout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ week, dayOfWeek, sessionId }),
  });
  if (!response.ok && response.status !== 401) {
    throw new Error('Failed to complete workout');
  }
}
