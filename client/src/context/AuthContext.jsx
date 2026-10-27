import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useToast } from "./ToastContext";

const API_BASE = "http://localhost:5000/api";
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("token") || null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  // Helper to parse JWT payload for quick expiry check
  const isTokenExpired = (jwtToken) => {
    try {
      const base64Url = jwtToken.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      const { exp } = JSON.parse(jsonPayload);
      if (!exp) return false;
      return Date.now() >= exp * 1000;
    } catch {
      return true;
    }
  };

  const logout = useCallback((reason = null) => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    if (reason) {
      toast.warning(reason);
    } else {
      toast.info("Logged out successfully");
    }
  }, [toast]);

  // Fetch current user details
  const fetchCurrentUser = useCallback(async (authToken) => {
    if (!authToken || isTokenExpired(authToken)) {
      logout(authToken ? "Session expired. Please log in again." : null);
      setLoading(false);
      return;
    }

    try {
      const res = await axios.get(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setUser(res.data.user);
    } catch (err) {
      console.warn("Auth check failed:", err.response?.data?.message || err.message);
      logout("Session invalid or expired. Please log in.");
    } finally {
      setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    if (token) {
      fetchCurrentUser(token);
    } else {
      setLoading(false);
    }
  }, [token, fetchCurrentUser]);

  // Setup Axios global response interceptor for 401s
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401) {
          const errMsg = error.response.data?.message || "Session expired";
          logout(`Authentication error: ${errMsg}`);
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [logout]);

  // Google Login
  const loginWithGoogle = async (credential) => {
    try {
      setLoading(true);
      const res = await axios.post(`${API_BASE}/auth/google`, { credential });
      const newToken = res.data.token;
      const newUser = res.data.user;

      localStorage.setItem("token", newToken);
      setToken(newToken);
      setUser(newUser);
      toast.success(`Welcome, ${newUser.name}! Logged in as ${newUser.role}`);
      return { success: true, user: newUser };
    } catch (err) {
      const msg = err.response?.data?.message || "Google authentication failed";
      toast.error(msg);
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  };

  // Demo Login (Citizen, Dispatcher, Admin)
  const loginWithDemo = async (role) => {
    try {
      setLoading(true);
      const res = await axios.post(`${API_BASE}/auth/demo-login`, { role });
      const newToken = res.data.token;
      const newUser = res.data.user;

      localStorage.setItem("token", newToken);
      setToken(newToken);
      setUser(newUser);
      toast.success(`Logged in as ${role.toUpperCase()} successfully!`);
      return { success: true, user: newUser };
    } catch (err) {
      const msg = err.response?.data?.message || "Demo login failed";
      toast.error(msg);
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        role: user?.role || null,
        loginWithGoogle,
        loginWithDemo,
        logout,
        refreshUser: () => fetchCurrentUser(token)
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
