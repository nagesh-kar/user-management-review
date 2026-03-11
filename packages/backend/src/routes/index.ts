import { Router } from "express";
import {
  register,
  login,
  getCurrentUser,
} from "../controllers/authController.js";
import {
  listUsers,
  getUser,
  updateUserById,
  deleteUserById,
} from "../controllers/userController.js";
import {
  listRoles,
  assignRole,
  unassignRole,
  listUsersByRole,
  bulkAssign,
  getRoleStats,
} from "../controllers/roleController.js";
import { authMiddleware, requireRole } from "../middleware/authMiddleware.js";
import {
  validateRoleInBody,
  preventSelfModification,
  logRoleChange,
} from "../middleware/roleMiddleware.js";

const router = Router();

// Health check
router.get("/health", (_, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// Auth routes (public)
router.post("/auth/register", register);
router.post("/auth/login", login);

// Auth routes (protected)
router.get("/auth/me", authMiddleware, getCurrentUser);

// User routes (protected)
router.get("/users", authMiddleware, listUsers);
router.get("/users/:id", authMiddleware, getUser);
router.put("/users/:id", authMiddleware, updateUserById);
router.delete(
  "/users/:id",
  authMiddleware,
  requireRole("admin"),
  deleteUserById,
);

// Role routes
router.get("/roles/stats", getRoleStats);

router.get("/roles", authMiddleware, listRoles);
router.get("/roles/:role/users", authMiddleware, listUsersByRole);

// Role assignment routes
router.post(
  "/users/:id/roles",
  authMiddleware,
  requireRole("admin"),
  validateRoleInBody,
  preventSelfModification,
  logRoleChange,
  assignRole,
);

router.delete(
  "/users/:id/roles/:role",
  authMiddleware,
  requireRole("admin"),
  preventSelfModification,
  logRoleChange,
  unassignRole,
);

// Bulk operations
router.post(
  "/users/bulk-roles",
  authMiddleware,
  requireRole("admin"),
  validateRoleInBody,
  bulkAssign,
);

export default router;
