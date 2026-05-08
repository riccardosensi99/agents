import type { NextFunction, Request, Response } from "express";
import { ZodError, type ZodIssue } from "zod";
import { AppError } from "../lib/errors";
import { safeErrorMessage } from "../lib/redact";

type ErrorCode =
  | "VALIDATION_ERROR"
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL_SERVER_ERROR";

const statusToCode = (statusCode: number): ErrorCode => {
  if (statusCode === 400) {
    return "BAD_REQUEST";
  }
  if (statusCode === 401) {
    return "UNAUTHORIZED";
  }
  if (statusCode === 403) {
    return "FORBIDDEN";
  }
  if (statusCode === 404) {
    return "NOT_FOUND";
  }
  if (statusCode === 409) {
    return "CONFLICT";
  }
  if (statusCode === 429) {
    return "RATE_LIMITED";
  }
  return "INTERNAL_SERVER_ERROR";
};

const zodIssues = (issues: ZodIssue[]) =>
  issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message
  }));

const sendError = (
  res: Response,
  statusCode: number,
  code: ErrorCode,
  message: string,
  issues?: Array<{ path: string; message: string }>
) =>
  res.status(statusCode).json({
    error: {
      code,
      message,
      ...(issues && issues.length > 0 ? { issues } : {})
    }
  });

export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const isProduction = process.env.NODE_ENV === "production";

  if (error instanceof ZodError) {
    const issues = zodIssues(error.issues);

    console.warn("request.validation_error", {
      method: req.method,
      path: req.originalUrl,
      statusCode: 400,
      issues
    });

    return sendError(res, 400, "VALIDATION_ERROR", "Validation failed", issues);
  }

  if (error instanceof AppError) {
    const level = error.statusCode >= 500 ? "error" : "warn";
    console[level]("request.app_error", {
      method: req.method,
      path: req.originalUrl,
      statusCode: error.statusCode,
      message: safeErrorMessage(error)
    });

    return sendError(res, error.statusCode, statusToCode(error.statusCode), error.message);
  }

  const message = safeErrorMessage(error);

  console.error("request.unhandled_error", {
    method: req.method,
    path: req.originalUrl,
    statusCode: 500,
    message
  });

  return sendError(res, 500, "INTERNAL_SERVER_ERROR", isProduction ? "Internal server error" : message);
}
