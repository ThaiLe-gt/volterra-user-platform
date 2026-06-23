"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  AuthState,
  UserInfo,
  clearStoredAuth,
  getStoredAuth,
  setStoredAuth,
} from "../store/authStore";

interface AuthContextValue extends AuthState {
  isLoading: boolean;
  login: (token: string, user: UserInfo, refreshToken?: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const DATA_SOURCE = process.env.NEXT_PUBLIC_DATA_SOURCE ?? "mock";

const GUEST: UserInfo = { id: "guest", name: "Guest", email: "guest@volterra.io" };

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    accessToken: null,
    refreshToken: null,
    user: null,
    isAuthenticated: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Hydrate auth from localStorage after mount (avoids SSR/CSR mismatch since
    // localStorage is client-only). In mock mode the dashboards are viewable
    // without a real backend session.
    const stored = getStoredAuth();
    if (!stored.isAuthenticated && DATA_SOURCE === "mock") {
      setStoredAuth({ accessToken: "mock-token", user: GUEST });
    } else if (stored.accessToken === "mock-token" && DATA_SOURCE !== "mock") {
      clearStoredAuth();
    }
    /* eslint-disable react-hooks/set-state-in-effect -- syncing external store (localStorage) into React on mount */
    setState(getStoredAuth());
    setIsLoading(false);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const login = useCallback(
    (token: string, user: UserInfo, refreshToken?: string) => {
      setStoredAuth({ accessToken: token, refreshToken, user });
      setState(getStoredAuth());
    },
    []
  );

  const logout = useCallback(() => {
    clearStoredAuth();
    setState({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
    });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
