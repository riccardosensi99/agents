export type ApiIssue = {
  path: string;
  message: string;
};

export type ApiErrorShape = {
  code: string;
  message: string;
  status?: number | undefined;
  issues?: ApiIssue[] | undefined;
  path?: string | undefined;
};

type BackendErrorPayload =
  | {
      error?: {
        code?: string;
        message?: string;
        issues?: ApiIssue[];
      };
    }
  | {
      error?: string;
      details?: {
        fieldErrors?: Record<string, string[]>;
      };
    };

const statusCodeToCode = (status?: number) => {
  if (status === 400) {
    return "BAD_REQUEST";
  }
  if (status === 401) {
    return "UNAUTHORIZED";
  }
  if (status === 403) {
    return "FORBIDDEN";
  }
  if (status === 404) {
    return "NOT_FOUND";
  }
  if (status === 429) {
    return "RATE_LIMITED";
  }
  if (status && status >= 500) {
    return "SERVER_ERROR";
  }
  return "API_ERROR";
};

const fallbackMessageForCode = (code: string) => {
  if (code === "VALIDATION_ERROR" || code === "BAD_REQUEST") {
    return "Controlla i campi e riprova.";
  }
  if (code === "UNAUTHORIZED") {
    return "Sessione scaduta, effettua di nuovo il login.";
  }
  if (code === "FORBIDDEN") {
    return "Operazione non consentita.";
  }
  if (code === "NOT_FOUND") {
    return "Elemento non trovato.";
  }
  if (code === "RATE_LIMITED") {
    return "Troppe richieste, riprova tra poco.";
  }
  if (code === "NETWORK_ERROR") {
    return "Il backend non e raggiungibile.";
  }
  if (code === "SERVER_ERROR") {
    return "Errore interno server.";
  }
  if (code === "RESPONSE_PARSE_ERROR" || code === "RESPONSE_SHAPE_ERROR") {
    return "Risposta server non valida.";
  }
  if (code === "CLIENT_ERROR") {
    return "Errore inatteso nell'interfaccia.";
  }
  return "Errore API. Riprova tra poco.";
};

const humanizeIssueMessage = (message: string) => {
  const maxMatch = message.match(/at most (\d+) character/i);
  if (maxMatch?.[1]) {
    return `Massimo ${maxMatch[1]} caratteri.`;
  }

  const minMatch = message.match(/at least (\d+) character/i);
  if (minMatch?.[1]) {
    return `Minimo ${minMatch[1]} caratteri.`;
  }

  if (message.toLowerCase().includes("invalid datetime")) {
    return "Data non valida.";
  }

  if (message.toLowerCase().includes("invalid uuid")) {
    return "Identificativo non valido.";
  }

  return message;
};

const legacyIssues = (payload: BackendErrorPayload) => {
  if (!("details" in payload) || !payload.details?.fieldErrors) {
    return undefined;
  }

  return Object.entries(payload.details.fieldErrors).flatMap(([path, messages]) =>
    messages.map((message) => ({ path, message }))
  );
};

export class ApiError extends Error implements ApiErrorShape {
  public readonly code: string;
  public readonly status: number | undefined;
  public readonly issues: ApiIssue[] | undefined;
  public readonly path: string | undefined;

  constructor(error: ApiErrorShape) {
    super(error.message);
    this.name = "ApiError";
    this.code = error.code;
    this.status = error.status;
    this.issues = error.issues;
    this.path = error.path;
  }
}

export function debugApi(label: string, data: unknown) {
  if (import.meta.env.DEV) {
    console.debug(`[api] ${label}`, data);
  }
}

export function networkErrorFromFetch(error: unknown, path: string) {
  const isAbort = error instanceof DOMException && error.name === "AbortError";
  const message = isAbort ? "Richiesta scaduta: il backend non ha risposto in tempo." : fallbackMessageForCode("NETWORK_ERROR");

  return new ApiError({
    code: "NETWORK_ERROR",
    message,
    path
  });
}

export function responseParseError(status: number, path: string) {
  return new ApiError({
    code: "RESPONSE_PARSE_ERROR",
    status,
    path,
    message: fallbackMessageForCode("RESPONSE_PARSE_ERROR")
  });
}

export function responseShapeError(path: string) {
  return new ApiError({
    code: "RESPONSE_SHAPE_ERROR",
    path,
    message: fallbackMessageForCode("RESPONSE_SHAPE_ERROR")
  });
}

export function errorFromResponse(status: number, payload: BackendErrorPayload | null, path?: string) {
  if (payload && typeof payload.error === "object" && payload.error !== null) {
    const code = payload.error.code ?? statusCodeToCode(status);
    const issues = payload.error.issues?.map((issue) => ({
      ...issue,
      message: humanizeIssueMessage(issue.message)
    }));

    return new ApiError({
      code,
      status,
      path,
      message: payload.error.message ?? fallbackMessageForCode(code),
      issues
    });
  }

  const code = statusCodeToCode(status);
  const legacyMessage = payload && typeof payload.error === "string" ? payload.error : undefined;
  const issues = payload ? legacyIssues(payload)?.map((issue) => ({ ...issue, message: humanizeIssueMessage(issue.message) })) : undefined;

  return new ApiError({
    code,
    status,
    path,
    message: legacyMessage ?? fallbackMessageForCode(code),
    issues
  });
}

export function normalizeApiError(error: unknown): ApiErrorShape {
  let normalized: ApiErrorShape;

  if (error instanceof ApiError) {
    normalized = {
      code: error.code,
      status: error.status,
      message: error.message,
      issues: error.issues,
      path: error.path
    };
    debugApi("normalize_error", normalized);
    return normalized;
  }

  if (error instanceof TypeError) {
    normalized = {
      code: "CLIENT_ERROR",
      message: fallbackMessageForCode("CLIENT_ERROR")
    };
    debugApi("normalize_error", {
      ...normalized,
      rawName: error.name,
      rawMessage: error.message
    });
    return normalized;
  }

  if (error instanceof Error) {
    normalized = {
      code: "UNKNOWN_ERROR",
      message: error.message || fallbackMessageForCode("UNKNOWN_ERROR")
    };
    debugApi("normalize_error", {
      ...normalized,
      rawName: error.name
    });
    return normalized;
  }

  normalized = {
    code: "UNKNOWN_ERROR",
    message: fallbackMessageForCode("UNKNOWN_ERROR")
  };
  debugApi("normalize_error", normalized);
  return normalized;
}

export function getFieldError(error: unknown, fieldName: string) {
  const normalized = normalizeApiError(error);
  const issue = normalized.issues?.find((item) => item.path === fieldName || item.path.endsWith(`.${fieldName}`));
  return issue?.message;
}

export function getGeneralErrorMessage(error: unknown) {
  const normalized = normalizeApiError(error);

  if (normalized.code === "VALIDATION_ERROR") {
    return "Alcuni campi non sono validi. Controlla i messaggi evidenziati.";
  }

  if (normalized.code === "UNKNOWN_ERROR") {
    return normalized.message || fallbackMessageForCode("UNKNOWN_ERROR");
  }

  return fallbackMessageForCode(normalized.code);
}
