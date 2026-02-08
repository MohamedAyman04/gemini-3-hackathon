
// Access environment variables with fallbacks for development
export const APP_BASE_URL = import.meta.env.VITE_APP_URL || 'http://localhost:3000';
export const WS_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
export const REST_API_URL = `${APP_BASE_URL}/api`;
export const AUTH_COOKIE_NAME = import.meta.env.VITE_AUTH_COOKIE_NAME || 'connect.sid';
