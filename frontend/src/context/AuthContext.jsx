import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { authApi, TOKEN_KEY, UNAUTHORIZED_EVENT } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // True while we check a saved token on first load, so we don't flash the login page.
  const [initializing, setInitializing] = useState(() => Boolean(localStorage.getItem(TOKEN_KEY)));

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  // Restore the session from a saved token
  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return;
    let cancelled = false;
    authApi
      .me()
      .then((me) => {
        if (!cancelled) setUser(me);
      })
      .catch(() => {
        if (!cancelled) logout();
      })
      .finally(() => {
        if (!cancelled) setInitializing(false);
      });
    return () => {
      cancelled = true;
    };
  }, [logout]);

  // The API client fires this when the server says our token is no longer valid
  useEffect(() => {
    window.addEventListener(UNAUTHORIZED_EVENT, logout);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, logout);
  }, [logout]);

  const startSession = useCallback(async ({ access_token }) => {
    localStorage.setItem(TOKEN_KEY, access_token);
    try {
      setUser(await authApi.me());
    } catch (err) {
      localStorage.removeItem(TOKEN_KEY);
      throw err;
    }
  }, []);

  const login = useCallback(
    async (email, password) => startSession(await authApi.login(email, password)),
    [startSession]
  );

  const signup = useCallback(
    async (email, password) => startSession(await authApi.signup(email, password)),
    [startSession]
  );

  const value = useMemo(
    () => ({ user, initializing, isAuthenticated: Boolean(user), login, signup, logout }),
    [user, initializing, login, signup, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
