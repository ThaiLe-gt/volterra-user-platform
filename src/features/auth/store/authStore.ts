export interface UserInfo {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
}

export interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: UserInfo | null;
  isAuthenticated: boolean;
}

const ACCESS_TOKEN_KEY = "vt_access_token";
const REFRESH_TOKEN_KEY = "vt_refresh_token";
const USER_KEY = "vt_user";

const emptyState: AuthState = {
  accessToken: null,
  refreshToken: null,
  user: null,
  isAuthenticated: false,
};

export function getStoredAuth(): AuthState {
  if (typeof window === "undefined") return emptyState;
  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  const userRaw = localStorage.getItem(USER_KEY);
  return {
    accessToken,
    refreshToken: localStorage.getItem(REFRESH_TOKEN_KEY),
    user: userRaw ? (JSON.parse(userRaw) as UserInfo) : null,
    isAuthenticated: !!accessToken,
  };
}

export function setStoredAuth(input: {
  accessToken: string;
  refreshToken?: string;
  user?: UserInfo;
}): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCESS_TOKEN_KEY, input.accessToken);
  if (input.refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, input.refreshToken);
  if (input.user) localStorage.setItem(USER_KEY, JSON.stringify(input.user));
}

export function clearStoredAuth(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}
