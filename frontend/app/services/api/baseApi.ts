import { fetchBaseQuery } from "@reduxjs/toolkit/query";
import { createApi } from "@reduxjs/toolkit/query/react";

import { API_BASE_URL } from "@/app/lib/api/baseUrl";

export const baseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
});

// Thin wrapper export so other APIs can inject endpoints.
export const makeApi = (reducerPath: string) => {
  return createApi({
    reducerPath,
    baseQuery,
    endpoints: () => ({}),
  });
};

