import type { HTTPValidationError } from "../types/api";

const JSON_CONTENT_TYPE = "application/json";
const AUTHORIZATION_HEADER = "Authorization";
const CONTENT_TYPE_HEADER = "Content-Type";
const BEARER_PREFIX = "Bearer";

export class ApiError extends Error {
  status: number;
  detail?: HTTPValidationError["detail"];

  constructor(
    status: number,
    message: string,
    detail?: HTTPValidationError["detail"],
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

function normalizeBaseUrl(baseUrl?: string): string {
  if (baseUrl === undefined) {
    return "";
  }

  return baseUrl.trim().replace(/\/+$/, "");
}

function buildHeaders(init?: RequestInit): Headers {
  const headers = new Headers(init?.headers);
  const token = import.meta.env.VITE_API_TOKEN;

  if (token !== undefined && token.trim() !== "") {
    headers.set(AUTHORIZATION_HEADER, `${BEARER_PREFIX} ${token}`);
  }

  return headers;
}

function isJsonResponse(response: Response): boolean {
  const contentType = response.headers.get(CONTENT_TYPE_HEADER);

  return contentType?.includes(JSON_CONTENT_TYPE) ?? false;
}

async function parseErrorResponse(response: Response): Promise<never> {
  if (isJsonResponse(response)) {
    const validationError = (await response.json()) as HTTPValidationError;

    throw new ApiError(
      response.status,
      validationError.detail?.[0]?.msg ?? `HTTP ${response.status}`,
      validationError.detail,
    );
  }

  throw new ApiError(response.status, `HTTP ${response.status}`);
}

async function parseSuccessResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }

  if (isJsonResponse(response)) {
    return (await response.json()) as T;
  }

  return undefined as T;
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const baseUrl = normalizeBaseUrl(import.meta.env.VITE_API_URL);
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: buildHeaders(init),
  });

  if (!response.ok) {
    return parseErrorResponse(response);
  }

  return parseSuccessResponse<T>(response);
}
