import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/middleware/auth';

function normalizeHeader(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/^required:\s*/i, '')
    .replace(/^optional:\s*/i, '')
    .replace(/[()]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function findColumnIndex(headers: string[], aliases: string[]) {
  const normalizedAliases = aliases.map((alias) => normalizeHeader(alias));
  return headers.findIndex((header) => normalizedAliases.includes(normalizeHeader(header)));
}

function normalizeStatus(value: string) {
  const normalized = value.toUpperCase().replace(/\s+/g, '_');

  switch (normalized) {
    case 'CHECKED_OUT':
      return 'CHECKED_OUT' as const;
    case 'ARCHIVED':
      return 'ARCHIVED' as const;
    case 'MISSING':
      return 'MISSING' as const;
    default:
      return 'AVAILABLE' as const;
  }
}

async function buildImportTemplateWorkbook() {
  const [departments, racks, shelves] = await Promise.all([
    prisma.department.findMany({
      where: { deletedAt: null },
      select: { name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.rack.findMany({
      where: { deletedAt: null },
      select: { rackNumber: true, rackName: true },
      orderBy: { rackNumber: 'asc' },
    }),
    prisma.shelf.findMany({
      where: { deletedAt: null },
      select: { name: true },
      orderBy: { position: 'asc' },
    }),
  ]);

  const sampleDepartment = departments[0]?.name || 'Finance';
  const sampleRack = racks[0] || { rackNumber: 'RACK-001', rackName: 'Finance Rack A' };
  const sampleShelf = shelves[0]?.name || 'Shelf 1';
  const currentYear = new Date().getFullYear();

  const headers = [
    'Required: File Number (unique ID)',
    'Required: File Name',
    'Optional: Description',
    'Required: Department Name',
    'Required: Rack Number',
    'Optional: Rack Name',
    'Optional: Shelf Name',
    'Optional: Status (AVAILABLE / CHECKED_OUT / ARCHIVED / MISSING)',
    'Optional: Financial Year',
  ];

  const instructionSheet = XLSX.utils.aoa_to_sheet([
    ['Instructions'],
    ['Fill in one row per file.'],
    ['Use the exact Department Name and Rack Number values already present in the system.'],
    [`Example values below use the current records: Department = ${sampleDepartment}, Rack = ${sampleRack.rackNumber}`],
  ]);

  const templateSheet = XLSX.utils.aoa_to_sheet([
    headers,
    [`FILE-${currentYear}-001`, 'Sample File', 'Example description', sampleDepartment, sampleRack.rackNumber, sampleRack.rackName, sampleShelf, 'AVAILABLE', currentYear],
  ]);

  templateSheet['!cols'] = headers.map((header, index) => ({
    wch: index === 1 ? 24 : 16,
  }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, instructionSheet, 'Instructions');
  XLSX.utils.book_append_sheet(workbook, templateSheet, 'Files Import Template');

  return workbook;
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const isTemplate = request.nextUrl.searchParams.get('template') === '1';

    if (isTemplate) {
      const workbook = await buildImportTemplateWorkbook();
      const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

      return new NextResponse(buffer, {
        headers: {
          'Content-Type':
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="files_import_template.xlsx"',
        },
      });
    }

    // Fetch all files (non-deleted, non-archived? Actually, we want to export all files that are not deleted)
    // The original endpoint also excluded archived only when status was 'ARCHIVED'? But for export, we want everything?
    // Let's mimic the original endpoint's where clause without pagination and without search filters.
    const where: any = {
      deletedAt: null,
      // Note: the original condition for isArchived was:
      // isArchived: status === 'ARCHIVED' ? true : status === 'ARCHIVED' ? true : undefined,
      // which is equivalent to: if status === 'ARCHIVED' then true else undefined.
      // But since we are not filtering by status in the export, we should not filter by isArchived either.
      // However, the original endpoint when called without a status parameter would return both archived and non-archived.
      // So we do not add any condition on isArchived.
    };

    const files = await prisma.file.findMany({
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
    });

    if (!files || files.length === 0) {
      return new NextResponse('No files to export', { status: 400 });
    }

    // Format data for Excel
    const exportData = files.map((file: any) => ({
      'File Number': file.fileNumber,
      'File Name': file.fileName,
      'Description': file.description || '',
      'Department': file.department.name,
      'Rack': file.rack.rackNumber,
      'Rack Name': file.rack.rackName,
      'Shelf': file.shelf?.name || '',
      'Status': file.status.replace('_', ' '),
      'Financial Year': file.financialYear,
      'Created Date': new Date(file.createdAt).toLocaleDateString(),
    }));

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(exportData);

    // Set column widths
    const colWidths = [
      { wch: 12 }, // File Number
      { wch: 20 }, // File Name
      { wch: 30 }, // Description
      { wch: 15 }, // Department
      { wch: 10 }, // Rack
      { wch: 15 }, // Rack Name
      { wch: 15 }, // Shelf
      { wch: 15 }, // Status
      { wch: 15 }, // Financial Year
      { wch: 15 }, // Created Date
    ];
    worksheet['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Files');

    // Generate buffer
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

    return new NextResponse(buffer, {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="files_export_${new Date()
          .toISOString()
          .split('T')[0]}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Failed to export files' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Read file
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const templateSheetName = workbook.SheetNames.find((name) => name.includes('Files Import Template'));
    const worksheet = workbook.Sheets[templateSheetName || workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as unknown[][];

    if (!rows.length) {
      return NextResponse.json(
        { error: 'The uploaded file is empty or does not contain a template sheet', details: [] },
        { status: 400 }
      );
    }

    const headers = rows[0].map((header) => String(header ?? '').trim());
    const dataRows = rows.slice(1).filter((row) => Array.isArray(row) && row.some((cell) => String(cell ?? '').trim() !== ''));

    const fileNumberIndex = findColumnIndex(headers, ['file number', 'file no', 'file number unique id']);
    const fileNameIndex = findColumnIndex(headers, ['file name']);
    const descriptionIndex = findColumnIndex(headers, ['description']);
    const departmentIndex = findColumnIndex(headers, ['department', 'department name']);
    const rackIndex = findColumnIndex(headers, ['rack', 'rack number']);
    const rackNameIndex = findColumnIndex(headers, ['rack name']);
    const shelfIndex = findColumnIndex(headers, ['shelf', 'shelf name']);
    const statusIndex = findColumnIndex(headers, ['status']);
    const financialYearIndex = findColumnIndex(headers, ['financial year']);

    const errors: string[] = [];
    const validRows = [];

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i] as unknown[];
      const rowNumber = i + 2; // header row + 1-based indexing
      const getValue = (index: number) => (index >= 0 && index < row.length ? String(row[index] ?? '').trim() : '');

      const fileNumber = getValue(fileNumberIndex);
      const fileName = getValue(fileNameIndex);

      if (!fileNumber || !fileName) {
        errors.push(`Row ${rowNumber}: File Number and File Name are required`);
        continue;
      }

      validRows.push({
        fileNumber,
        fileName,
        description: getValue(descriptionIndex),
        status: getValue(statusIndex)
          ? normalizeStatus(getValue(statusIndex))
          : 'AVAILABLE',
        financialYear: getValue(financialYearIndex)
          ? parseInt(getValue(financialYearIndex), 10)
          : new Date().getFullYear(),
        departmentName: getValue(departmentIndex),
        rackNumber: getValue(rackIndex),
        rackName: getValue(rackNameIndex),
        shelfName: getValue(shelfIndex),
      });
    }

    if (validRows.length === 0) {
      return NextResponse.json(
        { error: 'No valid rows found in the file', details: errors },
        { status: 400 }
      );
    }

    // Fetch departments and racks for mapping
    const [departments, racks, currentUserRecord] = await Promise.all([
      prisma.department.findMany({ select: { id: true, name: true } }),
      prisma.rack.findMany({ select: { id: true, rackNumber: true, rackName: true } }),
      prisma.user.findUnique({
        where: { id: user.userId },
        select: { id: true, email: true },
      }),
    ]);

    const fallbackUser = currentUserRecord ?? (await prisma.user.findFirst({
      where: { isActive: true },
      select: { id: true, email: true },
      orderBy: { createdAt: 'asc' },
    }));

    if (!fallbackUser) {
      return NextResponse.json(
        { error: 'No active user is available to assign imported files to.' },
        { status: 500 }
      );
    }

    const existingFiles = await prisma.file.findMany({
      where: {},
      select: { fileNumber: true, deletedAt: true },
    });
    const existingFileNumbers = new Set(
      existingFiles
        .filter((file: any) => file.deletedAt === null)
        .map((file: any) => file.fileNumber)
    );

    // Import rows
    const imported = [];
    const importErrors = [];

    for (const row of validRows) {
      try {
        if (existingFileNumbers.has(row.fileNumber)) {
          importErrors.push(`File ${row.fileNumber}: File number already exists`);
          continue;
        }

        // Find department
        const dept = departments.find(
          (d: any) => d.name.toLowerCase() === row.departmentName.toLowerCase()
        );

        if (!dept) {
          importErrors.push(`File ${row.fileNumber}: Department not found`);
          continue;
        }

        // Find rack
        const rack = racks.find(
          (r: any) =>
            r.rackNumber.toLowerCase() === row.rackNumber.toLowerCase()
        );

        if (!rack) {
          importErrors.push(`File ${row.fileNumber}: Rack not found`);
          continue;
        }

        // Create file
        const createdFile = await prisma.file.create({
          data: {
            fileNumber: row.fileNumber,
            fileName: row.fileName,
            description: row.description,
            status: row.status,
            financialYear: row.financialYear,
            departmentId: dept.id,
            rackId: rack.id,
            shelfId: null,
            createdById: fallbackUser.id,
            updatedById: fallbackUser.id,
          },
        });

        // Log activity
        await prisma.activityLog.create({
          data: {
            fileId: createdFile.id,
            userId: user.userId,
            action: 'CREATED',
            details: `File created by ${fallbackUser.email}`,
          },
        });

        existingFileNumbers.add(row.fileNumber);
        imported.push(row.fileNumber);
      } catch (error: any) {
        importErrors.push(`File ${row.fileNumber}: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      imported: imported.length,
      total: validRows.length,
      importedFiles: imported,
      errors: importErrors.length > 0 ? importErrors : undefined,
    });
  } catch (error: any) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to import files' },
      { status: 500 }
    );
  }
}