import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST, DELETE } from '@/app/api/sessions/route';

// Mock next-auth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  default: {
    workoutSession: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
  },
}));

// Mock auth options
vi.mock('@/lib/auth', () => ({
  authOptions: {},
}));

import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';

describe('Sessions API - GET', () => {
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

  it('returns user sessions', async () => {
    const mockSessions = [
      { id: 'session-1', type: 'full_simulation', totalTime: 4500, stations: [] },
      { id: 'session-2', type: 'quick_workout', totalTime: 1800, stations: [] },
    ];

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user-123' },
      expires: '',
    });
    vi.mocked(prisma.workoutSession.findMany).mockResolvedValue(mockSessions);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockSessions);
    expect(prisma.workoutSession.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-123' },
      include: { stations: true },
      orderBy: { date: 'desc' },
      take: 100,
    });
  });

  it('returns empty array when no sessions', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user-123' },
      expires: '',
    });
    vi.mocked(prisma.workoutSession.findMany).mockResolvedValue([]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual([]);
  });

  it('returns 500 on database error', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user-123' },
      expires: '',
    });
    vi.mocked(prisma.workoutSession.findMany).mockRejectedValue(new Error('DB error'));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});

describe('Sessions API - POST', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createRequest = (body: object) => {
    return new NextRequest('http://localhost/api/sessions', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  };

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const request = createRequest({
      type: 'full_simulation',
      totalTime: 4500,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 400 when type is missing', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user-123' },
      expires: '',
    });

    const request = createRequest({
      totalTime: 4500,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid request body');
  });

  it('returns 400 when totalTime is not a number', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user-123' },
      expires: '',
    });

    const request = createRequest({
      type: 'full_simulation',
      totalTime: '4500',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid request body');
  });

  it('creates session with valid data', async () => {
    const mockSession = {
      id: 'session-1',
      userId: 'user-123',
      type: 'full_simulation',
      totalTime: 4500,
      gymMode: false,
      stations: [],
    };

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user-123' },
      expires: '',
    });
    vi.mocked(prisma.workoutSession.count).mockResolvedValue(5);
    vi.mocked(prisma.workoutSession.create).mockResolvedValue(mockSession);

    const request = createRequest({
      type: 'full_simulation',
      totalTime: 4500,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data).toEqual(mockSession);
  });

  it('creates session with stations', async () => {
    const mockSession = {
      id: 'session-1',
      userId: 'user-123',
      type: 'full_simulation',
      totalTime: 4500,
      gymMode: false,
      stations: [
        { stationId: 'skierg', timeSeconds: 240, completed: true },
      ],
    };

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user-123' },
      expires: '',
    });
    vi.mocked(prisma.workoutSession.count).mockResolvedValue(5);
    vi.mocked(prisma.workoutSession.create).mockResolvedValue(mockSession);

    const request = createRequest({
      type: 'full_simulation',
      totalTime: 4500,
      stations: [
        { stationId: 'skierg', timeSeconds: 240 },
      ],
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(prisma.workoutSession.create).toHaveBeenCalled();
  });

  it('deletes oldest session when at MAX_SESSIONS limit', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user-123' },
      expires: '',
    });
    vi.mocked(prisma.workoutSession.count).mockResolvedValue(100);
    vi.mocked(prisma.workoutSession.findFirst).mockResolvedValue({
      id: 'oldest-session',
      userId: 'user-123',
      type: 'full_simulation',
      totalTime: 3000,
    });
    vi.mocked(prisma.workoutSession.delete).mockResolvedValue({});
    vi.mocked(prisma.workoutSession.create).mockResolvedValue({
      id: 'new-session',
      userId: 'user-123',
      type: 'full_simulation',
      totalTime: 4500,
      gymMode: false,
      stations: [],
    });

    const request = createRequest({
      type: 'full_simulation',
      totalTime: 4500,
    });

    const response = await POST(request);

    expect(response.status).toBe(201);
    expect(prisma.workoutSession.delete).toHaveBeenCalledWith({
      where: { id: 'oldest-session' },
    });
  });

  it('sets gymMode from request body', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user-123' },
      expires: '',
    });
    vi.mocked(prisma.workoutSession.count).mockResolvedValue(5);
    vi.mocked(prisma.workoutSession.create).mockResolvedValue({
      id: 'session-1',
      userId: 'user-123',
      type: 'full_simulation',
      totalTime: 4500,
      gymMode: true,
      stations: [],
    });

    const request = createRequest({
      type: 'full_simulation',
      totalTime: 4500,
      gymMode: true,
    });

    const response = await POST(request);

    expect(response.status).toBe(201);
    expect(prisma.workoutSession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          gymMode: true,
        }),
      })
    );
  });
});

describe('Sessions API - DELETE', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createDeleteRequest = (id?: string) => {
    const url = id
      ? `http://localhost/api/sessions?id=${id}`
      : 'http://localhost/api/sessions';
    return new NextRequest(url, { method: 'DELETE' });
  };

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const request = createDeleteRequest('session-1');

    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 400 when session ID is missing', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user-123' },
      expires: '',
    });

    const request = createDeleteRequest();

    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Session ID required');
  });

  it('returns 404 when session not found', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user-123' },
      expires: '',
    });
    vi.mocked(prisma.workoutSession.findFirst).mockResolvedValue(null);

    const request = createDeleteRequest('non-existent');

    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Session not found');
  });

  it('returns 404 when session belongs to different user', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user-123' },
      expires: '',
    });
    // findFirst returns null because query requires userId match
    vi.mocked(prisma.workoutSession.findFirst).mockResolvedValue(null);

    const request = createDeleteRequest('other-users-session');

    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Session not found');
  });

  it('deletes session successfully', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user-123' },
      expires: '',
    });
    vi.mocked(prisma.workoutSession.findFirst).mockResolvedValue({
      id: 'session-1',
      userId: 'user-123',
      type: 'full_simulation',
      totalTime: 4500,
    });
    vi.mocked(prisma.workoutSession.delete).mockResolvedValue({});

    const request = createDeleteRequest('session-1');

    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(prisma.workoutSession.delete).toHaveBeenCalledWith({
      where: { id: 'session-1' },
    });
  });

  it('verifies session ownership before deleting', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user-123' },
      expires: '',
    });

    const request = createDeleteRequest('session-1');
    await DELETE(request);

    expect(prisma.workoutSession.findFirst).toHaveBeenCalledWith({
      where: { id: 'session-1', userId: 'user-123' },
    });
  });
});
