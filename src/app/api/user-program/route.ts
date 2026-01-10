import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

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

    // Transform to match the frontend UserProgram type
    return NextResponse.json({
      id: userProgram.id,
      programId: userProgram.programId,
      startDate: userProgram.startDate.toISOString(),
      completedWorkouts: userProgram.completedWorkouts.map(cw => ({
        week: cw.week,
        dayOfWeek: cw.dayOfWeek,
        sessionId: cw.sessionId || '',
        completedAt: cw.completedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Error fetching user program:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Start a new program
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { programId } = body;

    if (!programId || typeof programId !== 'string') {
      return NextResponse.json({ error: 'Invalid program ID' }, { status: 400 });
    }

    // Delete existing program if any (user can only have one active program)
    await prisma.userProgram.deleteMany({
      where: { userId: session.user.id },
    });

    // Create new program
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
