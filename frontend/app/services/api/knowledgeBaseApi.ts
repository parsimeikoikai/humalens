import { createApi } from "@reduxjs/toolkit/query/react";

import { API_BASE_URL } from "@/app/lib/api/baseUrl";
import { authHeaders } from "@/app/lib/auth/token";
import { baseQuery } from "@/app/services/api/baseApi";

export type Visibility = "private" | "public";

export type KnowledgeBase = {
  id: number;
  name: string;
  description: string | null;
  tags: string[];
  visibility: Visibility;
  status: "empty" | "indexing" | "ready" | "failed";
  created_at: string | null;
  updated_at: string | null;
  document_count: number;
  chunk_count: number;
  total_size: number;
};

export type KnowledgeBaseDocument = {
  id: number;
  knowledge_base_id: number;
  original_filename: string | null;
  mime_type: string | null;
  size: number | null;
  category: string | null;
  pages: number | null;
  chunks: number;
  status: string;
  created_at: string | null;
};

export type CreateKnowledgeBaseRequest = {
  name: string;
  description?: string;
  tags?: string[];
  visibility?: Visibility;
};

export type UpdateKnowledgeBaseRequest = {
  id: number;
  name?: string;
  description?: string;
  tags?: string[];
  visibility?: Visibility;
};

export const knowledgeBaseApi = createApi({
  reducerPath: "knowledgeBaseApi",
  baseQuery,
  tagTypes: ["KnowledgeBase", "Document"],
  endpoints: (builder) => ({
    listKnowledgeBases: builder.query<KnowledgeBase[], void>({
      query: () => ({
        url: "/knowledge-bases",
        headers: { accept: "application/json" },
      }),
      providesTags: (result) => [
        { type: "KnowledgeBase" as const, id: "LIST" },
        ...(result ?? []).map((kb) => ({
          type: "KnowledgeBase" as const,
          id: kb.id,
        })),
      ],
    }),

    createKnowledgeBase: builder.mutation<
      KnowledgeBase,
      CreateKnowledgeBaseRequest
    >({
      query: (body) => ({
        url: "/knowledge-bases",
        method: "POST",
        headers: {
          accept: "application/json",
          "Content-Type": "application/json",
        },
        body,
      }),
      invalidatesTags: [{ type: "KnowledgeBase", id: "LIST" }],
    }),

    updateKnowledgeBase: builder.mutation<
      KnowledgeBase,
      UpdateKnowledgeBaseRequest
    >({
      query: ({ id, ...body }) => ({
        url: `/knowledge-bases/${id}`,
        method: "PATCH",
        headers: {
          accept: "application/json",
          "Content-Type": "application/json",
        },
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "KnowledgeBase", id },
        { type: "KnowledgeBase", id: "LIST" },
      ],
    }),

    deleteKnowledgeBase: builder.mutation<void, number>({
      query: (id) => ({
        url: `/knowledge-bases/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "KnowledgeBase", id },
        { type: "KnowledgeBase", id: "LIST" },
      ],
    }),

    /**
     * Category values that exist across the caller's own documents — what
     * the search sidebar filters on. Previously the sidebar offered a fixed
     * list of humanitarian "crisis types" that could never match anything a
     * user had actually uploaded.
     */
    listCategories: builder.query<string[], number | null | undefined>({
      query: (knowledgeBaseId) => ({
        url: "/query/categories",
        params: knowledgeBaseId ? { knowledge_base_id: knowledgeBaseId } : undefined,
        headers: { accept: "application/json" },
      }),
      providesTags: [{ type: "Document", id: "CATEGORIES" }],
    }),

    listDocuments: builder.query<KnowledgeBaseDocument[], number>({
      query: (knowledgeBaseId) => ({
        url: `/knowledge-bases/${knowledgeBaseId}/documents`,
        headers: { accept: "application/json" },
      }),
      providesTags: (_result, _error, knowledgeBaseId) => [
        { type: "Document", id: knowledgeBaseId },
      ],
    }),

    deleteDocument: builder.mutation<
      void,
      { knowledgeBaseId: number; documentId: number }
    >({
      query: ({ knowledgeBaseId, documentId }) => ({
        url: `/knowledge-bases/${knowledgeBaseId}/documents/${documentId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { knowledgeBaseId }) => [
        { type: "Document", id: knowledgeBaseId },
        { type: "Document", id: "CATEGORIES" },
        { type: "KnowledgeBase", id: knowledgeBaseId },
        { type: "KnowledgeBase", id: "LIST" },
      ],
    }),
  }),
});

/**
 * Uploads bypass RTK Query: fetchBaseQuery can't report upload progress and
 * would need the FormData boundary set by hand. Callers invalidate the cache
 * afterwards with `invalidateKnowledgeBases`.
 */
export const uploadDocument = async (
  knowledgeBaseId: number,
  file: File,
  category?: string,
): Promise<KnowledgeBaseDocument> => {
  const formData = new FormData();
  formData.append("file", file);

  if (category?.trim()) {
    formData.append("category", category.trim());
  }

  const response = await fetch(
    `${API_BASE_URL}/knowledge-bases/${knowledgeBaseId}/documents`,
    {
      method: "POST",
      headers: authHeaders(),
      body: formData,
    },
  );

  if (!response.ok) {
    let detail = "Upload failed";

    try {
      const data = await response.json();
      detail = data?.detail ?? data?.message ?? detail;
    } catch {
      // Non-JSON error body — keep the fallback message.
    }

    throw new Error(detail);
  }

  return (await response.json()) as KnowledgeBaseDocument;
};

export const invalidateKnowledgeBases = () =>
  knowledgeBaseApi.util.invalidateTags([
    { type: "KnowledgeBase" as const, id: "LIST" },
    { type: "Document" as const, id: "CATEGORIES" },
  ]);

export const {
  useCreateKnowledgeBaseMutation,
  useListCategoriesQuery,
  useDeleteDocumentMutation,
  useDeleteKnowledgeBaseMutation,
  useListDocumentsQuery,
  useListKnowledgeBasesQuery,
  useUpdateKnowledgeBaseMutation,
} = knowledgeBaseApi;
