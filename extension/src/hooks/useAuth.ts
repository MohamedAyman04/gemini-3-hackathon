import { useState, useEffect } from "react";
import { APP_BASE_URL, API_BASE_URL, AUTH_COOKIE_NAME } from "../config";

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

const DASHBOARD_URL = APP_BASE_URL;
const COOKIE_DOMAIN_URL = API_BASE_URL; // Cookie is set on Backend Domain in production!

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
      // 1. Check for the cookie
      // Note: This requires "cookies" permission and host permissions for the URL
      // explicit check on API_BASE_URL because that's where the backend sets the cookie
      const cookie = await chrome.cookies.get({
        url: COOKIE_DOMAIN_URL,
        name: AUTH_COOKIE_NAME,
      });

      if (!cookie) {
        setState({
          isAuthenticated: false,
          isLoading: false,
          user: null,
          error: null,
        });
        return;
      }

      // 2. If cookie exists, fetching user profile (Placeholder for API call)
      // In a real scenario, we would use the cookie to make a request to /api/me
      // const response = await fetch(`${DASHBOARD_URL}/api/me`);
      // const userData = await response.json();

      // MOCK DATA for now since backend is not ready
      const mockUser: User = {
        id: "user_123",
        name: "VibeCheck User",
        email: "user@vibecheck.ai",
        avatarUrl: `https://ui-avatars.com/api/?name=VibeCheck+User&background=random`,
      };

      setState({
        isAuthenticated: true,
        isLoading: false,
        user: mockUser,
        error: null,
      });
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
    // Placeholder: In reality, we might clear the cookie or call an API
    // await chrome.cookies.remove({ url: DASHBOARD_URL, name: AUTH_COOKIE_NAME });
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

    // Optional: Listen for cookie changes to auto-login/logout
    const handleCookieChange = (
      changeInfo: chrome.cookies.CookieChangeInfo,
    ) => {
      if (
        changeInfo.cookie.name === AUTH_COOKIE_NAME
      ) {
        // Check if the cookie domain is relevant to our API Backend URL (where auth happens)
        const apiDomain = new URL(COOKIE_DOMAIN_URL).hostname;
        if (changeInfo.cookie.domain.includes(apiDomain) || apiDomain.includes(changeInfo.cookie.domain.replace(/^\./, ''))) {
          checkAuth();
        }
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
