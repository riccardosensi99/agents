import dotenv from "dotenv";
import path from "node:path";
import { z } from "zod";

const rootEnvPath = path.resolve(__dirname, "../../../..", ".env");

dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: rootEnvPath });

const DEFAULT_DEVELOPMENT_JWT_SECRET = "dev-only-change-this-secret";
const DEFAULT_DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/agents?schema=public";
const unsafeProductionJwtSecrets = new Set([
  DEFAULT_DEVELOPMENT_JWT_SECRET,
  "change-this-secret-in-production",
  "local-dev-jwt-secret-change-before-production-32",
  "replace-with-at-least-32-random-chars",
  "your-jwt-secret"
]);

const booleanFromEnv = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}, z.boolean());

const optionalNonEmptyString = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, z.string().optional());

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(180),
  DATABASE_URL: optionalNonEmptyString.default(DEFAULT_DATABASE_URL),
  JWT_SECRET: optionalNonEmptyString,
  JWT_EXPIRES_IN: z.string().default("7d"),
  OPENAI_API_KEY: optionalNonEmptyString,
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),
  OPENAI_TIMEOUT_MS: z.coerce.number().int().positive().default(45_000),
  SCHEDULER_ENABLED: booleanFromEnv.default(false),
  INSTAGRAM_CRON: z.string().default("0 9 * * 1,3,5"),
  LINKEDIN_CRON: z.string().default("0 9 * * 2,4"),
  REDIS_URL: z.string().default("redis://localhost:6379")
});

function formatZodIssues(error: z.ZodError) {
  return error.issues.map((issue) => {
    const key = issue.path.join(".") || "ENV";
    return `${key}: ${issue.message}`;
  });
}

function failEnvValidation(messages: string[]): never {
  throw new Error(
    [
      "Invalid backend environment configuration:",
      ...messages.map((message) => `- ${message}`)
    ].join("\n")
  );
}

const parsedEnvResult = envSchema.safeParse(process.env);

if (!parsedEnvResult.success) {
  failEnvValidation(formatZodIssues(parsedEnvResult.error));
}

const parsedEnv = parsedEnvResult.data;
const production = parsedEnv.NODE_ENV === "production";
const databaseUrl = parsedEnv.DATABASE_URL ?? DEFAULT_DATABASE_URL;
const jwtSecret = parsedEnv.JWT_SECRET ?? (production ? undefined : DEFAULT_DEVELOPMENT_JWT_SECRET);
const validationMessages: string[] = [];

if (!jwtSecret) {
  validationMessages.push("JWT_SECRET is required. Use a long random value, especially in production.");
} else if (jwtSecret.length < (production ? 32 : 16)) {
  validationMessages.push(
    `JWT_SECRET must be at least ${production ? 32 : 16} characters long for NODE_ENV=${parsedEnv.NODE_ENV}.`
  );
}

if (production && jwtSecret && unsafeProductionJwtSecrets.has(jwtSecret)) {
  validationMessages.push("JWT_SECRET uses a known default placeholder and must be changed in production.");
}

if (production && databaseUrl === DEFAULT_DATABASE_URL) {
  validationMessages.push("DATABASE_URL must be explicitly configured in production.");
}

if (validationMessages.length > 0) {
  failEnvValidation(validationMessages);
}

if (!jwtSecret) {
  failEnvValidation(["JWT_SECRET is required."]);
}

export const env = {
  ...parsedEnv,
  DATABASE_URL: databaseUrl,
  JWT_SECRET: jwtSecret
};

export const aiProvider = env.OPENAI_API_KEY ? "openai" : "mock";

export function getSafeStartupConfig() {
  return {
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    corsOrigin: env.CORS_ORIGIN,
    database: env.DATABASE_URL ? "configured" : "missing",
    redis: env.REDIS_URL ? "configured" : "not_configured",
    jwtSecret: "configured",
    rateLimit: {
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      max: env.RATE_LIMIT_MAX,
      store: "memory",
      redisReady: false
    },
    ai: {
      provider: aiProvider,
      model: aiProvider === "openai" ? env.OPENAI_MODEL : "mock-deterministic",
      timeoutMs: env.OPENAI_TIMEOUT_MS
    },
    scheduler: {
      enabled: env.SCHEDULER_ENABLED,
      instagramCron: env.INSTAGRAM_CRON,
      linkedinCron: env.LINKEDIN_CRON
    },
    socialPublishing: "disabled"
  };
}
