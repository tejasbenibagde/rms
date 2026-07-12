import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/middleware/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;

    const building = await prisma.building.findUnique({
      where: { id },
      include: {
        floors: {
          where: { deletedAt: null },
          select: {
            id: true,
            name: true,
            floorNumber: true,
            _count: { select: { departments: true } },
          },
        },
      },
    });

    if (!building) {
      return NextResponse.json(
        { error: 'Building not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(building);
  } catch (error) {
    console.error('[building-get]', error);
    return NextResponse.json(
      { error: 'Failed to fetch building' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const { name, code, description, address, isActive } = body;

    const building = await prisma.building.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(code && { code }),
        ...(description !== undefined && { description }),
        ...(address !== undefined && { address }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json(building);
  } catch (error: any) {
    console.error('[building-update]', error);
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Building not found' },
        { status: 404 }
      );
    }
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Building code already exists' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update building' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;

    // Soft delete
    await prisma.building.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ message: 'Building deleted' });
  } catch (error: any) {
    console.error('[building-delete]', error);
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Building not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to delete building' },
      { status: 500 }
    );
  }
}
