import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PUT } from '@/app/api/race-goal/route';

// Mock next-auth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  default: {
    raceGoal: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

// Mock auth options
vi.mock('@/lib/auth', () => ({
  authOptions: {},
}));

import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';

describe('Race Goal API - GET', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns default values when no race goal exists', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user-123' },
      expires: '',
    });
    vi.mocked(prisma.raceGoal.findUnique).mockResolvedValue(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      targetTime: 75,
      division: 'men_open',
      fiveKTime: 25,
      experience: 'intermediate',
    });
  });

  it('returns existing race goal', async () => {
    const mockGoal = {
      id: 'goal-1',
      userId: 'user-123',
      targetTime: 80,
      division: 'women_open',
      fiveKTime: 22,
      experience: 'advanced',
    };

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user-123' },
      expires: '',
    });
    vi.mocked(prisma.raceGoal.findUnique).mockResolvedValue(mockGoal);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockGoal);
  });

  it('returns 500 on database error', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user-123' },
      expires: '',
    });
    vi.mocked(prisma.raceGoal.findUnique).mockRejectedValue(new Error('DB error'));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});

describe('Race Goal API - PUT', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createRequest = (body: object) => {
    return new NextRequest('http://localhost/api/race-goal', {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  };

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const request = createRequest({
      targetTime: 75,
      division: 'men_open',
      fiveKTime: 25,
      experience: 'intermediate',
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 400 for invalid types', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user-123' },
      expires: '',
    });

    const request = createRequest({
      targetTime: '75', // Should be number
      division: 'men_open',
      fiveKTime: 25,
      experience: 'intermediate',
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid request body');
  });

  it('returns 400 for invalid division value', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user-123' },
      expires: '',
    });

    const request = createRequest({
      targetTime: 75,
      division: 'invalid_division',
      fiveKTime: 25,
      experience: 'intermediate',
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid division value');
  });

  it('returns 400 for invalid experience value', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user-123' },
      expires: '',
    });

    const request = createRequest({
      targetTime: 75,
      division: 'men_open',
      fiveKTime: 25,
      experience: 'expert', // Invalid
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid experience value');
  });

  it('returns 400 when targetTime is below minimum', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user-123' },
      expires: '',
    });

    const request = createRequest({
      targetTime: 20, // Min is 30
      division: 'men_open',
      fiveKTime: 25,
      experience: 'intermediate',
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Target time must be between 30 and 300 minutes');
  });

  it('returns 400 when targetTime is above maximum', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user-123' },
      expires: '',
    });

    const request = createRequest({
      targetTime: 350, // Max is 300
      division: 'men_open',
      fiveKTime: 25,
      experience: 'intermediate',
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Target time must be between 30 and 300 minutes');
  });

  it('returns 400 when fiveKTime is out of range', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user-123' },
      expires: '',
    });

    const request = createRequest({
      targetTime: 75,
      division: 'men_open',
      fiveKTime: 5, // Min is 10
      experience: 'intermediate',
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('5K time must be between 10 and 60 minutes');
  });

  it('creates/updates race goal with valid data', async () => {
    const mockGoal = {
      id: 'goal-1',
      userId: 'user-123',
      targetTime: 80,
      division: 'women_pro',
      fiveKTime: 22,
      experience: 'advanced',
    };

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user-123' },
      expires: '',
    });
    vi.mocked(prisma.raceGoal.upsert).mockResolvedValue(mockGoal);

    const request = createRequest({
      targetTime: 80,
      division: 'women_pro',
      fiveKTime: 22,
      experience: 'advanced',
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockGoal);
    expect(prisma.raceGoal.upsert).toHaveBeenCalledWith({
      where: { userId: 'user-123' },
      update: { targetTime: 80, division: 'women_pro', fiveKTime: 22, experience: 'advanced' },
      create: {
        userId: 'user-123',
        targetTime: 80,
        division: 'women_pro',
        fiveKTime: 22,
        experience: 'advanced',
      },
    });
  });

  it('accepts boundary values', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user-123' },
      expires: '',
    });
    vi.mocked(prisma.raceGoal.upsert).mockResolvedValue({
      id: 'goal-1',
      userId: 'user-123',
      targetTime: 30,
      division: 'men_open',
      fiveKTime: 10,
      experience: 'beginner',
    });

    const request = createRequest({
      targetTime: 30, // Min boundary
      division: 'men_open',
      fiveKTime: 10, // Min boundary
      experience: 'beginner',
    });

    const response = await PUT(request);
    expect(response.status).toBe(200);
  });
});
