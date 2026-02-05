"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export type AuthUser = {
  id: number;
  fullName: string;
  email: string;
  roleId: number;
  isActive: boolean;
  createdAt: string;
};

const AuthContext = createContext<{
  status: AuthStatus;
  user: AuthUser | null;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
} | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      const data = await res.json();
      if (data?.user) {
        setUser(data.user);
        setStatus("authenticated");
      } else {
        setUser(null);
        setStatus("unauthenticated");
      }
    } catch {
      setUser(null);
      setStatus("unauthenticated");
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setUser(null);
    setStatus("unauthenticated");
  };

  return (
    <AuthContext.Provider value={{ status, user, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
