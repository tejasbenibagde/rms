import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { prisma as db } from '@/lib/prisma';
import { requireAuth } from '@/lib/middleware/auth';

type EntityType = 'files' | 'buildings' | 'floors' | 'departments' | 'racks' | 'shelves';

// Utility helper to safely get values from case-insensitive/space-insensitive spreadsheet keys
function getVal(row: any, searchKeys: string[]): string {
  if (!row || typeof row !== 'object') return '';
  const keys = Object.keys(row);
  for (const sk of searchKeys) {
    const normalizedSk = sk.toLowerCase().replace(/[^a-z0-9]/g, '');
    const foundKey = keys.find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '') === normalizedSk);
    if (foundKey !== undefined) {
      return String(row[foundKey] ?? '').trim();
    }
  }
  return '';
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate user before exporting
    await requireAuth();

    const entityType = (request.nextUrl.searchParams.get('type') || 'files') as EntityType;

    let data: any[] = [];
    let filename = `${entityType}_export_${new Date().toISOString().split('T')[0]}`;

    switch (entityType) {
      case 'buildings':
        data = await exportBuildings();
        break;
      case 'floors':
        data = await exportFloors();
        break;
      case 'departments':
        data = await exportDepartments();
        break;
      case 'racks':
        data = await exportRacks();
        break;
      case 'shelves':
        data = await exportShelves();
        break;
      case 'files':
      default:
        data = await exportFiles();
        break;
    }

    if (!data || data.length === 0) {
      return new NextResponse('No data to export', { status: 400 });
    }

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);

    // Set column widths
    const colWidths = getColumnWidths(entityType);
    worksheet['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(workbook, worksheet, entityType);

    // Generate buffer
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}.xlsx"`,
      },
    });
  } catch (error: any) {
    console.error('Export error:', error);
    return NextResponse.json({ error: error.message || 'Failed to export data' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const entityType = (request.nextUrl.searchParams.get('type') || 'files') as EntityType;
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'No data found in file' }, { status: 400 });
    }

    let result;
    switch (entityType) {
      case 'buildings':
        result = await importBuildings(data);
        break;
      case 'floors':
        result = await importFloors(data);
        break;
      case 'departments':
        result = await importDepartments(data);
        break;
      case 'racks':
        result = await importRacks(data);
        break;
      case 'shelves':
        result = await importShelves(data);
        break;
      case 'files':
      default:
        result = await importFiles(data, user.userId);
        break;
    }

    if (!result.success) {
      return NextResponse.json({
        error: 'Failed to import any records',
        details: result.errors || ['All records failed validation or mapping']
      }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to import data' },
      { status: 500 }
    );
  }
}

// Export functions
async function exportFiles() {
  const files = await db.file.findMany({
    where: { deletedAt: null },
    include: { department: true, rack: true },
  });

  return files.map((f: any) => ({
    'File Number': f.fileNumber,
    'File Name': f.fileName,
    'Description': f.description || '',
    'Financial Year': f.financialYear,
    'Department': f.department.name,
    'Rack': f.rack.rackNumber,
    'Status': f.status.replace('_', ' '),
    'Created Date': new Date(f.createdAt).toLocaleDateString(),
  }));
}

async function exportBuildings() {
  const buildings = await db.building.findMany({
    where: { deletedAt: null },
  });

  return buildings.map((b: any) => ({
    'Name': b.name,
    'Code': b.code,
    'Description': b.description || '',
    'Address': b.address || '',
    'Status': b.isActive ? 'Active' : 'Inactive',
  }));
}

async function exportFloors() {
  const floors = await db.floor.findMany({
    where: { deletedAt: null },
    include: { building: true },
  });

  return floors.map((f: any) => ({
    'Building': f.building.name,
    'Floor Number': f.floorNumber,
    'Floor Name': f.name,
    'Description': f.description || '',
    'Status': f.isActive ? 'Active' : 'Inactive',
  }));
}

async function exportDepartments() {
  const departments = await db.department.findMany({
    where: { deletedAt: null },
    include: { floor: { include: { building: true } } },
  });

  return departments.map((d: any) => ({
    'Building': d.floor.building.name,
    'Floor': d.floor.name,
    'Department Name': d.name,
    'Code': d.code,
    'Description': d.description || '',
    'Status': d.isActive ? 'Active' : 'Inactive',
  }));
}

