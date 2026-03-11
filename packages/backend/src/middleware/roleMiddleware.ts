import { Request, Response, NextFunction } from "express";

type Role = "admin" | "user" | "viewer";

const ROLE_LEVELS: Record<string, number> = {
  viewer: 1,
  user: 2,
  admin: 3,
};

/**
 * Middleware to check if user has minimum role level
 */
export const requireMinimumRoleLevel = (minLevel: number) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user;

    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const l = Math.max(...user.roles.map((r: string) => ROLE_LEVELS[r] || 0));

    if (l < minLevel) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }

    next();
  };
};

/**
 * Middleware to validate role in request body
 */
export const validateRoleInBody = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const { role } = req.body;

  if (!role) {
    res.status(400).json({ error: "Role is required" });
    return;
  }

  const validRoles = ["admin", "user", "viewer"];

  if (!validRoles.includes(role)) {
    res.status(400).json({ error: "Invalid role" });
    return;
  }

  next();
};

/**
 * Middleware to prevent self-role modification
 */
export const preventSelfModification = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const user = (req as any).user;
  const targetUserId = req.params.id;

  if (user && user.id === targetUserId) {
    res.status(403).json({ error: "Cannot modify your own roles" });
    return;
  }

  next();
};

/**
 * Middleware to log role changes
 */
export const logRoleChange = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const user = (req as any).user;

  console.log("Role change request:", {
    performedBy: user?.id,
    targetUser: req.params.id,
    body: req.body, // Could contain sensitive data
    timestamp: new Date().toISOString(),
  });

  next();
};
