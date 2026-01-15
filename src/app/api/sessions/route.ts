import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

const MAX_SESSIONS = 100;

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workoutSessions = await prisma.workoutSession.findMany({
      where: { userId: session.user.id },
      include: { stations: true },
      orderBy: { date: 'desc' },
      take: MAX_SESSIONS,
    });

    return NextResponse.json(workoutSessions);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('id');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    // Verify the session belongs to the user
    const workoutSession = await prisma.workoutSession.findFirst({
      where: { id: sessionId, userId: session.user.id },
    });

    if (!workoutSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    await prisma.workoutSession.delete({
      where: { id: sessionId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, totalTime, notes, stations, gymMode } = body;

    if (!type || typeof totalTime !== 'number') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    // Enforce max sessions limit
    const sessionCount = await prisma.workoutSession.count({
      where: { userId: session.user.id },
    });

    if (sessionCount >= MAX_SESSIONS) {
      // Delete oldest session
      const oldest = await prisma.workoutSession.findFirst({
        where: { userId: session.user.id },
        orderBy: { date: 'asc' },
      });

      if (oldest) {
        await prisma.workoutSession.delete({
          where: { id: oldest.id },
        });
      }
    }

    const workoutSession = await prisma.workoutSession.create({
      data: {
        userId: session.user.id,
        type,
        totalTime,
        notes,
        gymMode: gymMode ?? false,
        stations: stations ? {
          create: stations.map((s: { stationId: string; alternativeUsed?: string; timeSeconds: number; completed?: boolean; notes?: string }) => ({
            stationId: s.stationId,
            alternativeUsed: s.alternativeUsed,
            timeSeconds: s.timeSeconds,
            completed: s.completed ?? true,
            notes: s.notes,
          })),
        } : undefined,
      },
      include: { stations: true },
    });

    return NextResponse.json(workoutSession, { status: 201 });
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
