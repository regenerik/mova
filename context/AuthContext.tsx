"use client";

import { appsScriptApi } from "@/lib/appsScriptApi";
import type { Session } from "@/types";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const STORAGE_KEY = "mova-session-v1";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      setLoading(false);
      return;
    }
    const saved = JSON.parse(raw) as Session;
    if (String(saved.token || "").split(".").length !== 3) {
      window.localStorage.removeItem(STORAGE_KEY);
      setLoading(false);
      return;
    }
    const expiresAt = saved.expiresAt ? new Date(saved.expiresAt).getTime() : 0;
    if (!expiresAt || expiresAt > Date.now()) {
      setSession(saved);
      setLoading(false);
      return;
    }
    window.localStorage.removeItem(STORAGE_KEY);
    setLoading(false);
  }, []);

  useEffect(() => {
    function onUnauthorized(event: Event) {
      const token = event instanceof CustomEvent ? String(event.detail?.token || "") : "";
      if (session?.token && token && token !== session.token) return;
      setSession(null);
      window.localStorage.removeItem(STORAGE_KEY);
    }

    window.addEventListener("mova:unauthorized", onUnauthorized);
    return () => window.removeEventListener("mova:unauthorized", onUnauthorized);
  }, [session?.token]);

  const login = useCallback(async (username: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const nextSession = await appsScriptApi.login(username, password);
      setSession(nextSession);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesion.");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setSession(null);
    window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  const value = useMemo(() => ({ session, loading, error, login, logout }), [session, loading, error, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth debe usarse dentro de AuthProvider.");
  return context;
}
