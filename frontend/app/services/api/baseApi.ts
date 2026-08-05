import { fetchBaseQuery } from "@reduxjs/toolkit/query";
import { createApi } from "@reduxjs/toolkit/query/react";

import { API_BASE_URL } from "@/app/lib/api/baseUrl";
import { getAuthToken } from "@/app/lib/auth/token";

export const baseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  prepareHeaders: (headers) => {
    const token = getAuthToken();

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    return headers;
  },
});

// Thin wrapper export so other APIs can inject endpoints.
export const makeApi = (reducerPath: string) => {
  return createApi({
    reducerPath,
    baseQuery,
    endpoints: () => ({}),
  });
};

