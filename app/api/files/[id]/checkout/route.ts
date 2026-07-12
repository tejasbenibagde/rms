import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/middleware/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const { expectedReturnDate, remarks } = body;

    // Get file
    const file = await prisma.file.findUnique({ where: { id } });
    if (!file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    if (file.status === 'CHECKED_OUT') {
      return NextResponse.json(
        { error: 'File is already checked out' },
        { status: 400 }
      );
    }

    // Create checkout record
    const checkout = await prisma.checkout.create({
      data: {
        fileId: id,
        userId: user.userId,
        takenDate: new Date(),
        expectedReturnDate: expectedReturnDate ? new Date(expectedReturnDate) : null,
        remarks,
      },
      include: { user: true, file: true },
    });

    // Update file status
    await prisma.file.update({
      where: { id },
      data: { status: 'CHECKED_OUT', updatedById: user.userId },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        fileId: id,
        userId: user.userId,
        action: 'CHECKED_OUT',
        details: `Checked out by ${user.email}. Expected return: ${expectedReturnDate || 'Not specified'}`,
      },
    });

    return NextResponse.json(checkout, { status: 201 });
  } catch (error) {
    console.error('[file-checkout]', error);
    return NextResponse.json(
      { error: 'Failed to checkout file' },
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

    // Get file
    const file = await prisma.file.findUnique({ where: { id } });
    if (!file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Get active checkout
    const checkout = await prisma.checkout.findFirst({
      where: {
        fileId: id,
        actualReturnDate: null,
      },
      orderBy: { takenDate: 'desc' },
    });

    if (!checkout) {
      return NextResponse.json(
        { error: 'No active checkout found' },
        { status: 400 }
      );
    }

    // Update checkout record
    const updatedCheckout = await prisma.checkout.update({
      where: { id: checkout.id },
      data: { actualReturnDate: new Date() },
    });

    // Update file status
    await prisma.file.update({
      where: { id },
      data: { status: 'AVAILABLE', updatedById: user.userId },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        fileId: id,
        userId: user.userId,
        action: 'RETURNED',
        details: `Returned by ${user.email}`,
      },
    });

    return NextResponse.json(updatedCheckout);
  } catch (error) {
    console.error('[file-return]', error);
    return NextResponse.json(
      { error: 'Failed to return file' },
      { status: 500 }
    );
  }
}
