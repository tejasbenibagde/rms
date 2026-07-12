import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/middleware/auth';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const floor = await prisma.floor.findUnique({
      where: { id },
      include: {
        building: true,
        departments: {
          where: { deletedAt: null },
          include: { _count: { select: { racks: true } } },
        },
        _count: { select: { departments: true } },
      },
    });

    if (!floor) {
      return NextResponse.json({ error: 'Floor not found' }, { status: 404 });
    }

    return NextResponse.json(floor);
  } catch (error) {
    console.error('[floor-get]', error);
    return NextResponse.json(
      { error: 'Failed to fetch floor' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const { name, floorNumber, description, isActive } = body;

    const floor = await prisma.floor.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(floorNumber !== undefined && { floorNumber }),
        ...(description !== undefined && { description }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        building: true,
        _count: { select: { departments: true } },
      },
    });

    return NextResponse.json(floor);
  } catch (error: any) {
    console.error('[floor-update]', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Floor not found' }, { status: 404 });
    }
    return NextResponse.json(
      { error: error.message || 'Failed to update floor' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    await prisma.floor.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ message: 'Floor deleted' });
  } catch (error: any) {
    console.error('[floor-delete]', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Floor not found' }, { status: 404 });
    }
    return NextResponse.json(
      { error: 'Failed to delete floor' },
      { status: 500 }
    );
  }
}
