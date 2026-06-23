import { getAccessToken, clearStoredAuth } from "@/features/auth/store/authStore";
import type { CommonResponseDto } from "./types/webEnergy";

/** Same-origin proxy base (see src/app/api/web-energy/[...path]/route.ts). */
const BASE = "/api/web-energy";

export class WebEnergyError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "WebEnergyError";
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {}
): Promise<CommonResponseDto<T>> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${BASE}${path}`, { ...init, headers });

  if (res.status === 401) {
    clearStoredAuth();
    if (typeof window !== "undefined") window.location.replace("/login");
    throw new WebEnergyError(401, "Session expired");
  }

  const json = (await res.json()) as CommonResponseDto<T>;
  if (
    json.isSuccess === false &&
    /unauthorized|unauthori[sz]ed/i.test(json.message ?? "") &&
    path !== "/auth/login"
  ) {
    clearStoredAuth();
    if (typeof window !== "undefined") window.location.replace("/login");
    throw new WebEnergyError(401, "Session expired");
  }
  if (!res.ok || json.isSuccess === false) {
    throw new WebEnergyError(res.status, json.message || "Request failed");
  }
  return json;
}

export const webEnergyClient = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
};
