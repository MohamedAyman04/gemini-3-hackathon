import { useState, useEffect } from "react";
import { APP_BASE_URL, AUTH_COOKIE_NAME, REST_API_URL } from "../config";

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
const COOKIE_DOMAIN_URL = APP_BASE_URL; // Cookie is set on Frontend Domain (Vercel) via Proxy

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
      console.log(`[Auth] Checking cookie: ${AUTH_COOKIE_NAME} on ${COOKIE_DOMAIN_URL}`);

      // Try finding standard cookie first
      let cookie = await chrome.cookies.get({
        url: COOKIE_DOMAIN_URL,
        name: AUTH_COOKIE_NAME,
      });

      // If not found, try finding PARTITIONED cookie (since backend uses Partitioned: true)
      if (!cookie) {
        try {
          // The partition key is usually the top-level site
          const topLevelSite = new URL(COOKIE_DOMAIN_URL).origin;
          console.log(`[Auth] Standard cookie not found. Trying partitioned cookie for key: ${topLevelSite}`);

          cookie = await chrome.cookies.get({
            url: COOKIE_DOMAIN_URL,
            name: AUTH_COOKIE_NAME,
            partitionKey: {
              topLevelSite: topLevelSite
            }
          });
        } catch (err) {
          console.warn("[Auth] Partitioned cookie check failed (browser might not support it):", err);
        }
      }

      // Fallback: Search all "connect.sid" cookies and match manually
      if (!cookie) {
        console.log("[Auth] Specific cookie not found, searching all cookies...");
        const allCookies = await chrome.cookies.getAll({ name: AUTH_COOKIE_NAME });
        console.log(`[Auth] Found ${allCookies.length} candidate cookies.`);
        allCookies.forEach(c => console.log(`[Auth] Candidate: Domain=${c.domain}, Path=${c.path}, PartitionKey=${JSON.stringify(c.partitionKey)}`));

        const domainStr = new URL(COOKIE_DOMAIN_URL).hostname;

        // Looser matching: check if cookie domain is a substring of config domain OR vice versa
        cookie = allCookies.find(c => {
          const cleanCookieDomain = c.domain.replace(/^\./, '');
          return domainStr.includes(cleanCookieDomain) || cleanCookieDomain.includes(domainStr);
        }) || null;
      }


      if (!cookie) {
        console.log("[Auth] No valid authentication cookie found.");
        setState({
          isAuthenticated: false,
          isLoading: false,
          user: null,
          error: null,
        });
        return;
      }

      console.log("[Auth] Cookie found:", cookie);

      console.log("[Auth] Cookie found, fetching user profile...");

      // 2. Fetch real user profile from backend
      try {
        const response = await fetch(`${REST_API_URL}/auth/me`, {
          credentials: "include",
          headers: {
            // Explicitly pass session ID because extension context might not attach partitioned cookies
            // correctly to cross-site requests (or requests to the proxy)
            'x-session-id': cookie.value
          }
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
      await chrome.cookies.remove({ url: REST_API_URL, name: AUTH_COOKIE_NAME });
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
        // Check if the cookie domain is relevant to our API Backend URL (where auth happens)
        const apiDomain = new URL(COOKIE_DOMAIN_URL).hostname;
        if (
          changeInfo.cookie.domain.includes(apiDomain) ||
          apiDomain.includes(changeInfo.cookie.domain.replace(/^\./, ""))
        ) {
          checkAuth();
        }
      }
    };

    chrome.cookies.onChanged.addListener(handleCookieChange);

    // Listen for direct Auth Success messages from the content script
    const handleRuntimeMessage = (message: any) => {
      if (message.type === "AUTH_SUCCESS_EVENT") {
        console.log("[Auth] Success event received from extension bridge");
        setState({
          isAuthenticated: true,
          isLoading: false,
          user: message.user,
          error: null,
        });

        // Still double check with backend to be absolutely sure the session is established
        setTimeout(() => checkAuth(), 1000);
      }
    };

    chrome.runtime.onMessage.addListener(handleRuntimeMessage);

    return () => {
      chrome.cookies.onChanged.removeListener(handleCookieChange);
      chrome.runtime.onMessage.removeListener(handleRuntimeMessage);
    };
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
