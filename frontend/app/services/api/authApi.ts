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

export type AuthResponse = {
  id: number;
  email: string;
  full_name?: string | null;
  message?: string;
  access_token: string;
  token_type?: string;
};

export type MeResponse = {
  id: number;
  email: string;
  full_name?: string | null;
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
    me: builder.query<MeResponse, void>({
      query: () => ({
        url: "/auth/me",
        headers: { accept: "application/json" },
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
  useLazyMeQuery,
  useLoginMutation,
  useRegisterMutation,
} = authApi;

