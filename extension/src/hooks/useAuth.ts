import { useState, useEffect } from "react";

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string; // Optional avatar
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  error: string | null;
}

const DASHBOARD_URL =
  import.meta.env.VITE_DASHBOARD_URL_CLIENT || "http://localhost:3000";
const BACKEND_URL =
  import.meta.env.VITE_DASHBOARD_URL || "http://localhost:5000";
const AUTH_COOKIE_NAME = import.meta.env.VITE_AUTH_COOKIE_NAME || "connect.sid";

export const useAuth = () => {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    error: null,
  });

  const checkAuth = async () => {
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      // 1. Check for the cookie using multiple methods to be safe
      const cookies = await chrome.cookies.getAll({
        domain: new URL(BACKEND_URL).hostname,
      });

      const authCookie = cookies.find((c) => c.name === AUTH_COOKIE_NAME);

      if (!authCookie) {
        console.log(
          "[Auth] No cookie found for domain:",
          new URL(BACKEND_URL).hostname,
        );
        setState({
          isAuthenticated: false,
          isLoading: false,
          user: null,
          error: null,
        });
        return;
      }

      console.log("[Auth] Cookie found, fetching user profile...");

      // 2. Fetch real user profile from backend
      try {
        const response = await fetch(`${BACKEND_URL}/auth/me`, {
          credentials: "include",
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => "Unknown error");
          console.error("[Auth] Fetch me failed:", response.status, errorText);
          throw new Error(`Profile fetch failed (${response.status})`);
        }

        const userData = await response.json();
        console.log("[Auth] Profile fetched successfully:", userData.name);

        setState({
          isAuthenticated: true,
          isLoading: false,
          user: userData,
          error: null,
        });
      } catch (fetchErr: any) {
        console.error("[Auth] Fetch error:", fetchErr);
        // If fetch fails but cookie exists, maybe it's a network/CORS/CSP issue
        setState({
          isAuthenticated: false,
          isLoading: false,
          user: null,
          error: `Connection to backend failed: ${fetchErr.message}`,
        });
      }
    } catch (err: any) {
      console.error("Auth check failed:", err);
      setState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: "Failed to check authentication status.",
      });
    }
  };

  const login = () => {
    // Open the dashboard login page in a new tab
    chrome.tabs.create({ url: `${DASHBOARD_URL}/login` });
  };

  const logout = async () => {
    try {
      await chrome.cookies.remove({ url: BACKEND_URL, name: AUTH_COOKIE_NAME });
    } catch (e) {
      console.error("Failed to remove cookie:", e);
    }
    setState({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      error: null,
    });
  };

  // Initial check
  useEffect(() => {
    checkAuth();

    // Listen for cookie changes to auto-login/logout
    const handleCookieChange = (
      changeInfo: chrome.cookies.CookieChangeInfo,
    ) => {
      if (changeInfo.cookie.name === AUTH_COOKIE_NAME) {
        checkAuth();
      }
    };

    chrome.cookies.onChanged.addListener(handleCookieChange);
    return () => chrome.cookies.onChanged.removeListener(handleCookieChange);
  }, []);

  // Dev helper to bypass auth
  const debugLogin = () => {
    setState({
      isAuthenticated: true,
      isLoading: false,
      user: {
        id: "debug_user",
        name: "Debug Developer",
        email: "debug@gemini.hackathon",
        avatarUrl:
          "https://ui-avatars.com/api/?name=Debug+Dev&background=random",
      },
      error: null,
    });
  };

  return {
    ...state,
    login,
    logout,
    refresh: checkAuth,
    debugLogin, // Export for dev use
  };
};
