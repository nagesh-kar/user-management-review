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
import { authMiddleware, requireRole } from "../middleware/authMiddleware.js";

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

export default router;
