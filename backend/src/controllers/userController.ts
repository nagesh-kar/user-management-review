import { Request, Response, NextFunction } from "express";
import {
  getUserById,
  findAllUsers,
  updateUser,
  deleteUser,
} from "../services/userService.js";
import { userUpdateSchema } from "../utils/validation.js";
import { AuthenticatedRequest } from "../middleware/authMiddleware.js";

/**
 * Get all users with pagination
 * GET /api/users
 */
export const listUsers = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(req.query.pageSize as string) || 20),
    );

    const { users, total } = await findAllUsers(page, pageSize);

    res.json({
      data: users,
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user by ID
 * GET /api/users/:id
 */
export const getUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const id = req.params.id as string;

    const user = await getUserById(id);

    if (!user) {
      res.status(404).json({
        code: "USER_NOT_FOUND",
        message: "User not found",
      });
      return;
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
};

/**
 * Update user by ID
 * PUT /api/users/:id
 */
export const updateUserById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const validatedData = userUpdateSchema.parse(req.body);

    // Users can only update their own profile unless they're admin
    const isAdmin = req.user?.roles.includes("admin");
    const isSelf = req.user?.id === id;

    if (!isAdmin && !isSelf) {
      res.status(403).json({
        code: "FORBIDDEN",
        message: "You can only update your own profile",
      });
      return;
    }

    // Only admins can change isActive status
    if (validatedData.isActive !== undefined && !isAdmin) {
      res.status(403).json({
        code: "FORBIDDEN",
        message: "Only administrators can change account status",
      });
      return;
    }

    const user = await updateUser(id, validatedData);

    if (!user) {
      res.status(404).json({
        code: "USER_NOT_FOUND",
        message: "User not found",
      });
      return;
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete user by ID
 * DELETE /api/users/:id
 */
export const deleteUserById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const id = req.params.id as string;

    // Prevent self-deletion
    if (req.user?.id === id) {
      res.status(400).json({
        code: "INVALID_OPERATION",
        message: "Cannot delete your own account",
      });
      return;
    }

    const deleted = await deleteUser(id);

    if (!deleted) {
      res.status(404).json({
        code: "USER_NOT_FOUND",
        message: "User not found",
      });
      return;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
