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
    const {
      week,
      dayOfWeek,
      sessionId,
      // New performance tracking fields
      actualDuration,
      rpe,
      completionStatus = 'full',
      percentComplete = 100,
      performanceData,
    } = body;

    if (typeof week !== 'number' || typeof dayOfWeek !== 'number') {
      return NextResponse.json({ error: 'Invalid week or dayOfWeek' }, { status: 400 });
    }

    // Validate optional fields
    if (rpe !== undefined && (typeof rpe !== 'number' || rpe < 1 || rpe > 10)) {
      return NextResponse.json({ error: 'RPE must be a number between 1 and 10' }, { status: 400 });
    }

    if (completionStatus && !['full', 'partial', 'skipped'].includes(completionStatus)) {
      return NextResponse.json({ error: 'Invalid completion status' }, { status: 400 });
    }

    if (percentComplete !== undefined && (typeof percentComplete !== 'number' || percentComplete < 0 || percentComplete > 100)) {
      return NextResponse.json({ error: 'Percent complete must be between 0 and 100' }, { status: 400 });
    }

    // Get user's current program
    const userProgram = await prisma.userProgram.findUnique({
      where: { userId: session.user.id },
    });

    if (!userProgram) {
      return NextResponse.json({ error: 'No active program found' }, { status: 404 });
    }

    // Prepare performance data JSON if provided
    const performanceDataJson = performanceData ? JSON.stringify(performanceData) : null;

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
        actualDuration: actualDuration ?? null,
        rpe: rpe ?? null,
        completionStatus,
        percentComplete,
        performanceData: performanceDataJson,
      },
      create: {
        userProgramId: userProgram.id,
        week,
        dayOfWeek,
        sessionId: sessionId || null,
        actualDuration: actualDuration ?? null,
        rpe: rpe ?? null,
        completionStatus,
        percentComplete,
        performanceData: performanceDataJson,
      },
    });

    return NextResponse.json({
      week: completedWorkout.week,
      dayOfWeek: completedWorkout.dayOfWeek,
      sessionId: completedWorkout.sessionId || '',
      completedAt: completedWorkout.completedAt.toISOString(),
      actualDuration: completedWorkout.actualDuration,
      rpe: completedWorkout.rpe,
      completionStatus: completedWorkout.completionStatus,
      percentComplete: completedWorkout.percentComplete,
    });
  } catch (error) {
    console.error('Error completing workout:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
