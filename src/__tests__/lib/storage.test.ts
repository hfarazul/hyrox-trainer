import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  formatTime,
  parseTimeToSeconds,
  generateId,
  loadEquipment,
  saveEquipment,
  loadSessions,
  saveSessions,
  addSession,
  updateSession,
  deleteSession,
  loadRaceGoal,
  saveRaceGoal,
  loadExcludedExercises,
  saveExcludedExercises,
  loadIncludeRuns,
  saveIncludeRuns,
} from '@/lib/storage';
import type { WorkoutSession, UserEquipment, RaceGoal } from '@/lib/types';

describe('formatTime', () => {
  it('formats 0 seconds correctly', () => {
    expect(formatTime(0)).toBe('0:00');
  });

  it('formats seconds under a minute correctly', () => {
    expect(formatTime(45)).toBe('0:45');
  });

  it('formats exact minutes correctly', () => {
    expect(formatTime(60)).toBe('1:00');
    expect(formatTime(120)).toBe('2:00');
  });

  it('formats minutes and seconds correctly', () => {
    expect(formatTime(90)).toBe('1:30');
    expect(formatTime(125)).toBe('2:05');
    expect(formatTime(3661)).toBe('61:01');
  });

  it('handles negative numbers by returning 0:00', () => {
    expect(formatTime(-1)).toBe('0:00');
    expect(formatTime(-100)).toBe('0:00');
  });

  it('handles NaN by returning 0:00', () => {
    expect(formatTime(NaN)).toBe('0:00');
  });

  it('handles Infinity by returning 0:00', () => {
    expect(formatTime(Infinity)).toBe('0:00');
    expect(formatTime(-Infinity)).toBe('0:00');
  });

  it('handles large numbers correctly', () => {
    expect(formatTime(3600)).toBe('60:00');
    expect(formatTime(7200)).toBe('120:00');
  });
});

describe('parseTimeToSeconds', () => {
  it('parses MM:SS format correctly', () => {
    expect(parseTimeToSeconds('5:30')).toBe(330);
    expect(parseTimeToSeconds('1:00')).toBe(60);
    expect(parseTimeToSeconds('0:45')).toBe(45);
  });

  it('parses minutes-only string correctly', () => {
    expect(parseTimeToSeconds('5')).toBe(300);
    expect(parseTimeToSeconds('10')).toBe(600);
  });

  it('returns 0 for invalid input', () => {
    expect(parseTimeToSeconds('invalid')).toBe(0);
    expect(parseTimeToSeconds('')).toBe(0);
    expect(parseTimeToSeconds('abc:def')).toBe(0);
  });

  it('handles edge cases', () => {
    expect(parseTimeToSeconds('0:00')).toBe(0);
    expect(parseTimeToSeconds('60:00')).toBe(3600);
  });
});

describe('generateId', () => {
  it('returns a string', () => {
    const id = generateId();
    expect(typeof id).toBe('string');
  });

  it('generates unique IDs', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateId());
    }
    expect(ids.size).toBe(100);
  });
});

describe('Equipment storage', () => {
  beforeEach(() => {
    vi.mocked(localStorage.getItem).mockReturnValue(null);
    vi.mocked(localStorage.setItem).mockClear();
  });

  it('loadEquipment returns empty array when no data', () => {
    expect(loadEquipment()).toEqual([]);
  });

  it('loadEquipment returns parsed equipment array', () => {
    const mockEquipment: UserEquipment[] = [
      { equipmentId: 'dumbbells', available: true },
      { equipmentId: 'kettlebell', available: false },
    ];
    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify(mockEquipment));

    expect(loadEquipment()).toEqual(mockEquipment);
  });

  it('loadEquipment filters out invalid items', () => {
    const mixedData = [
      { equipmentId: 'valid', available: true },
      { invalid: 'item' },
      { equipmentId: 123, available: 'wrong' },
    ];
    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify(mixedData));

    const result = loadEquipment();
    expect(result).toHaveLength(1);
    expect(result[0].equipmentId).toBe('valid');
  });

  it('saveEquipment stores data in localStorage', () => {
    const equipment: UserEquipment[] = [{ equipmentId: 'test', available: true }];
    saveEquipment(equipment);

    expect(localStorage.setItem).toHaveBeenCalledWith(
      'hyrox_equipment',
      JSON.stringify(equipment)
    );
  });
});

