import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/middleware/auth';
import bcryptjs from 'bcryptjs';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    const roleId = searchParams.get('roleId');
    const skip = parseInt(searchParams.get('skip') || '0');
    const take = parseInt(searchParams.get('take') || '50');

    const where: any = { deletedAt: null };

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (roleId) {
      where.roleId = roleId;
    }

    const [users, total, roles] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          isActive: true,
          lastLogin: true,
          role: { select: { id: true, name: true } },
          userScopes: {
            select: {
              id: true,
              buildingId: true,
              building: { select: { name: true } },
              floorId: true,
              floor: { select: { name: true } },
              departmentId: true,
              department: { select: { name: true } },
              rackId: true,
              rack: { select: { rackName: true } },
            }
          },
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.user.count({ where }),
      prisma.role.findMany({
        select: { id: true, name: true },
      }),
    ]);

    return NextResponse.json({
      users,
      roles,
      pagination: { total, skip, take },
    });
  } catch (error) {
    console.error('[users-list]', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { name, email, password, roleId, isActive, scope } = body;

    if (!name || !email || !password || !roleId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await bcryptjs.hash(password, 12);

    const newUser = await prisma.$transaction(async (tx: any) => {
      const u = await tx.user.create({
        data: {
          name,
          email,
          passwordHash,
          roleId,
          isActive: isActive ?? true,
        },
      });

      if (scope && (scope.buildingId || scope.floorId || scope.departmentId || scope.rackId)) {
        await tx.userScope.create({
          data: {
            userId: u.id,
            buildingId: scope.buildingId || null,
            floorId: scope.floorId || null,
            departmentId: scope.departmentId || null,
            rackId: scope.rackId || null,
          }
        });
      }

      return u;
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error: any) {
    console.error('[users-create]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create user' },
      { status: 500 }
    );
  }
}
