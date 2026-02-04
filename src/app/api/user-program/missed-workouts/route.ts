import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getMissedWorkoutSummary } from '@/lib/missed-workout-detector';
import { GeneratedProgram } from '@/lib/program-generator';

// GET: Fetch missed workouts for the user's current program
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userProgram = await prisma.userProgram.findUnique({
      where: { userId: session.user.id },
      include: {
        completedWorkouts: {
          orderBy: { completedAt: 'asc' },
        },
      },
    });

    if (!userProgram) {
      return NextResponse.json({ error: 'No active program found' }, { status: 404 });
    }

    // Parse programData
    if (!userProgram.programData) {
      return NextResponse.json({ error: 'Program data not found' }, { status: 404 });
    }

    let programData: GeneratedProgram;
    try {
      programData = JSON.parse(userProgram.programData) as GeneratedProgram;
    } catch {
      return NextResponse.json({ error: 'Invalid program data' }, { status: 500 });
    }

    // Transform completed workouts to match the expected type
    const completedWorkouts = userProgram.completedWorkouts.map(cw => ({
      week: cw.week,
      dayOfWeek: cw.dayOfWeek,
      sessionId: cw.sessionId || '',
      completedAt: cw.completedAt.toISOString(),
      actualDuration: cw.actualDuration,
      rpe: cw.rpe,
      completionStatus: cw.completionStatus,
      percentComplete: cw.percentComplete,
    }));

    // Get missed workout summary
    const summary = getMissedWorkoutSummary(
      userProgram.startDate,
      programData,
      completedWorkouts
    );

    return NextResponse.json({
      missedWorkouts: summary.missedWorkouts.map(m => ({
        week: m.week,
        dayOfWeek: m.dayOfWeek,
        dayName: m.dayName,
        workoutType: m.workout.type,
        workoutParams: m.workout.params,
        estimatedMinutes: m.workout.estimatedMinutes,
        daysSinceMissed: m.daysSinceMissed,
        importance: m.importance,
        suggestedAction: m.suggestedAction,
        impactOnReadiness: m.impactOnReadiness,
      })),
      totalMissed: summary.totalMissed,
      readinessImpact: summary.readinessImpact,
      recommendations: summary.recommendations,
    });
  } catch (error) {
    console.error('Error fetching missed workouts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
