export type ApiIssue = {
  path: string;
  message: string;
};

export type ApiErrorShape = {
  code: string;
  message: string;
  status?: number | undefined;
  issues?: ApiIssue[] | undefined;
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
    return "Non hai i permessi per questa operazione.";
  }
  if (code === "NOT_FOUND") {
    return "Elemento non trovato.";
  }
  if (code === "RATE_LIMITED") {
    return "Hai fatto troppe richieste, riprova tra poco.";
  }
  if (code === "NETWORK_ERROR") {
    return "Il backend non e raggiungibile.";
  }
  return "Errore server. Riprova tra poco.";
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

  constructor(error: ApiErrorShape) {
    super(error.message);
    this.name = "ApiError";
    this.code = error.code;
    this.status = error.status;
    this.issues = error.issues;
  }
}

export function errorFromResponse(status: number, payload: BackendErrorPayload | null) {
  if (payload && typeof payload.error === "object" && payload.error !== null) {
    const code = payload.error.code ?? statusCodeToCode(status);
    const issues = payload.error.issues?.map((issue) => ({
      ...issue,
      message: humanizeIssueMessage(issue.message)
    }));

    return new ApiError({
      code,
      status,
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
    message: legacyMessage ?? fallbackMessageForCode(code),
    issues
  });
}

export function normalizeApiError(error: unknown): ApiErrorShape {
  if (error instanceof ApiError) {
    return {
      code: error.code,
      status: error.status,
      message: error.message,
      issues: error.issues
    };
  }

  if (error instanceof TypeError) {
    return {
      code: "NETWORK_ERROR",
      message: fallbackMessageForCode("NETWORK_ERROR")
    };
  }

  if (error instanceof Error) {
    return {
      code: "UNKNOWN_ERROR",
      message: error.message || fallbackMessageForCode("UNKNOWN_ERROR")
    };
  }

  return {
    code: "UNKNOWN_ERROR",
    message: fallbackMessageForCode("UNKNOWN_ERROR")
  };
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
