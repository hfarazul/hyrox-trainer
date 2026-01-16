import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const raceGoal = await prisma.raceGoal.findUnique({
      where: { userId: session.user.id },
    });

    if (!raceGoal) {
      // Return default values if no race goal exists
      return NextResponse.json({
        targetTime: 75,
        division: 'men_open',
        fiveKTime: 25,
        experience: 'intermediate',
      });
    }

    return NextResponse.json(raceGoal);
  } catch (error) {
    console.error('Error fetching race goal:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Valid enum values for validation
const VALID_DIVISIONS = ['men_open', 'men_pro', 'women_open', 'women_pro'] as const;
const VALID_EXPERIENCES = ['beginner', 'intermediate', 'advanced'] as const;

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { targetTime, division, fiveKTime, experience } = body;

    // Type validation
    if (
      typeof targetTime !== 'number' ||
      typeof division !== 'string' ||
      typeof fiveKTime !== 'number' ||
      typeof experience !== 'string'
    ) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    // Enum validation for division and experience
    if (!VALID_DIVISIONS.includes(division as typeof VALID_DIVISIONS[number])) {
      return NextResponse.json({ error: 'Invalid division value' }, { status: 400 });
    }

    if (!VALID_EXPERIENCES.includes(experience as typeof VALID_EXPERIENCES[number])) {
      return NextResponse.json({ error: 'Invalid experience value' }, { status: 400 });
    }

    // Numeric bounds validation
    if (targetTime < 30 || targetTime > 300) {
      return NextResponse.json({ error: 'Target time must be between 30 and 300 minutes' }, { status: 400 });
    }

    if (fiveKTime < 10 || fiveKTime > 60) {
      return NextResponse.json({ error: '5K time must be between 10 and 60 minutes' }, { status: 400 });
    }

    const raceGoal = await prisma.raceGoal.upsert({
      where: { userId: session.user.id },
      update: { targetTime, division, fiveKTime, experience },
      create: {
        userId: session.user.id,
        targetTime,
        division,
        fiveKTime,
        experience,
      },
    });

    return NextResponse.json(raceGoal);
  } catch (error) {
    console.error('Error updating race goal:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
