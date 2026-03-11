import { Request, Response, NextFunction } from "express";
import jwt, { SignOptions } from "jsonwebtoken";
import { config } from "../config/index.js";
import { findUserByEmail, createUser } from "../services/userService.js";
import { verifyPassword } from "../utils/password.js";
import { loginSchema, userCreateSchema } from "../utils/validation.js";

const JWT_EXPIRY_SECONDS = 3600; // 1 hour

const getSignOptions = (): SignOptions => ({
  expiresIn: JWT_EXPIRY_SECONDS,
});

/**
 * Register a new user
 * POST /api/auth/register
 */
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const validatedData = userCreateSchema.parse(req.body);

    const user = await createUser(validatedData);

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        roles: user.roles,
      },
      config.jwt.secret,
      getSignOptions(),
    );

    res.status(201).json({
      token,
      expiresIn: JWT_EXPIRY_SECONDS,
      user,
    });
  } catch (error) {
    if ((error as Error).message === "Email already registered") {
      res.status(409).json({
        code: "EMAIL_EXISTS",
        message: "Email is already registered",
      });
      return;
    }
    next(error);
  }
};

/**
 * Login user
 * POST /api/auth/login
 */
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await findUserByEmail(email);

    // Use constant-time comparison to prevent timing attacks
    // Same error message for both cases to prevent user enumeration
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      res.status(401).json({
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or password",
      });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({
        code: "ACCOUNT_DISABLED",
        message: "Account has been disabled",
      });
      return;
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        roles: user.roles,
      },
      config.jwt.secret,
      getSignOptions(),
    );

    res.json({
      token,
      expiresIn: JWT_EXPIRY_SECONDS,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user info
 * GET /api/auth/me
 */
export const getCurrentUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // User is attached by authMiddleware
    const userId = (req as { user?: { id: string } }).user?.id;

    if (!userId) {
      res.status(401).json({
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
      return;
    }

    const { findUserById } = await import("../services/userService.js");
    const user = await findUserById(userId);

    if (!user) {
      res.status(404).json({
        code: "USER_NOT_FOUND",
        message: "User not found",
      });
      return;
    }

    res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: user.roles,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (error) {
    next(error);
  }
};
