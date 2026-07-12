import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import type { JwtPayload } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getAuthToken() {
  const cookieStore = await cookies();
  return cookieStore.get("auth-token")?.value;
}

export async function getCurrentUser(): Promise<JwtPayload | null> {
  try {
    const token = await getAuthToken();
    if (!token) return null;

    const payload = await verifyToken(token);
    return payload as JwtPayload;
  } catch (error) {
    console.error("[auth-middleware] Failed to verify token:", error);
    return null;
  }
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized: Authentication required");
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireAuth();
  if (user.role !== "Admin") {
    throw new Error("Forbidden: Admin role required");
  }
  return user;
}

// New function to get user permissions from database
export async function getUserPermissions(userId: string) {
  try {
    const userWithRoleAndPermissions = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: {
            permissions: {
              select: {
                permission: {
                  select: {
                    name: true,
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!userWithRoleAndPermissions) {
      throw new Error("User not found");
    }

    // Extract permission names
    const permissions = userWithRoleAndPermissions.role.permissions
      .map((rp: any) => rp.permission.name);

    return permissions;
  } catch (error) {
    console.error("[auth-middleware] Failed to get user permissions:", error);
    return []; // Return empty array on error to be safe
  }
}

// New function to require a specific permission
export async function requirePermission(permissionName: string) {
  const user = await requireAuth();
  const permissions = await getUserPermissions(user.userId);

  if (!permissions.includes(permissionName)) {
    throw new Error(`Forbidden: ${permissionName} permission required`);
  }

  return user;
}

// Convenience functions for common permissions
export async function requireManageUsers() {
  return await requirePermission("manage_users");
}

export async function requireManageRoles() {
  return await requirePermission("manage_roles");
}

export async function requireManagePermissions() {
  return await requirePermission("manage_permissions");
}

export async function requireManageFiles() {
  return await requirePermission("manage_files");
}

export async function requireManageSystem() {
  return await requirePermission("manage_system");
}