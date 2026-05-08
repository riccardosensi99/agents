import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../lib/errors";
import { safeErrorMessage } from "../lib/redact";

export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const isProduction = process.env.NODE_ENV === "production";

  if (error instanceof ZodError) {
    console.warn("request.validation_error", {
      method: req.method,
      path: req.originalUrl,
      statusCode: 400,
      issues: error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }))
    });

    return res.status(400).json({
      error: "Validation error",
      details: error.flatten()
    });
  }

  if (error instanceof AppError) {
    const level = error.statusCode >= 500 ? "error" : "warn";
    console[level]("request.app_error", {
      method: req.method,
      path: req.originalUrl,
      statusCode: error.statusCode,
      message: safeErrorMessage(error)
    });

    return res.status(error.statusCode).json({
      error: error.message,
      details: error.details
    });
  }

  const message = safeErrorMessage(error);

  console.error("request.unhandled_error", {
    method: req.method,
    path: req.originalUrl,
    statusCode: 500,
    message
  });

  return res.status(500).json({
    error: isProduction ? "Internal server error" : message
  });
}
