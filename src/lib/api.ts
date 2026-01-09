import { UserEquipment, WorkoutSession, RaceGoal } from './types';

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
