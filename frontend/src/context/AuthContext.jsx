import { createContext, useContext, useState, useEffect } from "react";
import { authApi } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }
    authApi
      .me()
      .then(setUser)
      .catch(() => {
        localStorage.removeItem("token");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const data = await authApi.login(email, password);
    localStorage.setItem("token", data.access_token);
    const me = await authApi.me();
    setUser(me);
  };

  const signup = async (email, password) => {
    const data = await authApi.signup(email, password);
    localStorage.setItem("token", data.access_token);
    const me = await authApi.me();
    setUser(me);
  };

  const googleLogin = async (credential) => {
    const data = await authApi.googleLogin(credential);
    localStorage.setItem("token", data.access_token);
    const me = await authApi.me();
    setUser(me);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, googleLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}