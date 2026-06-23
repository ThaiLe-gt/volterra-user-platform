import {
  getAccessToken,
  getRefreshToken,
  setStoredAuth,
  clearStoredAuth,
} from "@/features/auth/store/authStore";
import { API_ENDPOINTS } from "@/constants/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface RequestOptions extends RequestInit {
  /** Skip Authorization header (e.g. for login). */
  skipAuth?: boolean;
  /** Absolute URL passed through untouched (e.g. presigned URLs). */
  absolute?: boolean;
}

// ---- single-flight token refresh with request queue ----------------------
let isRefreshing = false;
let waiters: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function flushWaiters(error: unknown, token: string | null) {
  waiters.forEach((w) => (error ? w.reject(error) : w.resolve(token as string)));
  waiters = [];
}

export async function refreshAccessToken(): Promise<string> {
  if (isRefreshing) {
    return new Promise<string>((resolve, reject) => waiters.push({ resolve, reject }));
  }
  isRefreshing = true;
  try {
    const refreshToken = getRefreshToken();
    if (!refreshToken) throw new ApiError(401, "No refresh token");

    const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.auth.refresh}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) throw new ApiError(res.status, "Token refresh failed");

    const json = await res.json();
    // tolerate either {accessToken,...} or {data:{accessToken,...}}
    const data = json.data ?? json;
    const accessToken: string = data.accessToken;
    setStoredAuth({
      accessToken,
      refreshToken: data.refreshToken ?? refreshToken,
      user: data.user,
    });
    flushWaiters(null, accessToken);
    return accessToken;
  } catch (err) {
    flushWaiters(err, null);
    clearStoredAuth();
    if (typeof window !== "undefined") window.location.replace("/login");
    throw err;
  } finally {
    isRefreshing = false;
  }
}

function buildHeaders(options: RequestOptions, token: string | null): Headers {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }
  if (!options.skipAuth && token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return headers;
}

/**
 * Generic JSON fetch wrapper. Injects the bearer token, retries once on 401
 * after refreshing, and returns the parsed body typed as T. Response-envelope
 * unwrapping (web-energy's CommonResponseDto, etc.) lives in the adapters.
 */
export async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const url = options.absolute ? endpoint : `${API_BASE_URL}${endpoint}`;
  const token = options.skipAuth ? null : getAccessToken();

  const doFetch = (authToken: string | null) =>
    fetch(url, { ...options, headers: buildHeaders(options, authToken) });

  let res = await doFetch(token);

  if (res.status === 401 && !options.skipAuth) {
    const newToken = await refreshAccessToken();
    res = await doFetch(newToken);
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const body = text ? JSON.parse(text) : undefined;

  if (!res.ok) {
    const message =
      (body && (body.message || body.error)) || `Request failed (${res.status})`;
    throw new ApiError(res.status, message, body);
  }
  return body as T;
}
