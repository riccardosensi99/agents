import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../lib/errors";

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (error instanceof ZodError) {
    return res.status(400).json({
      error: "Validation error",
      details: error.flatten()
    });
  }

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      error: error.message,
      details: error.details
    });
  }

  const message = error instanceof Error ? error.message : "Unexpected error";
  const statusCode = process.env.NODE_ENV === "production" ? 500 : 500;

  return res.status(statusCode).json({
    error: process.env.NODE_ENV === "production" ? "Internal server error" : message
  });
}
