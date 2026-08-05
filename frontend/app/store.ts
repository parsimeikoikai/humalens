import { configureStore } from "@reduxjs/toolkit";

import { authApi } from "@/app/services/api/authApi";
import { knowledgeBaseApi } from "@/app/services/api/knowledgeBaseApi";

const store = configureStore({
  reducer: {
    [authApi.reducerPath]: authApi.reducer,
    [knowledgeBaseApi.reducerPath]: knowledgeBaseApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(authApi.middleware, knowledgeBaseApi.middleware),
  devTools: process.env.NODE_ENV !== "production",
});

export { store };
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

