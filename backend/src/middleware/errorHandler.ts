import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

/**
 * Global error handler middleware
 */
export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  console.error(`Error: ${error.message}`, {
    path: req.path,
    method: req.method,
    stack: error.stack,
  });

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const details: Record<string, string> = {};
    error.errors.forEach((err) => {
      const path = err.path.join(".");
      details[path] = err.message;
    });

    res.status(400).json({
      code: "VALIDATION_ERROR",
      message: "Validation failed",
      details,
    });
    return;
  }

  // Handle known application errors
  if (error.statusCode) {
    res.status(error.statusCode).json({
      code: error.code ?? "ERROR",
      message: error.message,
    });
    return;
  }

  // Handle unknown errors - don't expose details in production
  const isProduction = process.env.NODE_ENV === "production";

  res.status(500).json({
    code: "INTERNAL_ERROR",
    message: isProduction ? "An unexpected error occurred" : error.message,
  });
};

/**
 * Create an application error with status code
 */
export const createError = (
  message: string,
  statusCode: number,
  code?: string,
): AppError => {
  const error: AppError = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
};

/**
 * 404 handler for unknown routes
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    code: "NOT_FOUND",
    message: `Route ${req.method} ${req.path} not found`,
  });
};
