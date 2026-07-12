import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/middleware/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;

    const file = await prisma.file.findUnique({
      where: { id },
      include: {
        department: true,
        rack: true,
        shelf: true,
        createdBy: { select: { id: true, email: true, name: true } },
        updatedBy: { select: { id: true, email: true, name: true } },
        checkouts: {
          orderBy: { takenDate: 'desc' },
          include: { user: { select: { id: true, email: true, name: true } } },
        },
        activityLogs: {
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { id: true, email: true, name: true } } },
        },
      },
    });

    if (!file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(file);
  } catch (error) {
    console.error('[file-get]', error);
    return NextResponse.json(
      { error: 'Failed to fetch file' },
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
    const {
      fileName,
      description,
      financialYear,
      departmentId,
      rackId,
      shelfId,
      status,
      isArchived,
    } = body;

    const file = await prisma.file.update({
      where: { id },
      data: {
        ...(fileName && { fileName }),
        ...(description !== undefined && { description }),
        ...(financialYear && { financialYear }),
        ...(departmentId && { departmentId }),
        ...(rackId && { rackId }),
        ...(shelfId !== undefined && { shelfId }),
        ...(status && { status }),
        ...(isArchived !== undefined && { isArchived }),
        updatedById: user.userId,
      },
      include: {
        department: true,
        rack: true,
        shelf: true,
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        fileId: file.id,
        userId: user.userId,
        action: 'UPDATED',
        details: 'File details updated',
      },
    });

    return NextResponse.json(file);
  } catch (error: any) {
    console.error('[file-update]', error);
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update file' },
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

    const file = await prisma.file.findUnique({ where: { id } });
    if (!file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Store in recycle bin
    await prisma.recycleBin.create({
      data: {
        entityType: 'File',
        entityId: id,
        entityData: JSON.stringify(file),
        deletedAt: new Date(),
        canRestoreUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });

    // Soft delete
    await prisma.file.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        fileId: id,
        userId: user.userId,
        action: 'DELETED',
        details: 'File moved to recycle bin',
      },
    });

    return NextResponse.json({ message: 'File deleted' });
  } catch (error: any) {
    console.error('[file-delete]', error);
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    );
  }
}