describe('Sessions storage', () => {
  beforeEach(() => {
    vi.mocked(localStorage.getItem).mockReturnValue(null);
    vi.mocked(localStorage.setItem).mockClear();
  });

  const createMockSession = (id: string): WorkoutSession => ({
    id,
    date: new Date().toISOString(),
    type: 'full_simulation',
    stations: [],
    totalTime: 3600,
  });

  it('loadSessions returns empty array when no data', () => {
    expect(loadSessions()).toEqual([]);
  });

  it('loadSessions returns parsed sessions array', () => {
    const mockSessions = [createMockSession('1'), createMockSession('2')];
    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify(mockSessions));

    expect(loadSessions()).toEqual(mockSessions);
  });

  it('loadSessions filters out invalid sessions', () => {
    const mixedData = [
      createMockSession('valid'),
      { invalid: 'session' },
      { id: 'missing-fields' },
    ];
    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify(mixedData));

    const result = loadSessions();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('valid');
  });

  it('addSession prepends to existing sessions', () => {
    const existingSessions = [createMockSession('existing')];
    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify(existingSessions));

    const newSession = createMockSession('new');
    addSession(newSession);

    const savedData = JSON.parse(
      vi.mocked(localStorage.setItem).mock.calls[0][1]
    );
    expect(savedData[0].id).toBe('new');
    expect(savedData[1].id).toBe('existing');
  });

  it('addSession respects MAX_SESSIONS limit (100)', () => {
    const manySessions = Array.from({ length: 100 }, (_, i) =>
      createMockSession(`session-${i}`)
    );
    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify(manySessions));

    addSession(createMockSession('new'));

    const savedData = JSON.parse(
      vi.mocked(localStorage.setItem).mock.calls[0][1]
    );
    expect(savedData).toHaveLength(100);
    expect(savedData[0].id).toBe('new');
  });

  it('updateSession updates existing session', () => {
    const sessions = [createMockSession('1'), createMockSession('2')];
    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify(sessions));

    const updated = { ...createMockSession('1'), totalTime: 9999 };
    updateSession(updated);

    const savedData = JSON.parse(
      vi.mocked(localStorage.setItem).mock.calls[0][1]
    );
    expect(savedData.find((s: WorkoutSession) => s.id === '1').totalTime).toBe(9999);
  });

  it('deleteSession removes session by id', () => {
    const sessions = [createMockSession('1'), createMockSession('2')];
    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify(sessions));

    deleteSession('1');

    const savedData = JSON.parse(
      vi.mocked(localStorage.setItem).mock.calls[0][1]
    );
    expect(savedData).toHaveLength(1);
    expect(savedData[0].id).toBe('2');
  });
});

describe('RaceGoal storage', () => {
  beforeEach(() => {
    vi.mocked(localStorage.getItem).mockReturnValue(null);
    vi.mocked(localStorage.setItem).mockClear();
  });

  const mockGoal: RaceGoal = {
    targetTime: 75,
    division: 'men_open',
    fiveKTime: 25,
    experience: 'intermediate',
  };

  it('loadRaceGoal returns null when no data', () => {
    expect(loadRaceGoal()).toBeNull();
  });

  it('loadRaceGoal returns parsed goal', () => {
    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify(mockGoal));
    expect(loadRaceGoal()).toEqual(mockGoal);
  });

  it('loadRaceGoal returns null for invalid data', () => {
    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify({ incomplete: true }));
    expect(loadRaceGoal()).toBeNull();
  });

  it('saveRaceGoal stores data in localStorage', () => {
    saveRaceGoal(mockGoal);
    expect(localStorage.setItem).toHaveBeenCalledWith(
      'hyrox_race_goal',
      JSON.stringify(mockGoal)
    );
  });
});

describe('ExcludedExercises storage', () => {
  beforeEach(() => {
    vi.mocked(localStorage.getItem).mockReturnValue(null);
  });

  it('loadExcludedExercises returns empty array when no data', () => {
    expect(loadExcludedExercises()).toEqual([]);
  });

  it('loadExcludedExercises returns parsed array', () => {
    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify(['ex1', 'ex2']));
    expect(loadExcludedExercises()).toEqual(['ex1', 'ex2']);
  });

  it('loadExcludedExercises returns empty array for invalid data', () => {
    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify({ not: 'array' }));
    expect(loadExcludedExercises()).toEqual([]);
  });
});

describe('IncludeRuns storage', () => {
  beforeEach(() => {
    vi.mocked(localStorage.getItem).mockReturnValue(null);
  });

  it('loadIncludeRuns returns true by default', () => {
    expect(loadIncludeRuns()).toBe(true);
  });

  it('loadIncludeRuns returns false when stored as false', () => {
    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify(false));
    expect(loadIncludeRuns()).toBe(false);
  });

  it('loadIncludeRuns returns true for invalid data', () => {
    vi.mocked(localStorage.getItem).mockReturnValue('invalid json');
    expect(loadIncludeRuns()).toBe(true);
  });
});
