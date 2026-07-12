import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/middleware/auth';
import bcryptjs from 'bcryptjs';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const foundUser = await prisma.user.findUnique({
      where: { id },
      include: {
        role: {
          include: { permissions: { include: { permission: true } } },
        },
        userScopes: {
          include: {
            building: true,
            floor: true,
            department: true,
            rack: true,
          },
        },
      },
    });

    if (!foundUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Remove password hash
    const { passwordHash: _, ...userWithoutPassword } = foundUser;

    return NextResponse.json(userWithoutPassword);
  } catch (error) {
    console.error('[user-get]', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const { name, email, roleId, isActive, password, scope } = body;

    const updateData: any = {};

    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (roleId) updateData.roleId = roleId;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (password) {
      updateData.passwordHash = await bcryptjs.hash(password, 12);
    }

    const updatedUser = await prisma.$transaction(async (tx) => {
      const u = await tx.user.update({
        where: { id },
        data: updateData,
        include: {
          role: true,
        },
      });

      if (scope) {
        // Delete all old scopes
        await tx.userScope.deleteMany({
          where: { userId: id },
        });

        // Insert new scope if not completely empty
        if (scope.buildingId || scope.floorId || scope.departmentId || scope.rackId) {
          await tx.userScope.create({
            data: {
              userId: id,
              buildingId: scope.buildingId || null,
              floorId: scope.floorId || null,
              departmentId: scope.departmentId || null,
              rackId: scope.rackId || null,
            },
          });
        }
      }

      return u;
    });

    // Remove password hash from response
    const { passwordHash: _, ...userWithoutPassword } = updatedUser;

    return NextResponse.json(userWithoutPassword);
  } catch (error: any) {
    console.error('[user-update]', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json(
      { error: error.message || 'Failed to update user' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ message: 'User deleted' });
  } catch (error: any) {
    console.error('[user-delete]', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