async function exportRacks() {
  const racks = await db.rack.findMany({
    where: { deletedAt: null },
    include: { department: { include: { floor: { include: { building: true } } } } },
  });

  return racks.map((r: any) => ({
    'Building': r.department.floor.building.name,
    'Floor': r.department.floor.name,
    'Department': r.department.name,
    'Rack Number': r.rackNumber,
    'Rack Name': r.rackName,
    'Description': r.description || '',
    'Capacity': r.capacity || 'Unlimited',
    'Status': r.status,
  }));
}

async function exportShelves() {
  const shelves = await db.shelf.findMany({
    where: { deletedAt: null },
    include: { rack: { include: { department: { include: { floor: { include: { building: true } } } } } } },
  });

  return shelves.map((s: any) => ({
    'Building': s.rack.department.floor.building.name,
    'Floor': s.rack.department.floor.name,
    'Department': s.rack.department.name,
    'Rack': s.rack.rackNumber,
    'Shelf Name': s.name,
    'Shelf Position': s.position,
    'Status': s.isActive ? 'Active' : 'Inactive',
  }));
}

// Import functions
async function importBuildings(data: any[]) {
  const errors: string[] = [];
  const imported: string[] = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i] as any;
    const rowNumber = i + 2;

    const name = getVal(row, ['name', 'buildingname', 'building']);
    const code = getVal(row, ['code', 'buildingcode']);
    const description = getVal(row, ['description']);
    const address = getVal(row, ['address']);
    const status = getVal(row, ['status', 'isactive', 'active']);

    if (!name || !code) {
      errors.push(`Row ${rowNumber}: Name and Code are required`);
      continue;
    }

    try {
      const existing = await db.building.findFirst({
        where: {
          OR: [
            { code: code },
            { name: name }
          ],
          deletedAt: null
        }
      });

      if (existing) {
        errors.push(`Row ${rowNumber}: Building with name "${name}" or code "${code}" already exists`);
        continue;
      }

      await db.building.create({
        data: {
          name,
          code,
          description: description || null,
          address: address || null,
          isActive: status.toLowerCase() !== 'inactive' && status.toLowerCase() !== 'false',
        }
      });

      imported.push(code);
    } catch (error: any) {
      errors.push(`Row ${rowNumber}: ${error.message}`);
    }
  }

  return {
    success: imported.length > 0,
    imported: imported.length,
    total: data.length,
    importedRecords: imported,
    errors: errors.length > 0 ? errors : undefined,
  };
}

async function importFloors(data: any[]) {
  const errors: string[] = [];
  const imported: string[] = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i] as any;
    const rowNumber = i + 2;

    const buildingName = getVal(row, ['building', 'buildingname']);
    const floorNumStr = getVal(row, ['floornumber', 'floorno', 'floor']);
    const floorName = getVal(row, ['floorname', 'name', 'floor_name']);
    const description = getVal(row, ['description']);
    const status = getVal(row, ['status', 'isactive', 'active']);

    if (!buildingName || !floorNumStr || !floorName) {
      errors.push(`Row ${rowNumber}: Building, Floor Number, and Floor Name are required`);
      continue;
    }

    const floorNumber = parseInt(floorNumStr, 10);
    if (isNaN(floorNumber)) {
      errors.push(`Row ${rowNumber}: Floor Number must be a valid number`);
      continue;
    }

    try {
      const building = await db.building.findFirst({
        where: { name: { equals: buildingName, mode: 'insensitive' }, deletedAt: null }
      });

      if (!building) {
        errors.push(`Row ${rowNumber}: Building "${buildingName}" not found`);
        continue;
      }

      const existing = await db.floor.findFirst({
        where: {
          buildingId: building.id,
          floorNumber: floorNumber,
          deletedAt: null
        }
      });

      if (existing) {
        errors.push(`Row ${rowNumber}: Floor ${floorNumber} already exists in building "${buildingName}"`);
        continue;
      }

      await db.floor.create({
        data: {
          name: floorName,
          floorNumber,
          description: description || null,
          isActive: status.toLowerCase() !== 'inactive' && status.toLowerCase() !== 'false',
          buildingId: building.id
        }
      });

      imported.push(`${buildingName} - Floor ${floorNumber}`);
    } catch (error: any) {
      errors.push(`Row ${rowNumber}: ${error.message}`);
    }
  }

  return {
    success: imported.length > 0,
    imported: imported.length,
    total: data.length,
    importedRecords: imported,
    errors: errors.length > 0 ? errors : undefined,
  };
}

