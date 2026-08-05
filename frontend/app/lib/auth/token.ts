const AUTH_TOKEN_STORAGE_KEY = "humalens:auth-token";

/**
 * The JWT is the single source of truth for a session — every authenticated
 * request reads it from here, so plain fetch() callers and RTK Query stay in
 * sync without threading the token through props.
 */
export const getAuthToken = (): string | null => {
  if (typeof window === "undefined") return null;

  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
};

export const setAuthToken = (token: string): void => {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
};

export const clearAuthToken = (): void => {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
};

/** Authorization header for callers that use plain fetch (uploads, SSE). */
export const authHeaders = (): Record<string, string> => {
  const token = getAuthToken();

  return token ? { Authorization: `Bearer ${token}` } : {};
};
