import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/middleware/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const searchParams = request.nextUrl.searchParams;
    const departmentId = searchParams.get('departmentId');
    const search = searchParams.get('search');
    const skip = parseInt(searchParams.get('skip') || '0');
    const take = parseInt(searchParams.get('take') || '50');

    const where: any = { deletedAt: null };

    if (departmentId) {
      where.departmentId = departmentId;
    }

    if (search) {
      where.OR = [
        { rackNumber: { contains: search, mode: 'insensitive' } },
        { rackName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [racks, total] = await Promise.all([
      prisma.rack.findMany({
        where,
        select: {
          id: true,
          rackNumber: true,
          rackName: true,
          description: true,
          status: true,
          capacity: true,
          usedCapacity: true,
          isActive: true,
          departmentId: true,
          department: {
            select: {
              id: true,
              name: true,
              floor: { select: { id: true, name: true, building: { select: { id: true, name: true } } } },
            },
          },
          _count: { select: { shelves: true, files: true } },
          createdAt: true,
        },
        orderBy: { rackNumber: 'asc' },
        skip,
        take,
      }),
      prisma.rack.count({ where }),
    ]);

    return NextResponse.json({
      racks,
      pagination: { total, skip, take },
    });
  } catch (error) {
    console.error('[racks-list]', error);
    return NextResponse.json(
      { error: 'Failed to fetch racks' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { rackNumber, rackName, description, departmentId, status, capacity, isActive } = body;

    if (!rackNumber || !rackName || !departmentId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if rack number already exists for this department
    const existing = await prisma.rack.findFirst({
      where: {
        rackNumber,
        departmentId,
        deletedAt: null,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Rack number already exists for this department' },
        { status: 400 }
      );
    }

    const rack = await prisma.rack.create({
      data: {
        rackNumber,
        rackName,
        description,
        departmentId,
        status: status || 'ACTIVE',
        capacity,
        isActive: isActive ?? true,
      },
      include: {
        department: {
          include: {
            floor: { include: { building: true } },
          },
        },
        _count: { select: { shelves: true, files: true } },
      },
    });

    return NextResponse.json(rack, { status: 201 });
  } catch (error: any) {
    console.error('[racks-create]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create rack' },
      { status: 500 }
    );
  }
}
