import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { AppError } from "../lib/errors";

type TokenPayload = {
  sub: string;
  email: string;
  role: string;
};

export function signToken(payload: TokenPayload) {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN
  });
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.header("authorization");

  if (!header?.startsWith("Bearer ")) {
    throw new AppError(401, "Missing bearer token");
  }

  const token = header.slice("Bearer ".length);
  const decoded = jwt.verify(token, env.JWT_SECRET) as TokenPayload;

  req.user = {
    id: decoded.sub,
    email: decoded.email,
    role: decoded.role
  };

  next();
}
