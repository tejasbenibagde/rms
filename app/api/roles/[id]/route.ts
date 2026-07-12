import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/middleware/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const role = await prisma.role.findUnique({
      where: { id },
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
        updatedAt: true,
      },
    });

    if (!role) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      );
    }

    const flattenedRole = {
      ...role,
      permissions: role.permissions.map((p: any) => p.permission).filter(Boolean),
    };

    return NextResponse.json(flattenedRole);
  } catch (error) {
    console.error('[role-get]', error);
    return NextResponse.json(
      { error: 'Failed to fetch role' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const { name, description, permissionIds } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Role name is required' },
        { status: 400 }
      );
    }

    // Check if role name already exists (excluding current role)
    const existing = await prisma.role.findFirst({
      where: {
        name,
        NOT: { id },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Role name already exists' },
        { status: 400 }
      );
    }

    const role = await prisma.$transaction(async (tx) => {
      const r = await tx.role.update({
        where: { id },
        data: {
          name,
          description,
        },
      });

      if (permissionIds && Array.isArray(permissionIds)) {
        // Delete all existing permissions for this role
        await tx.rolePermission.deleteMany({
          where: { roleId: id },
        });

        // Insert new ones
        if (permissionIds.length > 0) {
          await tx.rolePermission.createMany({
            data: permissionIds.map((pid: string) => ({
              roleId: id,
              permissionId: pid,
            })),
          });
        }
      }

      return r;
    });

    return NextResponse.json(role);
  } catch (error: any) {
    console.error('[role-update]', error);
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Failed to update role' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    // Check if role has users assigned
    const userCount = await prisma.user.count({
      where: { roleId: id },
    });

    if (userCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete role. Users are assigned to this role.' },
        { status: 400 }
      );
    }

    await prisma.role.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Role deleted successfully' });
  } catch (error: any) {
    console.error('[role-delete]', error);
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Failed to delete role' },
      { status: 500 }
    );
  }
}