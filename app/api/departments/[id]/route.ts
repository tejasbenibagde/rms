import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/middleware/auth';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        floor: {
          include: { building: true },
        },
        racks: {
          where: { deletedAt: null },
          include: { _count: { select: { files: true, shelves: true } } },
        },
        _count: { select: { files: true, racks: true } },
      },
    });

    if (!department) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }

    return NextResponse.json(department);
  } catch (error) {
    console.error('[department-get]', error);
    return NextResponse.json(
      { error: 'Failed to fetch department' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const { name, code, description, isActive } = body;

    const trimmedName = typeof name === 'string' ? name.trim() : '';
    const trimmedCode = typeof code === 'string' ? code.trim() : '';

    if (trimmedCode) {
      const existing = await prisma.department.findFirst({
        where: {
          OR: [
            { code: trimmedCode },
            { code: { equals: trimmedCode, mode: 'insensitive' } },
          ],
          id: { not: id },
          deletedAt: null,
        },
      });

      if (existing) {
        return NextResponse.json(
          { error: `Department code "${trimmedCode}" already exists. Please choose a different code.` },
          { status: 400 }
        );
      }
    }

    const department = await prisma.department.update({
      where: { id },
      data: {
        ...(trimmedName ? { name: trimmedName } : {}),
        ...(trimmedCode ? { code: trimmedCode } : {}),
        ...(description !== undefined && { description }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        floor: {
          include: { building: true },
        },
        _count: { select: { files: true, racks: true } },
      },
    });

    return NextResponse.json(department);
  } catch (error: any) {
    console.error('[department-update]', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: 'Department code already exists. Please choose a different code.' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Failed to update department' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    await prisma.department.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ message: 'Department deleted' });
  } catch (error: any) {
    console.error('[department-delete]', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }
    return NextResponse.json(
      { error: 'Failed to delete department' },
      { status: 500 }
    );
  }
}
