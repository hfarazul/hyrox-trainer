'use client';

import { WorkoutSession, UserEquipment, RaceGoal } from './types';

const STORAGE_KEYS = {
  EQUIPMENT: 'hyrox_equipment',
  SESSIONS: 'hyrox_sessions',
  RACE_GOAL: 'hyrox_race_goal',
};

export function saveEquipment(equipment: UserEquipment[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.EQUIPMENT, JSON.stringify(equipment));
  }
}

export function loadEquipment(): UserEquipment[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(STORAGE_KEYS.EQUIPMENT);
  return data ? JSON.parse(data) : [];
}

export function saveSessions(sessions: WorkoutSession[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
  }
}

export function loadSessions(): WorkoutSession[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(STORAGE_KEYS.SESSIONS);
  return data ? JSON.parse(data) : [];
}

export function addSession(session: WorkoutSession): void {
  const sessions = loadSessions();
  sessions.unshift(session);
  saveSessions(sessions);
}

export function saveRaceGoal(goal: RaceGoal): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.RACE_GOAL, JSON.stringify(goal));
  }
}

export function loadRaceGoal(): RaceGoal | null {
  if (typeof window === 'undefined') return null;
  const data = localStorage.getItem(STORAGE_KEYS.RACE_GOAL);
  return data ? JSON.parse(data) : null;
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function parseTimeToSeconds(timeStr: string): number {
  const parts = timeStr.split(':');
  if (parts.length === 2) {
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  }
  return parseInt(timeStr) * 60;
}
