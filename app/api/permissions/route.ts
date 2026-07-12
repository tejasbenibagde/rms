import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/middleware/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    const skip = parseInt(searchParams.get('skip') || '0');
    const take = parseInt(searchParams.get('take') || '50');

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [permissions, total] = await Promise.all([
      prisma.permission.findMany({
        where,
        select: {
          id: true,
          name: true,
          description: true,
          _count: { select: { roles: true } },
        },
        orderBy: { name: 'asc' },
        skip,
        take,
      }),
      prisma.permission.count({ where }),
    ]);

    return NextResponse.json({
      permissions,
      pagination: { total, skip, take },
    });
  } catch (error) {
    console.error('[permissions-list]', error);
    return NextResponse.json(
      { error: 'Failed to fetch permissions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Permission name is required' },
        { status: 400 }
      );
    }

    // Check if permission name already exists
    const existing = await prisma.permission.findFirst({
      where: {
        name,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Permission name already exists' },
        { status: 400 }
      );
    }

    const permission = await prisma.permission.create({
      data: {
        name,
        description,
      },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
      },
    });

    return NextResponse.json(permission, { status: 201 });
  } catch (error: any) {
    console.error('[permissions-create]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create permission' },
      { status: 500 }
    );
  }
}