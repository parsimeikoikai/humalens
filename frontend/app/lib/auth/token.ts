const AUTH_TOKEN_STORAGE_KEY = "humalens:auth-token";
const AUTH_USER_STORAGE_KEY = "humalens:auth-user";

/** Fired whenever the session ends — either the user signed out, or the API
 *  rejected the token. The app listens for it so a stale session can never
 *  leave the UI rendering a signed-in shell that 401s on every request. */
export const SESSION_ENDED_EVENT = "humalens:session-ended";

export type StoredUser = {
  name: string;
  email: string;
};

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

export const isAuthenticated = (): boolean => getAuthToken() !== null;

/** The cached display name/email. Only ever a hint — the token is what
 *  actually grants access. */
export const getStoredUser = (): StoredUser | null => {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(AUTH_USER_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<StoredUser>;
    if (!parsed.email || !parsed.name) return null;

    return { name: parsed.name, email: parsed.email };
  } catch {
    window.localStorage.removeItem(AUTH_USER_STORAGE_KEY);
    return null;
  }
};

export const setStoredUser = (user: StoredUser): void => {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
};

/**
 * Drop every trace of the session and tell the app about it.
 *
 * `reason` distinguishes a deliberate sign-out from the API rejecting the
 * token, so the UI can explain itself ("your session expired") rather than
 * silently emptying the screen.
 */
export const endSession = (reason: "signed-out" | "expired"): void => {
  if (typeof window === "undefined") return;

  clearAuthToken();
  window.localStorage.removeItem(AUTH_USER_STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(SESSION_ENDED_EVENT, { detail: reason }));
};

/** Authorization header for callers that use plain fetch (uploads, SSE). */
export const authHeaders = (): Record<string, string> => {
  const token = getAuthToken();

  return token ? { Authorization: `Bearer ${token}` } : {};
};
