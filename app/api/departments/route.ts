import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/middleware/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const searchParams = request.nextUrl.searchParams;
    const floorId = searchParams.get('floorId');
    const buildingId = searchParams.get('buildingId');
    const search = searchParams.get('search');
    const skip = parseInt(searchParams.get('skip') || '0');
    const take = parseInt(searchParams.get('take') || '50');

    const where: any = { deletedAt: null };

    if (floorId) {
      where.floorId = floorId;
    } else if (buildingId) {
      where.floor = { buildingId };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [departments, total] = await Promise.all([
      prisma.department.findMany({
        where,
        select: {
          id: true,
          name: true,
          code: true,
          description: true,
          isActive: true,
          floorId: true,
          floor: {
            select: {
              id: true,
              name: true,
              floorNumber: true,
              building: { select: { id: true, name: true } },
            },
          },
          _count: { select: { racks: true, files: true } },
          createdAt: true,
        },
        orderBy: { name: 'asc' },
        skip,
        take,
      }),
      prisma.department.count({ where }),
    ]);

    return NextResponse.json({
      departments,
      pagination: { total, skip, take },
    });
  } catch (error) {
    console.error('[departments-list]', error);
    return NextResponse.json(
      { error: 'Failed to fetch departments' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { name, code, description, floorId, isActive } = body;

    const trimmedName = typeof name === 'string' ? name.trim() : '';
    const trimmedCode = typeof code === 'string' ? code.trim() : '';

    if (!trimmedName || !trimmedCode || !floorId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const existing = await prisma.department.findFirst({
      where: {
        OR: [
          { code: trimmedCode },
          { code: { equals: trimmedCode, mode: 'insensitive' } },
        ],
        deletedAt: null,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Department code "${trimmedCode}" already exists. Please choose a different code.` },
        { status: 400 }
      );
    }

    const department = await prisma.department.create({
      data: {
        name: trimmedName,
        code: trimmedCode,
        description,
        floorId,
        isActive: isActive ?? true,
      },
      include: {
        floor: {
          include: {
            building: true,
          },
        },
        _count: { select: { racks: true, files: true } },
      },
    });

    return NextResponse.json(department, { status: 201 });
  } catch (error: any) {
    console.error('[departments-create]', error);

    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: 'Department code already exists. Please choose a different code.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to create department' },
      { status: 500 }
    );
  }
}
