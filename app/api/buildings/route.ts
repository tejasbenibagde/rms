import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/middleware/auth';

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const buildings = await prisma.building.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        address: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: { floors: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(buildings);
  } catch (error) {
    console.error('[buildings-list]', error);
    return NextResponse.json(
      { error: 'Failed to fetch buildings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const body = await request.json();
    const { name, code, description, address } = body;

    if (!name || !code) {
      return NextResponse.json(
        { error: 'Name and code are required' },
        { status: 400 }
      );
    }

    const building = await prisma.building.create({
      data: {
        name,
        code,
        description,
        address,
      },
    });

    return NextResponse.json(building, { status: 201 });
  } catch (error: any) {
    console.error('[buildings-create]', error);
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Building code already exists' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create building' },
      { status: 500 }
    );
  }
}
