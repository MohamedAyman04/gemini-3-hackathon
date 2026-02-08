import { AUTH_COOKIE_NAME, APP_BASE_URL } from '../config';

const COOKIE_DOMAIN_URL = APP_BASE_URL;

/**
 * Retrieves the session ID from the connect.sid cookie, handling partitioned cookies
 * and fallback search logic for robust extension authentication.
 */
export const getExtensionSessionId = async (): Promise<string | null> => {
    // 1. Try standard get
    try {
        let cookie = await chrome.cookies.get({
            url: COOKIE_DOMAIN_URL,
            name: AUTH_COOKIE_NAME
        });

        // 2. Try partitioned cookie (if backend uses Partitioned: true)
        if (!cookie) {
            try {
                const topLevelSite = new URL(COOKIE_DOMAIN_URL).origin;
                cookie = await chrome.cookies.get({
                    url: COOKIE_DOMAIN_URL,
                    name: AUTH_COOKIE_NAME,
                    partitionKey: {
                        topLevelSite: topLevelSite
                    }
                });
            } catch (err) {
                // Ignore errors if browser doesn't support partitioned cookies
            }
        }

        // 3. Fallback: Search all "connect.sid" cookies and match manually
        if (!cookie) {
            const allCookies = await chrome.cookies.getAll({ name: AUTH_COOKIE_NAME });

            const domainStr = new URL(COOKIE_DOMAIN_URL).hostname;

            // Looser matching: check if cookie domain is a substring of config domain OR vice versa
            cookie = allCookies.find(c => {
                const cleanCookieDomain = c.domain.replace(/^\./, '');
                return domainStr.includes(cleanCookieDomain) || cleanCookieDomain.includes(domainStr);
            }) || null;
        }

        return cookie ? cookie.value : null;

    } catch (error) {
        console.error("Error retrieving session cookie:", error);
        return null;
    }
};
