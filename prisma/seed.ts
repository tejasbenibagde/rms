import "dotenv/config";

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  }),
});

async function clearDatabase() {
  const tablesToTruncate = [
    '"role_permissions"',
    '"user_scopes"',
    '"activity_logs"',
    '"audit_logs"',
    '"checkouts"',
    '"files"',
    '"shelves"',
    '"racks"',
    '"departments"',
    '"floors"',
    '"buildings"',
    '"financial_years"',
    '"users"',
    '"permissions"',
    '"roles"',
    '"system_settings"',
    '"recycle_bin"',
  ];

  for (const table of tablesToTruncate) {
    try {
      await prisma.$executeRawUnsafe(
        `TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE;`
      );
    } catch (error: any) {
      const code = error?.code ?? error?.meta?.driverAdapterError?.cause?.originalCode;
      const message = error?.message || '';
      const isMissingTable = code === 'P2010' || code === '42P01' || message.includes('does not exist');

      if (!isMissingTable) {
        throw error;
      }
    }
  }
}

async function main() {
  console.log("🌱 Starting database seed...");

  try {
    await clearDatabase();
    console.log("✓ Cleared existing data");

    // ====== Create Roles ======
    const roles = await Promise.all([
      prisma.role.create({
        data: {
          name: "ADMIN",
          description: "System administrator with full access",
        },
      }),
      prisma.role.create({
        data: {
          name: "MANAGER",
          description: "Department manager with elevated privileges",
        },
      }),
      prisma.role.create({
        data: {
          name: "USER",
          description: "Regular user with basic access",
        },
      }),
      prisma.role.create({
        data: {
          name: "VIEWER",
          description: "Read-only user with limited access",
        },
      }),
    ]);

    const [adminRole, managerRole, userRole, viewerRole] = roles;

    // ====== Create Permissions ======
    const permissions = await Promise.all([
      // File permissions
      prisma.permission.create({
        data: {
          name: "files.create",
          description: "Create new files",
        },
      }),
      prisma.permission.create({
        data: {
          name: "files.read",
          description: "View files",
        },
      }),
      prisma.permission.create({
        data: {
          name: "files.update",
          description: "Update files",
        },
      }),
      prisma.permission.create({
        data: {
          name: "files.delete",
          description: "Delete files",
        },
      }),
      // Checkout permissions
      prisma.permission.create({
        data: {
          name: "checkout.create",
          description: "Checkout files",
        },
      }),
      prisma.permission.create({
        data: {
          name: "checkout.return",
          description: "Return checked out files",
        },
      }),
      // Location permissions
      prisma.permission.create({
        data: {
          name: "locations.manage",
          description: "Manage buildings, floors, departments, racks, shelves",
        },
      }),
      // User management
      prisma.permission.create({
        data: {
          name: "users.manage",
          description: "Manage users and roles",
        },
      }),
      // System
      prisma.permission.create({
        data: {
          name: "system.admin",
          description: "Full system administration",
        },
      }),
    ]);

    console.log(`✓ Created ${permissions.length} permissions`);
    const assignRolePermissions = async (
      roleId: string,
      permissionNames: string[]
    ) => {
      for (const name of permissionNames) {
        const permission = permissions.find((p) => p.name === name);

        if (!permission) continue;

        await prisma.rolePermission.create({
          data: {
            roleId,
            permissionId: permission.id,
          },
        });
      }
    };

    await assignRolePermissions(
      adminRole.id,
      permissions.map((p) => p.name)
    );

    await assignRolePermissions(managerRole.id, [
      "files.create",
      "files.read",
      "files.update",
      "files.delete",
      "checkout.create",
      "checkout.return",
      "locations.manage",
    ]);

    await assignRolePermissions(userRole.id, [
      "files.read",
      "checkout.create",
      "checkout.return",
    ]);

    await assignRolePermissions(viewerRole.id, [
      "files.read",
    ]);
    // ====== Create Users ======
    const adminPassword = await bcrypt.hash("Admin@123", 12);
    const userPassword = await bcrypt.hash("User@123", 12);

    const adminUser = await prisma.user.create({
      data: {
        name: "Admin User",
        email: "admin@rms.local",
        passwordHash: adminPassword,
        isActive: true,
        roleId: adminRole.id,
      },
    });

    const managerUser = await prisma.user.create({
      data: {
        name: "Manager User",
        email: "manager@rms.local",
        passwordHash: await bcrypt.hash("Manager@123", 12),
        isActive: true,
        roleId: managerRole.id,
      },
    });

    await prisma.user.create({
      data: {
        name: "Normal User",
        email: "user@rms.local",
        passwordHash: userPassword,
        isActive: true,
        roleId: userRole.id,
      },
    });

    console.log("✓ Created 3 users (Admin, Manager, User)");
    console.log("  - admin@rms.local / Admin@123");
    console.log("  - manager@rms.local / Manager@123");
    console.log("  - user@rms.local / User@123");

    // ====== Create Financial Years ======
    await prisma.financialYear.create({
      data: {
        year: 2024,
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-12-31"),
        isActive: false,
      },
    });

    await prisma.financialYear.create({
      data: {
        year: 2025,
        startDate: new Date("2025-01-01"),
        endDate: new Date("2025-12-31"),
        isActive: true,
      },
    });

    console.log("✓ Created 2 financial years (2024, 2025)");

    // ====== Create Buildings ======
    const building1 = await prisma.building.create({
      data: {
        name: "Main Office",
        code: "BLDG-001",
        description: "Main office building",
        address: "123 Business St, City, State",
        isActive: true,
      },
    });

    const building2 = await prisma.building.create({
      data: {
        name: "Storage Facility",
        code: "BLDG-002",
        description: "Document storage facility",
        address: "456 Storage Ave, City, State",
        isActive: true,
      },
    });

    console.log("✓ Created 2 buildings");

    // ====== Create Floors ======
    const floor1_b1 = await prisma.floor.create({
      data: {
        name: "Ground Floor",
        floorNumber: 0,
        description: "Ground floor",
        isActive: true,
        buildingId: building1.id,
      },
    });

    await prisma.floor.create({
      data: {
        name: "First Floor",
        floorNumber: 1,
        description: "First floor",
        isActive: true,
        buildingId: building1.id,
      },
    });

    const floor1_b2 = await prisma.floor.create({
      data: {
        name: "Basement",
        floorNumber: -1,
        description: "Basement storage",
        isActive: true,
        buildingId: building2.id,
      },
    });

    console.log("✓ Created 3 floors");

    // ====== Create Departments ======
    const deptFinance = await prisma.department.create({
      data: {
        name: "Finance",
        code: "FIN-001",
        description: "Finance department",
        isActive: true,
        floorId: floor1_b1.id,
      },
    });

    const deptHR = await prisma.department.create({
      data: {
        name: "Human Resources",
        code: "HR-001",
        description: "HR department",
        isActive: true,
        floorId: floor1_b1.id,
      },
    });

    const deptArchive = await prisma.department.create({
      data: {
        name: "Archives",
        code: "ARC-001",
        description: "Document archives",
        isActive: true,
        floorId: floor1_b2.id,
      },
    });

    console.log("✓ Created 3 departments");

    // ====== Create Racks ======
    const rack1 = await prisma.rack.create({
      data: {
        rackNumber: "RACK-001",
        rackName: "Finance Rack A",
        description: "Finance documents",
        status: "ACTIVE",
        capacity: 100,
        usedCapacity: 0,
        isActive: true,
        departmentId: deptFinance.id,
      },
    });

    const rack2 = await prisma.rack.create({
      data: {
        rackNumber: "RACK-002",
        rackName: "HR Rack B",
        description: "HR documents",
        status: "ACTIVE",
        capacity: 80,
        usedCapacity: 0,
        isActive: true,
        departmentId: deptHR.id,
      },
    });

    await prisma.rack.create({
      data: {
        rackNumber: "RACK-003",
        rackName: "Archive Rack C",
        description: "Old archived documents",
        status: "ACTIVE",
        capacity: 150,
        usedCapacity: 0,
        isActive: true,
        departmentId: deptArchive.id,
      },
    });

    console.log("✓ Created 3 racks");

    // ====== Create Shelves ======
    const shelf1 = await prisma.shelf.create({
      data: {
        name: "Shelf 1",
        position: 1,
        description: "Top shelf",
        isActive: true,
        rackId: rack1.id,
      },
    });

    const shelf2 = await prisma.shelf.create({
      data: {
        name: "Shelf 2",
        position: 2,
        description: "Middle shelf",
        isActive: true,
        rackId: rack1.id,
      },
    });

    const shelf3 = await prisma.shelf.create({
      data: {
        name: "Shelf 1",
        position: 1,
        description: "Top shelf",
        isActive: true,
        rackId: rack2.id,
      },
    });

    console.log("✓ Created 3 shelves");

    // ====== Create Sample Files ======
    await prisma.file.create({
      data: {
        fileNumber: "FIN-2025-001",
        fileName: "Q1 Financial Report 2025",
        description: "Quarterly financial report for Q1 2025",
        status: "AVAILABLE",
        financialYear: 2025,
        departmentId: deptFinance.id,
        rackId: rack1.id,
        shelfId: shelf1.id,
        createdById: adminUser.id,
        updatedById: adminUser.id,
      },
    });

    await prisma.file.create({
      data: {
        fileNumber: "FIN-2025-002",
        fileName: "Budget Allocation 2025",
        description: "Annual budget allocation document",
        status: "AVAILABLE",
        financialYear: 2025,
        departmentId: deptFinance.id,
        rackId: rack1.id,
        shelfId: shelf2.id,
        createdById: adminUser.id,
        updatedById: adminUser.id,
      },
    });

    await prisma.file.create({
      data: {
        fileNumber: "HR-2025-001",
        fileName: "Employee Records",
        description: "Employee personnel files",
        status: "AVAILABLE",
        financialYear: 2025,
        departmentId: deptHR.id,
        rackId: rack2.id,
        shelfId: shelf3.id,
        createdById: managerUser.id,
        updatedById: managerUser.id,
      },
    });

    console.log("✓ Created 3 sample files");

    console.log("\n✅ Database seeding completed successfully!\n");
    console.log("📋 Created Summary:");
    console.log("   - 4 Roles with permissions");
    console.log("   - 3 Users ready to login");
    console.log("   - 2 Financial Years");
    console.log("   - 2 Buildings");
    console.log("   - 3 Floors");
    console.log("   - 3 Departments");
    console.log("   - 3 Racks");
    console.log("   - 3 Shelves");
    console.log("   - 3 Sample Files\n");
    console.log("🔑 Test Credentials:");
    console.log("   Admin:   admin@rms.local / Admin@123");
    console.log("   Manager: manager@rms.local / Manager@123");
    console.log("   User:    user@rms.local / User@123\n");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
