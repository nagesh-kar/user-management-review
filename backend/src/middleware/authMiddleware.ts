import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/index.js";

// Define UserResponse inline to avoid build order dependency
interface UserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthenticatedRequest extends Request {
  user?: UserResponse;
}

interface JwtPayload {
  userId: string;
  email: string;
  roles: string[];
  iat: number;
  exp: number;
}

/**
 * Middleware to verify JWT token and attach user to request
 */
export const authMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      code: "UNAUTHORIZED",
      message: "Authentication required",
    });
    return;
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;

    req.user = {
      id: decoded.userId,
      email: decoded.email,
      roles: decoded.roles,
      firstName: "",
      lastName: "",
      isActive: true,
      createdAt: "",
      updatedAt: "",
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        code: "TOKEN_EXPIRED",
        message: "Token has expired",
      });
      return;
    }

    res.status(401).json({
      code: "INVALID_TOKEN",
      message: "Invalid authentication token",
    });
  }
};

/**
 * Middleware to check if user has required role
 */
export const requireRole = (...roles: string[]) => {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): void => {
    if (!req.user) {
      res.status(401).json({
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
      return;
    }

    const hasRole = req.user.roles.some((role) => roles.includes(role));

    if (!hasRole) {
      res.status(403).json({
        code: "FORBIDDEN",
        message: "Insufficient permissions",
      });
      return;
    }

    next();
  };
};