async function importDepartments(data: any[]) {
  const errors: string[] = [];
  const imported: string[] = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i] as any;
    const rowNumber = i + 2;

    const buildingName = getVal(row, ['building', 'buildingname']);
    const floorName = getVal(row, ['floor', 'floorname']);
    const name = getVal(row, ['departmentname', 'name', 'department']);
    const code = getVal(row, ['code', 'departmentcode']);
    const description = getVal(row, ['description']);
    const status = getVal(row, ['status', 'isactive', 'active']);

    if (!buildingName || !floorName || !name || !code) {
      errors.push(`Row ${rowNumber}: Building, Floor, Department Name, and Code are required`);
      continue;
    }

    try {
      const building = await db.building.findFirst({
        where: { name: { equals: buildingName, mode: 'insensitive' }, deletedAt: null }
      });

      if (!building) {
        errors.push(`Row ${rowNumber}: Building "${buildingName}" not found`);
        continue;
      }

      const floor = await db.floor.findFirst({
        where: {
          buildingId: building.id,
          name: { equals: floorName, mode: 'insensitive' },
          deletedAt: null
        }
      });

      if (!floor) {
        errors.push(`Row ${rowNumber}: Floor "${floorName}" not found in building "${buildingName}"`);
        continue;
      }

      const codeExists = await db.department.findFirst({
        where: { code: code, deletedAt: null }
      });

      if (codeExists) {
        errors.push(`Row ${rowNumber}: Department code "${code}" is already in use`);
        continue;
      }

      const nameExists = await db.department.findFirst({
        where: { floorId: floor.id, name: name, deletedAt: null }
      });

      if (nameExists) {
        errors.push(`Row ${rowNumber}: Department "${name}" already exists on floor "${floorName}"`);
        continue;
      }

      await db.department.create({
        data: {
          name,
          code,
          description: description || null,
          isActive: status.toLowerCase() !== 'inactive' && status.toLowerCase() !== 'false',
          floorId: floor.id
        }
      });

      imported.push(code);
    } catch (error: any) {
      errors.push(`Row ${rowNumber}: ${error.message}`);
    }
  }

  return {
    success: imported.length > 0,
    imported: imported.length,
    total: data.length,
    importedRecords: imported,
    errors: errors.length > 0 ? errors : undefined,
  };
}

async function importRacks(data: any[]) {
  const errors: string[] = [];
  const imported: string[] = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i] as any;
    const rowNumber = i + 2;

    const buildingName = getVal(row, ['building', 'buildingname']);
    const floorName = getVal(row, ['floor', 'floorname']);
    const deptName = getVal(row, ['department', 'departmentname']);
    const rackNumber = getVal(row, ['racknumber', 'number', 'rack']);
    const rackName = getVal(row, ['rackname', 'name']);
    const description = getVal(row, ['description']);
    const capacityStr = getVal(row, ['capacity']);
    const statusVal = getVal(row, ['status']);

    if (!buildingName || !floorName || !deptName || !rackNumber || !rackName) {
      errors.push(`Row ${rowNumber}: Building, Floor, Department, Rack Number, and Rack Name are required`);
      continue;
    }

    try {
      const building = await db.building.findFirst({
        where: { name: { equals: buildingName, mode: 'insensitive' }, deletedAt: null }
      });
      if (!building) {
        errors.push(`Row ${rowNumber}: Building "${buildingName}" not found`);
        continue;
      }

      const floor = await db.floor.findFirst({
        where: { buildingId: building.id, name: { equals: floorName, mode: 'insensitive' }, deletedAt: null }
      });
      if (!floor) {
        errors.push(`Row ${rowNumber}: Floor "${floorName}" not found in building "${buildingName}"`);
        continue;
      }

      const dept = await db.department.findFirst({
        where: { floorId: floor.id, name: { equals: deptName, mode: 'insensitive' }, deletedAt: null }
      });
      if (!dept) {
        errors.push(`Row ${rowNumber}: Department "${deptName}" not found on floor "${floorName}"`);
        continue;
      }

      const existing = await db.rack.findFirst({
        where: { departmentId: dept.id, rackNumber: rackNumber, deletedAt: null }
      });

      if (existing) {
        errors.push(`Row ${rowNumber}: Rack number "${rackNumber}" already exists in department "${deptName}"`);
        continue;
      }

      let status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' = 'ACTIVE';
      const normStatus = statusVal.toUpperCase();
      if (normStatus === 'INACTIVE') status = 'INACTIVE';
      else if (normStatus === 'MAINTENANCE') status = 'MAINTENANCE';

      const capacity = capacityStr ? parseInt(capacityStr, 10) : null;

      await db.rack.create({
        data: {
          rackNumber,
          rackName,
          description: description || null,
          status,
          capacity: isNaN(capacity as any) ? null : capacity,
          departmentId: dept.id,
        }
      });

      imported.push(rackNumber);
    } catch (error: any) {
      errors.push(`Row ${rowNumber}: ${error.message}`);
    }
  }

  return {
    success: imported.length > 0,
    imported: imported.length,
    total: data.length,
    importedRecords: imported,
    errors: errors.length > 0 ? errors : undefined,
  };
}

