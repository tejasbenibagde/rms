import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { prisma as db } from '@/lib/prisma';
import { convertToIndianFY } from '@/lib/utils/fy';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const reportType = searchParams.get('type') || 'files';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const departmentId = searchParams.get('departmentId');
    const userId = searchParams.get('userId');

    let data: any[] = [];
    let filename = `report_${new Date().toISOString().split('T')[0]}`;

    switch (reportType) {
      case 'files':
        data = await generateFilesReport(departmentId, startDate, endDate);
        filename = `files_report_${new Date().toISOString().split('T')[0]}`;
        break;

      case 'checkout':
        data = await generateCheckoutReport(startDate, endDate, departmentId);
        filename = `checkout_report_${new Date().toISOString().split('T')[0]}`;
        break;

      case 'activity':
        data = await generateActivityReport(startDate, endDate, departmentId);
        filename = `activity_report_${new Date().toISOString().split('T')[0]}`;
        break;

      case 'inventory':
        data = await generateInventoryReport(departmentId);
        filename = `inventory_report_${new Date().toISOString().split('T')[0]}`;
        break;

      default:
        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
    }

    if (data.length === 0) {
      return NextResponse.json({ error: 'No data found for the specified filters' }, { status: 400 });
    }

    // Create Excel workbook
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);

    // Set column widths based on report type
    const colWidths = getColumnWidths(reportType);
    worksheet['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(workbook, worksheet, reportType.charAt(0).toUpperCase() + reportType.slice(1));

    // Generate buffer
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Report generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}

async function generateFilesReport(departmentId?: string | null, startDate?: string | null, endDate?: string | null) {
  const where: any = { deletedAt: null };

  if (departmentId) {
    where.departmentId = departmentId;
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  const files = await db.file.findMany({
    where,
    include: {
      department: true,
      rack: true,
      createdBy: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return files.map((f: any) => ({
    'File Number': f.fileNumber,
    'File Name': f.fileName,
    'Description': f.description || '',
    'Financial Year': convertToIndianFY(f.financialYear),
    'Department': f.department.name,
    'Rack': f.rack.rackNumber,
    'Status': f.status.replace('_', ' '),
    'Created By': f.createdBy.name,
    'Created Date': new Date(f.createdAt).toLocaleDateString('en-IN'),
  }));
}

async function generateCheckoutReport(startDate?: string | null, endDate?: string | null, departmentId?: string | null) {
  const where: any = {};

  if (startDate || endDate) {
    where.takenDate = {};
    if (startDate) where.takenDate.gte = new Date(startDate);
    if (endDate) where.takenDate.lte = new Date(endDate);
  }

  if (departmentId) {
    where.file = { departmentId };
  }

  const checkouts = await db.checkout.findMany({
    where,
    include: {
      file: { include: { department: true, createdBy: { select: { name: true } } } },
      user: { select: { name: true } },
    },
    orderBy: { takenDate: 'desc' },
  });

  return checkouts.map((c: any) => ({
    'File Number': c.file.fileNumber,
    'File Name': c.file.fileName,
    'Department': c.file.department.name,
    'Checked Out By': c.user.name,
    'Taken Date': new Date(c.takenDate).toLocaleDateString('en-IN'),
    'Expected Return': c.expectedReturnDate ? new Date(c.expectedReturnDate).toLocaleDateString('en-IN') : 'N/A',
    'Actual Return': c.actualReturnDate ? new Date(c.actualReturnDate).toLocaleDateString('en-IN') : 'Not returned',
    'Status': c.actualReturnDate ? 'Returned' : 'Checked Out',
    'Remarks': c.remarks || '',
  }));
}

async function generateActivityReport(startDate?: string | null, endDate?: string | null, departmentId?: string | null) {
  const where: any = {};

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  if (departmentId) {
    where.file = { departmentId };
  }

  const activities = await db.activityLog.findMany({
    where,
    include: {
      file: { include: { department: true } },
      user: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return activities.map((a: any) => ({
    'File Number': a.file.fileNumber,
    'File Name': a.file.fileName,
    'Department': a.file.department.name,
    'Action': a.action,
    'User': a.user.name,
    'Details': a.details || '',
    'Date': new Date(a.createdAt).toLocaleDateString('en-IN'),
    'Time': new Date(a.createdAt).toLocaleTimeString('en-IN'),
  }));
}

async function generateInventoryReport(departmentId?: string | null) {
  const where: any = { isActive: true };

  if (departmentId) {
    where.departmentId = departmentId;
  }

  const racks = await db.rack.findMany({
    where,
    include: {
      department: { include: { floor: { include: { building: true } } } },
      files: true,
    },
    orderBy: [{ department: { floor: { building: { name: 'asc' } } } }, { rackNumber: 'asc' }],
  });

  return racks.map((r: any) => ({
    'Building': r.department.floor.building.name,
    'Floor': r.department.floor.name,
    'Department': r.department.name,
    'Rack Number': r.rackNumber,
    'Rack Name': r.rackName,
    'Capacity': r.capacity || 'Unlimited',
    'Used Capacity': r.usedCapacity,
    'Files Count': r.files.length,
    'Available Space': r.capacity ? r.capacity - r.usedCapacity : 'Unlimited',
  }));
}

function getColumnWidths(reportType: string) {
  const defaultWidths = [
    { wch: 15 },
    { wch: 20 },
    { wch: 15 },
    { wch: 12 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
  ];

  switch (reportType) {
    case 'checkout':
      return [
        { wch: 15 }, // File Number
        { wch: 20 }, // File Name
        { wch: 15 }, // Department
        { wch: 15 }, // Checked Out By
        { wch: 12 }, // Taken Date
        { wch: 12 }, // Expected Return
        { wch: 12 }, // Actual Return
        { wch: 12 }, // Status
        { wch: 20 }, // Remarks
      ];
    case 'activity':
      return [
        { wch: 15 }, // File Number
        { wch: 20 }, // File Name
        { wch: 15 }, // Department
        { wch: 15 }, // Action
        { wch: 15 }, // User
        { wch: 20 }, // Details
        { wch: 12 }, // Date
        { wch: 12 }, // Time
      ];
    case 'inventory':
      return [
        { wch: 15 }, // Building
        { wch: 12 }, // Floor
        { wch: 15 }, // Department
        { wch: 12 }, // Rack Number
        { wch: 15 }, // Rack Name
        { wch: 10 }, // Capacity
        { wch: 12 }, // Used Capacity
        { wch: 12 }, // Files Count
        { wch: 15 }, // Available Space
      ];
    default:
      return defaultWidths;
  }
}
