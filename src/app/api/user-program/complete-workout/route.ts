import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// POST: Mark a workout as complete
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { week, dayOfWeek, sessionId } = body;

    if (typeof week !== 'number' || typeof dayOfWeek !== 'number') {
      return NextResponse.json({ error: 'Invalid week or dayOfWeek' }, { status: 400 });
    }

    // Get user's current program
    const userProgram = await prisma.userProgram.findUnique({
      where: { userId: session.user.id },
    });

    if (!userProgram) {
      return NextResponse.json({ error: 'No active program found' }, { status: 404 });
    }

    // Create or update the completed workout (upsert to handle duplicate completions)
    const completedWorkout = await prisma.completedProgramWorkout.upsert({
      where: {
        userProgramId_week_dayOfWeek: {
          userProgramId: userProgram.id,
          week,
          dayOfWeek,
        },
      },
      update: {
        sessionId: sessionId || null,
        completedAt: new Date(),
      },
      create: {
        userProgramId: userProgram.id,
        week,
        dayOfWeek,
        sessionId: sessionId || null,
      },
    });

    return NextResponse.json({
      week: completedWorkout.week,
      dayOfWeek: completedWorkout.dayOfWeek,
      sessionId: completedWorkout.sessionId || '',
      completedAt: completedWorkout.completedAt.toISOString(),
    });
  } catch (error) {
    console.error('Error completing workout:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
