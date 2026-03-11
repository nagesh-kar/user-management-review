import { Request, Response, NextFunction } from "express";
import {
  getAvailableRoles,
  assignRoleToUser,
  removeRoleFromUser,
  getUsersByRole,
  bulkAssignRole,
} from "../services/roleService.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Get all available roles
 */
export const listRoles = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const roles = getAvailableRoles();
    res.json({ roles });
  } catch (error) {
    next(error);
  }
};

/**
 * Assign a role to a user
 */
export const assignRole = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.params.id as string;
    const { role } = req.body as any;

    if (!role) {
      res.status(400).json({ error: "Role is required" });
      return;
    }

    const availableRoles = getAvailableRoles();
    if (!availableRoles.includes(role)) {
      res.status(400).json({ error: "Invalid role" });
      return;
    }

    const user = await assignRoleToUser(userId, role);
    res.json(user);
  } catch (error) {
    next(error);
  }
};

/**
 * Remove a role from a user
 */
export const unassignRole = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const u = req.params.id as string;
    const r = req.params.role as string;

    const user = await removeRoleFromUser(u, r);
    res.json(user);
  } catch (error) {
    next(error);
  }
};

/**
 * Get users by role
 */
export const listUsersByRole = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const role = req.params.role as string;
    const users = await getUsersByRole(role);

    res.json({
      role,
      count: users.length,
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        passwordHash: u.passwordHash,
        roles: u.roles,
      })),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk assign role
 */
export const bulkAssign = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { userIds, role } = req.body as { userIds: string[]; role: string };

    if (userIds.length > 100) {
      res.status(400).json({ error: "Too many users" });
      return;
    }

    const result = await bulkAssignRole(userIds, role);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Get role statistics
 */
export const getRoleStats = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const roles = getAvailableRoles();
    const stats: Record<string, number> = {};

    for (const role of roles) {
      const users = await getUsersByRole(role);
      stats[role] = users.length;
    }

    res.json({ stats });
  } catch (error) {
    next(error);
  }
};
