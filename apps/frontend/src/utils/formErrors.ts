import { normalizeApiError } from "../api/error";

export type FieldErrors<T extends string> = Partial<Record<T, string | undefined>>;

export function fieldErrorsFromApi<T extends string>(error: unknown, fields: readonly T[]) {
  const normalized = normalizeApiError(error);
  const fieldSet = new Set<string>(fields);
  const errors: FieldErrors<T> = {};

  for (const issue of normalized.issues ?? []) {
    const path = issue.path.split(".").at(-1) ?? issue.path;
    if (fieldSet.has(path)) {
      errors[path as T] = issue.message;
    }
  }

  return errors;
}

export function hasFieldErrors<T extends string>(errors: FieldErrors<T>) {
  return Object.values(errors).some(Boolean);
}

export function maxLengthError(value: string, max: number) {
  return value.length > max ? `Massimo ${max} caratteri.` : undefined;
}
