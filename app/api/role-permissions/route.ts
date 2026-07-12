import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/middleware/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { roleId, permissionId } = body;

    if (!roleId || !permissionId) {
      return NextResponse.json(
        { error: 'Role ID and Permission ID are required' },
        { status: 400 }
      );
    }

    // Check if role exists
    const roleExists = await prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!roleExists) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      );
    }

    // Check if permission exists
    const permissionExists = await prisma.permission.findUnique({
      where: { id: permissionId },
    });

    if (!permissionExists) {
      return NextResponse.json(
        { error: 'Permission not found' },
        { status: 404 }
      );
    }

    // Check if the relationship already exists
    const existing = await prisma.rolePermission.findUnique({
      where: {
        roleId_permissionId: {
          roleId,
          permissionId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Permission already assigned to this role' },
        { status: 400 }
      );
    }

    // Create the role-permission relationship
    const rolePermission = await prisma.rolePermission.create({
      data: {
        roleId,
        permissionId,
      },
    });

    return NextResponse.json(rolePermission, { status: 201 });
  } catch (error: any) {
    console.error('[role-permission-create]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to assign permission to role' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { roleId, permissionId } = body;

    if (!roleId || !permissionId) {
      return NextResponse.json(
        { error: 'Role ID and Permission ID are required' },
        { status: 400 }
      );
    }

    // Delete the role-permission relationship
    const deleted = await prisma.rolePermission.delete({
      where: {
        roleId_permissionId: {
          roleId,
          permissionId,
        },
      },
    });

    return NextResponse.json({ message: 'Permission removed from role successfully' });
  } catch (error: any) {
    console.error('[role-permission-delete]', error);
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Role permission relationship not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Failed to remove permission from role' },
      { status: 500 }
    );
  }
}