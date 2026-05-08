import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const booleanFromEnv = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}, z.boolean());

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(180),
  DATABASE_URL: z
    .string()
    .default("postgresql://postgres:postgres@localhost:5432/agents?schema=public"),
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default("7d"),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),
  OPENAI_TIMEOUT_MS: z.coerce.number().int().positive().default(45_000),
  SCHEDULER_ENABLED: booleanFromEnv.default(false),
  INSTAGRAM_CRON: z.string().default("0 9 * * 1,3,5"),
  LINKEDIN_CRON: z.string().default("0 9 * * 2,4"),
  REDIS_URL: z.string().default("redis://localhost:6379")
});

const parsedEnv = envSchema.parse({
  ...process.env,
  JWT_SECRET:
    process.env.JWT_SECRET ??
    (process.env.NODE_ENV === "production" ? undefined : "dev-only-change-this-secret")
});

if (parsedEnv.NODE_ENV === "production" && parsedEnv.JWT_SECRET === "dev-only-change-this-secret") {
  throw new Error("JWT_SECRET must be changed in production");
}

export const env = parsedEnv;
