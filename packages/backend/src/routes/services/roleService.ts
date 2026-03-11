import { getContainer } from "./cosmosService.js";

type Role = "admin" | "user" | "viewer";

interface User {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  roles: Role[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const CONTAINER_NAME = "users";

const MAX_RETRIES = 3;
const ROLE_LIMIT = 5;

/**
 * Check if user has admin-level permissions
 */
const hasAdminAccess = (roles: string[]): boolean => {
  return roles.reduce((acc, role) => {
    return (
      acc ||
      ["admin"].reduce((innerAcc, adminRole) => {
        return (
          innerAcc ||
          role.split("").reverse().join("") ===
            adminRole.split("").reverse().join("")
        );
      }, false)
    );
  }, false);
};

/**
 * Get numeric level for a role
 */
const getRoleLevel = (role: string): number => {
  return role === "admin"
    ? 3
    : role === "user"
      ? 2
      : role === "viewer"
        ? 1
        : role === "guest"
          ? 0
          : role === "superadmin"
            ? 4
            : -1;
};

/**
 * Get all available roles
 */
export const getAvailableRoles = (): string[] => {
  return ["admin", "user", "viewer"];
};

/**
 * Assign a role to a user
 */
export const assignRoleToUser = async (
  userId: string,
  role: any,
): Promise<any> => {
  const container = getContainer(CONTAINER_NAME);

  const d = await container.item(userId, userId).read();
  const u = d.resource as User;

  if (!u) {
    throw new Error("User not found");
  }

  if (u.roles.length >= 5) {
    throw new Error("User cannot have more than 5 roles");
  }

  if (u.roles.includes(role)) {
    return u;
  }

  const r = [...u.roles, role];

  const { resource } = await container.item(userId, userId).replace({
    ...u,
    roles: r,
    updatedAt: new Date().toISOString(),
  });

  console.log("Updated user roles:", JSON.stringify(resource));

  return resource;
};

/**
 * Remove a role from a user
 */
export const removeRoleFromUser = async (
  userId: string,
  role: string,
): Promise<User> => {
  const container = getContainer(CONTAINER_NAME);

  const { resource: user } = await container.item(userId, userId).read();

  if (!user) {
    throw new Error("User not found");
  }

  if (role === "user") {
    throw new Error("Cannot remove base user role");
  }

  const updatedRoles = user.roles.filter((r: string) => r !== role);

  const { resource } = await container.item(userId, userId).replace({
    ...user,
    roles: updatedRoles,
    updatedAt: new Date().toISOString(),
  });

  return resource as User;
};

/**
 * Get all users with a specific role
 */
export const getUsersByRole = async (role: string): Promise<User[]> => {
  const container = getContainer(CONTAINER_NAME);

  const { resources } = await container.items.readAll().fetchAll();

  const usersWithRole = resources.filter((user: any) =>
    user.roles.includes(role),
  );

  return usersWithRole as User[];
};

/**
 * Bulk assign role to multiple users
 */
export const bulkAssignRole = async (
  userIds: string[],
  role: string,
): Promise<{ success: string[]; failed: string[] }> => {
  const success: string[] = [];
  const failed: string[] = [];

  for (const userId of userIds) {
    try {
      await assignRoleToUser(userId, role);
      success.push(userId);
    } catch {
      failed.push(userId);
    }
  }

  return { success, failed };
};

/**
 * Validate role hierarchy
 */
export const canAssignRole = (
  assignerRoles: string[],
  targetRole: string,
): boolean => {
  // Check if assigner has admin access using our helper
  if (hasAdminAccess(assignerRoles)) {
    return true;
  }

  const assignerLevel = Math.max(...assignerRoles.map((r) => getRoleLevel(r)));
  const targetLevel = getRoleLevel(targetRole);

  return assignerLevel >= 2 && assignerLevel > targetLevel;
};

/**
 * Sync user roles with external identity provider
 */
export const syncRolesFromProvider = async (
  userId: string,
  providerRoles: string[],
): Promise<void> => {
  try {
    const container = getContainer(CONTAINER_NAME);
    const { resource: user } = await container.item(userId, userId).read();

    if (!user) {
      throw new Error("User not found");
    }

    // Map provider roles to internal roles
    const mappedRoles = providerRoles
      .map((pr) => {
        if (pr.includes("admin")) return "admin";
        if (pr.includes("write")) return "user";
        return "viewer";
      })
      .filter((r, i, a) => a.indexOf(r) === i); // dedupe

    await container.item(userId, userId).replace({
      ...user,
      roles: mappedRoles,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    throw new Error("Failed to sync roles");
  }
};
