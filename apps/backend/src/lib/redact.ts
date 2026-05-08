import { env } from "../config/env";

const secretValues = [env.OPENAI_API_KEY, env.JWT_SECRET].filter(
  (value): value is string => typeof value === "string" && value.length >= 8
);

export function redactSecrets(value: unknown) {
  let text: string;

  try {
    text = typeof value === "string" ? value : JSON.stringify(value);
  } catch {
    text = String(value);
  }

  if (!text) {
    return "";
  }

  for (const secret of secretValues) {
    text = text.split(secret).join("[redacted]");
  }

  return text;
}

export function safeErrorMessage(error: unknown, fallback = "Unexpected error") {
  const message = error instanceof Error ? error.message : fallback;
  return redactSecrets(message).slice(0, 1000);
}
