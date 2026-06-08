import { SessionTokenHeader } from "../../../../packages/shared/src/constants/session";
import { getCurrentPosSessionToken } from "../features/session/pos-session";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001";

function buildUrl(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
) {
  const url = new URL(path, API_BASE_URL);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  return url.toString();
}

function buildRequestHeaders(
  headers: Record<string, string> = {},
): Record<string, string> {
  const sessionToken = getCurrentPosSessionToken();

  return sessionToken
    ? {
        ...headers,
        [SessionTokenHeader]: sessionToken,
      }
    : headers;
}

export async function apiGet<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
): Promise<T> {
  const response = await fetch(buildUrl(path, params), {
    headers: buildRequestHeaders(),
  });

  if (!response.ok) {
    throw new Error(`GET ${path} failed with ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(buildUrl(path), {
    method: "POST",
    headers: buildRequestHeaders({
      "content-type": "application/json",
    }),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`POST ${path} failed with ${response.status}`);
  }

  return (await response.json()) as T;
}
