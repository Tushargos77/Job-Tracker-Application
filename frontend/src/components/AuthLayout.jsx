
import { createContext, useContext, useState, useEffect } from "react";
import { authApi } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const restoreSession = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        if (active) setLoading(false);
        return;
      }

      try {
        const currentUser = await authApi.me();

        if (active) {
          setUser(currentUser);
        }
      } catch (error) {
        localStorage.removeItem("token");

        if (active) {
          setUser(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    restoreSession();

    return () => {
      active = false;
    };
  }, []);

  const completeAuthentication = async (request) => {
    const data = await request;

    if (!data?.access_token) {
      throw new Error(
        "Authentication succeeded without an access token."
      );
    }

    localStorage.setItem("token", data.access_token);

    try {
      const currentUser = await authApi.me();

      if (!currentUser) {
        throw new Error("Could not load your user profile.");
      }

      setUser(currentUser);
      return currentUser;
    } catch (error) {
      localStorage.removeItem("token");
      setUser(null);
      throw error;
    }
  };

  const login = (email, password) => {
    return completeAuthentication(authApi.login(email, password));
  };

  const signup = (email, password) => {
    return completeAuthentication(authApi.signup(email, password));
  };

  const googleLogin = (credential) => {
    return completeAuthentication(authApi.googleLogin(credential));
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        signup,
        googleLogin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

