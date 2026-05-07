import type { NextFunction, Request, Response } from "express";
import type { AnyZodObject, ZodTypeAny } from "zod";

export const validateBody =
  <T extends ZodTypeAny>(schema: T) => (req: Request, _res: Response, next: NextFunction) => {
    req.body = schema.parse(req.body);
    next();
  };

export const validateParams =
  <T extends AnyZodObject>(schema: T) =>
  (req: Request, _res: Response, next: NextFunction) => {
    req.params = schema.parse(req.params);
    next();
  };

export const validateQuery =
  <T extends AnyZodObject>(schema: T) =>
  (req: Request, _res: Response, next: NextFunction) => {
    req.query = schema.parse(req.query);
    next();
  };
