import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { generatePersonalizedProgram, validatePersonalization } from '@/lib/program-generator';
import { ProgramPersonalization } from '@/lib/types';

// GET: Fetch user's current program with completed workouts
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
      return NextResponse.json(null);
    }

    // Parse programData if it exists (for personalized programs)
    let programData = null;
    if (userProgram.programData) {
      try {
        programData = JSON.parse(userProgram.programData);
      } catch {
        console.error('Failed to parse programData');
      }
    }

    // Parse weakStations if it exists
    let weakStations: string[] = [];
    if (userProgram.weakStations) {
      try {
        weakStations = JSON.parse(userProgram.weakStations);
      } catch {
        console.error('Failed to parse weakStations');
      }
    }

    // Transform to match the frontend UserProgram type
    return NextResponse.json({
      id: userProgram.id,
      programId: userProgram.programId,
      startDate: userProgram.startDate.toISOString(),
      raceDate: userProgram.raceDate?.toISOString() || null,
      fitnessLevel: userProgram.fitnessLevel || null,
      daysPerWeek: userProgram.daysPerWeek || null,
      weakStations,
      programData,
      completedWorkouts: userProgram.completedWorkouts.map(cw => ({
        week: cw.week,
        dayOfWeek: cw.dayOfWeek,
        sessionId: cw.sessionId || '',
        completedAt: cw.completedAt.toISOString(),
        actualDuration: cw.actualDuration,
        rpe: cw.rpe,
        completionStatus: cw.completionStatus,
        percentComplete: cw.percentComplete,
      })),
    });
  } catch (error) {
    console.error('Error fetching user program:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Start a new program (either template-based or personalized)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { programId, personalization } = body;

    // Validate input: either programId OR personalization must be provided
    if (!programId && !personalization) {
      return NextResponse.json(
        { error: 'Either programId or personalization is required' },
        { status: 400 }
      );
    }

    // Delete existing program if any (user can only have one active program)
    await prisma.userProgram.deleteMany({
      where: { userId: session.user.id },
    });

    // Handle personalized program creation
    if (personalization) {
      const validation = validatePersonalization(personalization as ProgramPersonalization);
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.errors.join(', ') },
          { status: 400 }
        );
      }

      const { fitnessLevel, daysPerWeek, raceDate, weakStations } =
        personalization as ProgramPersonalization;

      // Generate the personalized program
      const generatedProgram = generatePersonalizedProgram(personalization);

      // Create new personalized program
      const userProgram = await prisma.userProgram.create({
        data: {
          userId: session.user.id,
          programId: generatedProgram.id,
          startDate: new Date(),
          raceDate: raceDate ? new Date(raceDate) : null,
          fitnessLevel,
          daysPerWeek,
          weakStations: weakStations ? JSON.stringify(weakStations) : null,
          programData: JSON.stringify(generatedProgram),
        },
        include: {
          completedWorkouts: true,
        },
      });

      return NextResponse.json({
        id: userProgram.id,
        programId: userProgram.programId,
        startDate: userProgram.startDate.toISOString(),
        raceDate: userProgram.raceDate?.toISOString() || null,
        fitnessLevel: userProgram.fitnessLevel,
        daysPerWeek: userProgram.daysPerWeek,
        weakStations: weakStations || [],
        programData: generatedProgram,
        completedWorkouts: [],
      });
    }

    // Handle template-based program (legacy path)
    if (!programId || typeof programId !== 'string') {
      return NextResponse.json({ error: 'Invalid program ID' }, { status: 400 });
    }

    const userProgram = await prisma.userProgram.create({
      data: {
        userId: session.user.id,
        programId,
        startDate: new Date(),
      },
      include: {
        completedWorkouts: true,
      },
    });

    return NextResponse.json({
      id: userProgram.id,
      programId: userProgram.programId,
      startDate: userProgram.startDate.toISOString(),
      raceDate: null,
      fitnessLevel: null,
      daysPerWeek: null,
      weakStations: [],
      programData: null,
      completedWorkouts: [],
    });
  } catch (error) {
    console.error('Error creating user program:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: Quit/delete the current program
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.userProgram.deleteMany({
      where: { userId: session.user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user program:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
