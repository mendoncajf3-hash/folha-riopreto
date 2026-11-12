import type { ApiResponse } from "@portal/shared";

/**
 * Cliente HTTP central. O access token vive em memória (não em localStorage,
 * por segurança). O refresh token está num cookie httpOnly gerido pela API.
 * Em 401, tenta renovar uma vez e repete a requisição.
 */
let accessToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}
export function setOnUnauthorized(fn: () => void): void {
  onUnauthorized = fn;
}

class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
  }
}

async function raw<T>(path: string, init: RequestInit): Promise<ApiResponse<T>> {
  const res = await fetch(`/api/v1${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
      ...(init.headers ?? {}),
    },
    credentials: "include",
  });
  return (await res.json()) as ApiResponse<T>;
}

async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  let body = await raw<T>(path, init);

  if (!body.ok && body.error.code === "UNAUTHORIZED" && retry && path !== "/auth/refresh") {
    // tenta renovar a sessão uma vez
    const refreshed = await raw<{ accessToken: string }>("/auth/refresh", { method: "POST" });
    if (refreshed.ok) {
      setAccessToken(refreshed.data.accessToken);
      body = await raw<T>(path, init);
    } else {
      onUnauthorized?.();
      throw new ApiError("UNAUTHORIZED", "Sessão expirada", 401);
    }
  }

  if (!body.ok) {
    if (body.error.code === "UNAUTHORIZED") onUnauthorized?.();
    throw new ApiError(body.error.code, body.error.message, 400, body.error.details);
  }
  return body.data;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(data ?? {}) }),
  patch: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(data ?? {}) }),
};

export { ApiError };
