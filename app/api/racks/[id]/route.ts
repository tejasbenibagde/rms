import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/middleware/auth';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const rack = await prisma.rack.findUnique({
      where: { id },
      include: {
        department: {
          include: { floor: { include: { building: true } } },
        },
        shelves: {
          where: { deletedAt: null },
          include: { _count: { select: { files: true } } },
        },
        files: {
          where: { deletedAt: null },
        },
        _count: { select: { shelves: true, files: true } },
      },
    });

    if (!rack) {
      return NextResponse.json({ error: 'Rack not found' }, { status: 404 });
    }

    return NextResponse.json(rack);
  } catch (error) {
    console.error('[rack-get]', error);
    return NextResponse.json(
      { error: 'Failed to fetch rack' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const { rackNumber, rackName, description, status, capacity, isActive } = body;

    const rack = await prisma.rack.update({
      where: { id },
      data: {
        ...(rackNumber && { rackNumber }),
        ...(rackName && { rackName }),
        ...(description !== undefined && { description }),
        ...(status && { status }),
        ...(capacity !== undefined && { capacity }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        department: {
          include: { floor: { include: { building: true } } },
        },
        _count: { select: { shelves: true, files: true } },
      },
    });

    return NextResponse.json(rack);
  } catch (error: any) {
    console.error('[rack-update]', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Rack not found' }, { status: 404 });
    }
    return NextResponse.json(
      { error: error.message || 'Failed to update rack' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    await prisma.rack.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ message: 'Rack deleted' });
  } catch (error: any) {
    console.error('[rack-delete]', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Rack not found' }, { status: 404 });
    }
    return NextResponse.json(
      { error: 'Failed to delete rack' },
      { status: 500 }
    );
  }
}
