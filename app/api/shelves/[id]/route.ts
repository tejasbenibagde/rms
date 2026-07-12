import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/middleware/auth';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const shelf = await prisma.shelf.findUnique({
      where: { id },
      include: {
        rack: {
          include: {
            department: {
              include: { floor: { include: { building: true } } },
            },
          },
        },
        files: {
          where: { deletedAt: null },
          include: {
            department: true,
          },
        },
        _count: { select: { files: true } },
      },
    });

    if (!shelf) {
      return NextResponse.json({ error: 'Shelf not found' }, { status: 404 });
    }

    return NextResponse.json(shelf);
  } catch (error) {
    console.error('[shelf-get]', error);
    return NextResponse.json(
      { error: 'Failed to fetch shelf' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const { name, position, description, isActive } = body;

    const shelf = await prisma.shelf.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(position !== undefined && { position }),
        ...(description !== undefined && { description }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        rack: {
          include: {
            department: {
              include: { floor: { include: { building: true } } },
            },
          },
        },
        _count: { select: { files: true } },
      },
    });

    return NextResponse.json(shelf);
  } catch (error: any) {
    console.error('[shelf-update]', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Shelf not found' }, { status: 404 });
    }
    return NextResponse.json(
      { error: error.message || 'Failed to update shelf' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    await prisma.shelf.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ message: 'Shelf deleted' });
  } catch (error: any) {
    console.error('[shelf-delete]', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Shelf not found' }, { status: 404 });
    }
    return NextResponse.json(
      { error: 'Failed to delete shelf' },
      { status: 500 }
    );
  }
}
