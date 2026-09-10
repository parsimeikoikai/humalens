import { fetchBaseQuery } from "@reduxjs/toolkit/query";
import type {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from "@reduxjs/toolkit/query";
import { createApi } from "@reduxjs/toolkit/query/react";

import { API_BASE_URL } from "@/app/lib/api/baseUrl";
import { endSession, getAuthToken } from "@/app/lib/auth/token";

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  prepareHeaders: (headers) => {
    const token = getAuthToken();

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    return headers;
  },
});

/**
 * A 401 from any endpoint means the stored token is gone, expired or
 * revoked. Ending the session here — once, centrally — is what stops the
 * app from sitting in a half-signed-in state where the shell says you're
 * logged in but every request fails.
 */

// A 401 from these is a rejected *credential*, not a rejected session — a
// signed-in user mistyping a password in the modal must not be signed out.
const CREDENTIAL_ENDPOINTS = ["/auth/login", "/auth/register", "/auth/forgot-password"];

const requestUrl = (args: string | FetchArgs): string =>
  typeof args === "string" ? args : args.url;

export const baseQuery: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions);

  const isCredentialCheck = CREDENTIAL_ENDPOINTS.some((endpoint) =>
    requestUrl(args).startsWith(endpoint)
  );

  if (result.error?.status === 401 && !isCredentialCheck && getAuthToken()) {
    endSession("expired");
  }

  return result;
};

// Thin wrapper export so other APIs can inject endpoints.
export const makeApi = (reducerPath: string) => {
  return createApi({
    reducerPath,
    baseQuery,
    endpoints: () => ({}),
  });
};
