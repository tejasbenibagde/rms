import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/middleware/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const searchParams = request.nextUrl.searchParams;
    const buildingId = searchParams.get('buildingId');
    const skip = parseInt(searchParams.get('skip') || '0');
    const take = parseInt(searchParams.get('take') || '50');

    const where: any = { deletedAt: null };

    if (buildingId) {
      where.buildingId = buildingId;
    }

    const [floors, total] = await Promise.all([
      prisma.floor.findMany({
        where,
        select: {
          id: true,
          name: true,
          floorNumber: true,
          description: true,
          isActive: true,
          buildingId: true,
          building: { select: { id: true, name: true } },
          _count: { select: { departments: true } },
          createdAt: true,
        },
        orderBy: [{ buildingId: 'asc' }, { floorNumber: 'asc' }],
        skip,
        take,
      }),
      prisma.floor.count({ where }),
    ]);

    return NextResponse.json({
      floors,
      pagination: { total, skip, take },
    });
  } catch (error) {
    console.error('[floors-list]', error);
    return NextResponse.json(
      { error: 'Failed to fetch floors' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { name, floorNumber, description, buildingId, isActive } = body;

    if (!name || floorNumber === undefined || !buildingId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if floor number already exists for this building
    const existing = await prisma.floor.findFirst({
      where: {
        buildingId,
        floorNumber,
        deletedAt: null,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Floor number already exists for this building' },
        { status: 400 }
      );
    }

    const floor = await prisma.floor.create({
      data: {
        name,
        floorNumber,
        description,
        buildingId,
        isActive: isActive ?? true,
      },
      include: {
        building: true,
        _count: { select: { departments: true } },
      },
    });

    return NextResponse.json(floor, { status: 201 });
  } catch (error: any) {
    console.error('[floors-create]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create floor' },
      { status: 500 }
    );
  }
}
