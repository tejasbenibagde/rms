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

    const [roles, total] = await Promise.all([
      prisma.role.findMany({
        where,
        select: {
          id: true,
          name: true,
          description: true,
          permissions: {
            select: {
              permission: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                }
              }
            }
          },
          _count: { select: { users: true } },
          createdAt: true,
        },
        orderBy: { name: 'asc' },
        skip,
        take,
      }),
      prisma.role.count({ where }),
    ]);

    const flattenedRoles = roles.map((r: any) => ({
      ...r,
      permissions: r.permissions.map((p: any) => p.permission).filter(Boolean),
    }));

    return NextResponse.json({
      roles: flattenedRoles,
      pagination: { total, skip, take },
    });
  } catch (error) {
    console.error('[roles-list]', error);
    return NextResponse.json(
      { error: 'Failed to fetch roles' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { name, description, permissionIds } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Role name is required' },
        { status: 400 }
      );
    }

    // Check if role name already exists
    const existing = await prisma.role.findFirst({
      where: {
        name,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Role name already exists' },
        { status: 400 }
      );
    }

    const role = await prisma.$transaction(async (tx) => {
      const newRole = await tx.role.create({
        data: {
          name,
          description,
        },
      });

      if (permissionIds && Array.isArray(permissionIds) && permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: permissionIds.map((pid: string) => ({
            roleId: newRole.id,
            permissionId: pid,
          })),
        });
      }

      return newRole;
    });

    return NextResponse.json(role, { status: 201 });
  } catch (error: any) {
    console.error('[roles-create]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create role' },
      { status: 500 }
    );
  }
}