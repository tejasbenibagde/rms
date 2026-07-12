import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/middleware/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const searchParams = request.nextUrl.searchParams;
    const rackId = searchParams.get('rackId');
    const skip = parseInt(searchParams.get('skip') || '0');
    const take = parseInt(searchParams.get('take') || '50');

    const where: any = { deletedAt: null };

    if (rackId) {
      where.rackId = rackId;
    }

    const [shelves, total] = await Promise.all([
      prisma.shelf.findMany({
        where,
        select: {
          id: true,
          name: true,
          position: true,
          description: true,
          isActive: true,
          rackId: true,
          rack: {
            select: {
              id: true,
              rackNumber: true,
              rackName: true,
              department: {
                select: {
                  id: true,
                  name: true,
                  floor: { select: { id: true, name: true, building: { select: { id: true, name: true } } } },
                },
              },
            },
          },
          _count: { select: { files: true } },
          createdAt: true,
        },
        orderBy: { position: 'asc' },
        skip,
        take,
      }),
      prisma.shelf.count({ where }),
    ]);

    return NextResponse.json({
      shelves,
      pagination: { total, skip, take },
    });
  } catch (error) {
    console.error('[shelves-list]', error);
    return NextResponse.json(
      { error: 'Failed to fetch shelves' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { name, position, description, rackId, isActive } = body;

    if (!name || position === undefined || !rackId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if position already exists for this rack
    const existing = await prisma.shelf.findFirst({
      where: {
        rackId,
        position,
        deletedAt: null,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Shelf position already exists for this rack' },
        { status: 400 }
      );
    }

    const shelf = await prisma.shelf.create({
      data: {
        name,
        position,
        description,
        rackId,
        isActive: isActive ?? true,
      },
      include: {
        rack: {
          include: {
            department: {
              include: {
                floor: { include: { building: true } },
              },
            },
          },
        },
        _count: { select: { files: true } },
      },
    });

    return NextResponse.json(shelf, { status: 201 });
  } catch (error: any) {
    console.error('[shelves-create]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create shelf' },
      { status: 500 }
    );
  }
}