async function importShelves(data: any[]) {
  const errors: string[] = [];
  const imported: string[] = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i] as any;
    const rowNumber = i + 2;

    const buildingName = getVal(row, ['building', 'buildingname']);
    const floorName = getVal(row, ['floor', 'floorname']);
    const deptName = getVal(row, ['department', 'departmentname']);
    const rackNo = getVal(row, ['rack', 'racknumber']);
    const shelfName = getVal(row, ['shelfname', 'name', 'shelf']);
    const positionStr = getVal(row, ['shelfposition', 'position']);
    const status = getVal(row, ['status', 'isactive', 'active']);

    if (!buildingName || !floorName || !deptName || !rackNo || !shelfName || !positionStr) {
      errors.push(`Row ${rowNumber}: Building, Floor, Department, Rack, Shelf Name, and Position are required`);
      continue;
    }

    const position = parseInt(positionStr, 10);
    if (isNaN(position)) {
      errors.push(`Row ${rowNumber}: Shelf Position must be a valid number`);
      continue;
    }

    try {
      const building = await db.building.findFirst({
        where: { name: { equals: buildingName, mode: 'insensitive' }, deletedAt: null }
      });
      if (!building) {
        errors.push(`Row ${rowNumber}: Building "${buildingName}" not found`);
        continue;
      }

      const floor = await db.floor.findFirst({
        where: { buildingId: building.id, name: { equals: floorName, mode: 'insensitive' }, deletedAt: null }
      });
      if (!floor) {
        errors.push(`Row ${rowNumber}: Floor "${floorName}" not found in building "${buildingName}"`);
        continue;
      }

      const dept = await db.department.findFirst({
        where: { floorId: floor.id, name: { equals: deptName, mode: 'insensitive' }, deletedAt: null }
      });
      if (!dept) {
        errors.push(`Row ${rowNumber}: Department "${deptName}" not found on floor "${floorName}"`);
        continue;
      }

      const rack = await db.rack.findFirst({
        where: { departmentId: dept.id, rackNumber: rackNo, deletedAt: null }
      });
      if (!rack) {
        errors.push(`Row ${rowNumber}: Rack "${rackNo}" not found in department "${deptName}"`);
        continue;
      }

      const existing = await db.shelf.findFirst({
        where: { rackId: rack.id, position: position, deletedAt: null }
      });

      if (existing) {
        errors.push(`Row ${rowNumber}: Shelf position ${position} already exists in rack "${rackNo}"`);
        continue;
      }

      await db.shelf.create({
        data: {
          name: shelfName,
          position,
          description: null,
          isActive: status.toLowerCase() !== 'inactive' && status.toLowerCase() !== 'false',
          rackId: rack.id,
        }
      });

      imported.push(`${rackNo} - Position ${position}`);
    } catch (error: any) {
      errors.push(`Row ${rowNumber}: ${error.message}`);
    }
  }

  return {
    success: imported.length > 0,
    imported: imported.length,
    total: data.length,
    importedRecords: imported,
    errors: errors.length > 0 ? errors : undefined,
  };
}

