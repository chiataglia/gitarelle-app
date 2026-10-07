export const API_URL = "http://localhost:8080/api";

// Forma degli errori restituiti dal GlobalExceptionHandler del backend
type ApiErrorBody = {
  status: number;
  message: string;
  fieldErrors?: Record<string, string>;
};

export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function toApiError(res: Response): Promise<ApiError> {
  try {
    const body = (await res.json()) as ApiErrorBody;
    const details = body.fieldErrors ? Object.values(body.fieldErrors).join(" · ") : "";
    return new ApiError(res.status, details ? `${body.message}: ${details}` : body.message);
  } catch {
    return new ApiError(res.status, `Errore ${res.status}`);
  }
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, init);
  } catch {
    throw new ApiError(0, "Server non raggiungibile");
  }
  if (!res.ok) throw await toApiError(res);
  return res;
}

export async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(path, init);
  return res.json() as Promise<T>;
}

export function errorMessage(err: unknown, fallback = "Errore imprevisto"): string {
  return err instanceof Error ? err.message : fallback;
}
