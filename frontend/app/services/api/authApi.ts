import { createApi } from "@reduxjs/toolkit/query/react";

import { baseQuery } from "@/app/services/api/baseApi";

export type LoginRequest = {
  email: string;
  password: string;
};

export type RegisterRequest = {
  email: string;
  password: string;
  full_name: string;
};

export type ForgotPasswordRequest = {
  email: string;
};

export type AuthUser = {
  name: string;
  email: string;
};

// Backend response shape is unknown here, so keep it flexible.
type AuthResponse = {
  name?: string;
  full_name?: string;
  email?: string;
  message?: string;
  user?: {
    name?: string;
    full_name?: string;
    email?: string;
  };
};

type MessageResponse = {
  message: string;
};

export const authApi = createApi({
  reducerPath: "authApi",
  baseQuery,
  endpoints: (builder) => ({
    login: builder.mutation<AuthResponse, LoginRequest>({
      query: (body) => ({
        url: "/auth/login",
        method: "POST",
        headers: {
          accept: "application/json",
          "Content-Type": "application/json",
        },
        body,
      }),
    }),
    register: builder.mutation<AuthResponse, RegisterRequest>({
      query: (body) => ({
        url: "/auth/register",
        method: "POST",
        headers: {
          accept: "application/json",
          "Content-Type": "application/json",
        },
        body,
      }),
    }),
    forgotPassword: builder.mutation<MessageResponse, ForgotPasswordRequest>({
      query: (body) => ({
        url: "/auth/forgot-password",
        method: "POST",
        headers: {
          accept: "application/json",
          "Content-Type": "application/json",
        },
        body,
      }),
    }),
  }),
});

export const {
  useForgotPasswordMutation,
  useLoginMutation,
  useRegisterMutation,
} = authApi;

