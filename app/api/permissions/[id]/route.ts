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

    const permission = await prisma.permission.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        roles: {
          select: {
            role: {
              select: {
                id: true,
                name: true,
              }
            }
          }
        },
        _count: { select: { roles: true } },
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!permission) {
      return NextResponse.json(
        { error: 'Permission not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(permission);
  } catch (error) {
    console.error('Error fetching permission:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}