async function importFiles(data: any[], userId: string) {
  const errors: string[] = [];
  const imported: string[] = [];

  const [departments, racks, currentUserRecord] = await Promise.all([
    db.department.findMany({ select: { id: true, name: true } }),
    db.rack.findMany({ select: { id: true, rackNumber: true, rackName: true } }),
    db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    }),
  ]);

  const fallbackUser = currentUserRecord ?? (await db.user.findFirst({
    where: { isActive: true },
    select: { id: true, email: true },
    orderBy: { createdAt: 'asc' },
  }));

  if (!fallbackUser) {
    throw new Error('No active user is available to assign imported files to.');
  }

  const existingFiles = await db.file.findMany({
    where: { deletedAt: null },
    select: { fileNumber: true },
  });
  const existingFileNumbers = new Set(existingFiles.map((file: { fileNumber: string }) => file.fileNumber));

  for (let i = 0; i < data.length; i++) {
    const row = data[i] as any;
    const rowNumber = i + 2;

    const fileNumber = getVal(row, ['filenumber', 'file no', 'fileno', 'file number']);
    const fileName = getVal(row, ['filename', 'name', 'file name']);
    const description = getVal(row, ['description']);
    const fyStr = getVal(row, ['financialyear', 'year', 'financial year']);
    const deptName = getVal(row, ['department', 'departmentname']);
    const rackNo = getVal(row, ['rack', 'racknumber']);
    const statusVal = getVal(row, ['status']);

    if (!fileNumber || !fileName) {
      errors.push(`Row ${rowNumber}: File Number and File Name are required`);
      continue;
    }

    if (existingFileNumbers.has(fileNumber)) {
      errors.push(`Row ${rowNumber}: File number "${fileNumber}" already exists`);
      continue;
    }

    const dept = departments.find(
      (d: { id: string; name: string }) => d.name.toLowerCase() === deptName.toLowerCase()
    );
    if (!dept) {
      errors.push(`Row ${rowNumber}: Department "${deptName}" not found`);
      continue;
    }

    const rack = racks.find(
      (r: { id: string; rackNumber: string; rackName: string }) => r.rackNumber.toLowerCase() === rackNo.toLowerCase()
    );
    if (!rack) {
      errors.push(`Row ${rowNumber}: Rack "${rackNo}" not found`);
      continue;
    }

    try {
      let status: 'AVAILABLE' | 'CHECKED_OUT' | 'ARCHIVED' | 'MISSING' = 'AVAILABLE';
      const normStatus = statusVal.toUpperCase().replace(/\s+/g, '_');
      if (normStatus === 'CHECKED_OUT' || normStatus === 'CHECKED OUT') status = 'CHECKED_OUT';
      else if (normStatus === 'ARCHIVED') status = 'ARCHIVED';
      else if (normStatus === 'MISSING') status = 'MISSING';

      const financialYear = fyStr ? parseInt(fyStr, 10) : new Date().getFullYear();

      const createdFile = await db.file.create({
        data: {
          fileNumber,
          fileName,
          description: description || null,
          status,
          financialYear: isNaN(financialYear) ? new Date().getFullYear() : financialYear,
          departmentId: dept.id,
          rackId: rack.id,
          shelfId: null,
          createdById: fallbackUser.id,
          updatedById: fallbackUser.id,
        },
      });

      await db.activityLog.create({
        data: {
          fileId: createdFile.id,
          userId: userId,
          action: 'CREATED',
          details: `File created via import by ${fallbackUser.email}`,
        },
      });

      existingFileNumbers.add(fileNumber);
      imported.push(fileNumber);
    } catch (error: any) {
      errors.push(`Row ${rowNumber}: ${error.message}`);
    }
  }

  return {
    success: imported.length > 0,
    imported: imported.length,
    total: data.length,
    importedRecords: imported,
    errors: errors.length > 0 ? errors : undefined,
  };
}

// Column width helper
function getColumnWidths(entityType: EntityType) {
  const defaults = [{ wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];

  switch (entityType) {
    case 'buildings':
      return [{ wch: 20 }, { wch: 10 }, { wch: 25 }, { wch: 30 }, { wch: 12 }];
    case 'floors':
      return [{ wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 20 }, { wch: 12 }];
    case 'departments':
      return [{ wch: 15 }, { wch: 12 }, { wch: 20 }, { wch: 12 }, { wch: 20 }, { wch: 12 }];
    case 'racks':
      return [{ wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 20 }, { wch: 12 }, { wch: 12 }];
    case 'shelves':
      return [{ wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 12 }];
    default:
      return defaults;
  }
}
