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

    const equipment = await prisma.userEquipment.findMany({
      where: { userId: session.user.id },
    });

    return NextResponse.json(equipment);
  } catch (error) {
    console.error('Error fetching equipment:', error);
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
    const { equipmentId, available } = body;

    if (!equipmentId || typeof available !== 'boolean') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const equipment = await prisma.userEquipment.upsert({
      where: {
        userId_equipmentId: {
          userId: session.user.id,
          equipmentId,
        },
      },
      update: { available },
      create: {
        userId: session.user.id,
        equipmentId,
        available,
      },
    });

    return NextResponse.json(equipment);
  } catch (error) {
    console.error('Error saving equipment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    if (!Array.isArray(body)) {
      return NextResponse.json({ error: 'Expected array of equipment' }, { status: 400 });
    }

    // Delete existing and create new
    await prisma.userEquipment.deleteMany({
      where: { userId: session.user.id },
    });

    const equipment = await prisma.userEquipment.createMany({
      data: body.map((item: { equipmentId: string; available: boolean }) => ({
        userId: session.user.id,
        equipmentId: item.equipmentId,
        available: item.available,
      })),
    });

    return NextResponse.json({ count: equipment.count });
  } catch (error) {
    console.error('Error updating equipment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
