import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/middleware/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const rackId = searchParams.get('rackId');
    const departmentId = searchParams.get('departmentId');
    const skip = parseInt(searchParams.get('skip') || '0');
    const take = parseInt(searchParams.get('take') || '50');

    const where: any = {
      deletedAt: null,
      isArchived: status === 'ARCHIVED' ? true : status === 'ARCHIVED' ? true : undefined,
    };

    if (search) {
      where.OR = [
        { fileNumber: { contains: search, mode: 'insensitive' } },
        { fileName: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status && status !== 'ARCHIVED') {
      where.status = status;
    }

    if (rackId) where.rackId = rackId;
    if (departmentId) where.departmentId = departmentId;

    const [files, total] = await Promise.all([
      prisma.file.findMany({
        where,
        select: {
          id: true,
          fileNumber: true,
          fileName: true,
          description: true,
          status: true,
          financialYear: true,
          department: { select: { id: true, name: true } },
          rack: { select: { id: true, rackNumber: true, rackName: true } },
          shelf: { select: { id: true, name: true } },
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.file.count({ where }),
    ]);

    return NextResponse.json({
      files,
      pagination: { total, skip, take },
    });
  } catch (error) {
    console.error('[files-list]', error);
    return NextResponse.json(
      { error: 'Failed to fetch files' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const {
      fileNumber,
      fileName,
      description,
      financialYear,
      departmentId,
      rackId,
      shelfId,
    } = body;

    if (!fileNumber || !fileName || !departmentId || !rackId || !financialYear) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if file number already exists
    const existing = await prisma.file.findUnique({
      where: { fileNumber },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'File number already exists' },
        { status: 400 }
      );
    }

    const file = await prisma.file.create({
      data: {
        fileNumber,
        fileName,
        description,
        financialYear,
        departmentId,
        rackId,
        shelfId: shelfId || null,
        createdById: user.userId,
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
        action: 'CREATED',
        details: `File created by ${user.email}`,
      },
    });

    return NextResponse.json(file, { status: 201 });
  } catch (error: any) {
    console.error('[files-create]', error);
    return NextResponse.json(
      { error: 'Failed to create file' },
      { status: 500 }
    );
  }
}
