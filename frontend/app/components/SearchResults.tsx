"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, FileText, Lock } from "lucide-react";

import Navbar from "./Navbar";
import SearchFilters from "./SearchFilters";
import { API_BASE_URL } from "@/app/lib/api/baseUrl";
import { authHeaders, endSession, getAuthToken } from "@/app/lib/auth/token";

interface User {
  name: string;
  email: string;
}

interface SearchResultsProps {
  query: string;
  onBack: () => void;
  /** Restrict retrieval to one knowledge base; null searches all of them. */
  knowledgeBaseId?: number | null;
  /** How many chunks to retrieve — chosen by the user on the search form. */
  topK?: number;
  user: User | null;
  onLoginClick: () => void;
  onRegisterClick: () => void;
  onLogout: () => void;
  onUploadClick: () => void;
  onKBClick: () => void;
  onHomeClick: () => void;
}

interface Filters {
  categories: string[];
}

interface QueryResultItem {
  id: number;
  source: string;
  page?: number | null;
  excerpt: string;
  score: number;
  category?: string | null;
}

/** Retrieval scores come from two fused rankings on different scales, and
 *  cosine similarity can go negative — so clamp before showing a percentage
 *  rather than rendering "-12% match". */
const toMatchPercentage = (score: number): number =>
  Math.round(Math.min(Math.max(score, 0), 1) * 100);

export default function SearchResults({
  query,
  onBack,
  knowledgeBaseId = null,
  topK = 3,
  user,
  onLoginClick,
  onRegisterClick,
  onLogout,
  onUploadClick,
  onKBClick,
  onHomeClick,
}: SearchResultsProps) {
  const [filters, setFilters] = useState<Filters>({ categories: [] });

  const [answer, setAnswer] = useState("");
  const [streamSources, setStreamSources] = useState("");
  const [streamError, setStreamError] = useState("");
  // Set when the API rejects the session, so the page can offer a way back
  // in instead of showing a bare "Not authenticated" error string.
  const [needsAuth, setNeedsAuth] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sources, setSources] = useState<QueryResultItem[]>([]);

  const selectedCategories = filters.categories.join(",");

  const sourceLabels = useMemo(() => {
    return streamSources
      .split(",")
      .map((source) => source.trim())
      .filter(Boolean);
  }, [streamSources]);

  useEffect(() => {
    const controller = new AbortController();

    const handleSseEvent = (rawEvent: string) => {
      const lines = rawEvent.split("\n");
      const event =
        lines
          .find((line) => line.startsWith("event:"))
          ?.replace("event:", "")
          .trim() || "message";

      // Per the SSE spec a single space after "data:" is a separator, not
      // content. Keeping it inserted a stray space in front of every
      // streamed token.
      const data = lines
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).replace(/^ /, ""))
        .join("\n");

      if (event === "message") {
        setAnswer((currentAnswer) => `${currentAnswer}${data}`);
        return;
      }

      if (event === "sources") {
        setStreamSources(data);
        return;
      }

      if (event === "error") {
        setStreamError(data || "The query stream returned an error.");
        setIsStreaming(false);
        return;
      }

      if (event === "retrieved_documents") {
        try {
          setSources(JSON.parse(data));
        } catch (err) {
          console.error("Failed to parse retrieved documents", err);
        }
        return;
      }

      if (event === "done") {
        setIsStreaming(false);
      }
    };

    const runQuery = async () => {
      setAnswer("");
      setStreamSources("");
      setStreamError("");
      setSources([]);
      setNeedsAuth(false);

      // Search only ever reads the caller's own documents, so without a
      // token there is nothing to search. Say so directly instead of
      // firing a request that comes back 401.
      if (!getAuthToken()) {
        setNeedsAuth(true);
        setIsStreaming(false);
        return;
      }

      setIsStreaming(true);

      try {
        const response = await fetch(`${API_BASE_URL}/query/stream`, {
          method: "POST",
          headers: {
            accept: "text/event-stream",
            "Content-Type": "application/json",
            ...authHeaders(),
          },
          body: JSON.stringify({
            question: query,
            top_k: topK,
            categories:
              filters.categories.length > 0 ? filters.categories : undefined,
            knowledge_base_id: knowledgeBaseId ?? undefined,
          }),
          signal: controller.signal,
        });

        if (response.status === 401) {
          // The token is gone, expired or revoked. Ending the session here
          // keeps the rest of the app from staying in a signed-in state
          // that fails on every request.
          setNeedsAuth(true);
          setIsStreaming(false);
          endSession("expired");
          return;
        }

        if (!response.ok) {
          let detail = "Unable to query the knowledge base.";
          try {
            const data = await response.json();
            detail = data?.detail ?? data?.message ?? detail;
          } catch {
            // keep fallback message
          }
          throw new Error(detail);
        }

        if (!response.body) {
          throw new Error("The query stream did not return a response body.");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split("\n\n");
          buffer = events.pop() ?? "";

          events.forEach(handleSseEvent);
        }

        if (buffer.trim()) {
          handleSseEvent(buffer);
        }

        setIsStreaming(false);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }

        setStreamError(
          err instanceof Error
            ? err.message
            : "Unable to query the knowledge base."
        );
        setIsStreaming(false);
      }
    };

    runQuery();

    return () => {
      controller.abort();
    };
    // `user` is a dependency so signing in from this page re-runs the query
    // that was blocked while signed out.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, topK, knowledgeBaseId, selectedCategories, user]);

  const hasAnswer = !needsAuth && !streamError;

  return (
    <div className="min-h-screen bg-background">
      <Navbar
        user={user}
        onUploadClick={onUploadClick}
        onLoginClick={onLoginClick}
        onRegisterClick={onRegisterClick}
        onLogout={onLogout}
        onKBClick={onKBClick}
        onHomeClick={onHomeClick}
        activeView="search"
      />

      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to search
          </button>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Your query:</span>
            <h1 className="text-xl text-foreground">{query}</h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex gap-8">
          {/* Sidebar Filters */}
          <div className="w-80 flex-shrink-0">
            <SearchFilters
              filters={filters}
              onFilterChange={setFilters}
              resultCount={sources.length}
              knowledgeBaseId={knowledgeBaseId}
              isAuthenticated={!!user}
            />
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* AI Answer Section */}
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-8 mb-8 shadow-lg">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                  <span className="text-accent-foreground text-sm font-semibold">
                    AI
                  </span>
                </div>

                <div>
                  <h2 className="text-lg mb-1 text-white">Answer</h2>
                  <p className="text-sm text-slate-400">
                    {needsAuth
                      ? "Sign in to search your documents"
                      : isStreaming
                        ? "Streaming from your indexed documents..."
                        : sourceLabels.length > 0
                          ? `Generated from ${sourceLabels.length} retrieved sources`
                          : "Generated from retrieved context"}
                  </p>
                </div>
              </div>

              <div className="mb-4 pb-4 border-b border-slate-700">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-sm">
                  <FileText className="w-4 h-4 text-accent" />
                  <span className="text-slate-200">
                    <strong className="text-white">Endpoint:</strong>{" "}
                    /query/stream
                  </span>
                </div>
              </div>

              {needsAuth ? (
                <div className="rounded-lg border border-slate-600 bg-slate-800/60 px-5 py-6 text-center">
                  <div className="w-11 h-11 rounded-xl bg-accent/15 flex items-center justify-center mx-auto mb-3">
                    <Lock className="w-5 h-5 text-accent" />
                  </div>
                  <p className="text-white font-medium mb-1">
                    Sign in to run this search
                  </p>
                  <p className="text-sm text-slate-400 mb-5 max-w-md mx-auto">
                    Humalens only ever searches your own documents, so this
                    query needs an account. Sign in and we&apos;ll run it for
                    you straight away.
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={onLoginClick}
                      className="px-5 py-2.5 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:bg-accent/90 transition-all"
                    >
                      Sign In
                    </button>
                    <button
                      onClick={onRegisterClick}
                      className="px-5 py-2.5 border border-slate-600 text-slate-200 rounded-lg text-sm font-medium hover:bg-slate-800 transition-all"
                    >
                      Create an account
                    </button>
                  </div>
                </div>
              ) : streamError ? (
                <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-red-200">
                  {streamError}
                </div>
              ) : (
                <div className="prose prose-invert max-w-none">
                  <p className="whitespace-pre-wrap leading-relaxed text-slate-200">
                    {answer ||
                      (isStreaming
                        ? "Searching indexed documents and generating an answer..."
                        : "No answer was returned.")}
                    {isStreaming && (
                      <span className="ml-1 inline-block h-4 w-2 animate-pulse bg-accent align-middle" />
                    )}
                  </p>
                </div>
              )}

              {hasAnswer && (
                <div className="mt-6 pt-6 border-t border-slate-700">
                  <p className="text-sm text-slate-400 mb-3">
                    Sources used to generate this answer:
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {sourceLabels.length > 0 ? (
                      sourceLabels.map((source, index) => (
                        <span
                          key={`${source}-${index}`}
                          className="inline-flex items-center gap-1 text-sm px-3 py-1 bg-slate-800 border border-slate-600 rounded-full text-slate-200"
                        >
                          [{index + 1}] {source}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-slate-400">
                        {isStreaming
                          ? "Retrieving sources..."
                          : "No sources returned yet"}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Source Documents */}
            <div className="mb-6">
              <h2 className="text-2xl mb-2 text-foreground">Source Documents</h2>
              <p className="text-muted-foreground">
                {needsAuth
                  ? "Sign in to see the documents behind an answer"
                  : isStreaming && sources.length === 0
                    ? "Retrieving source documents..."
                    : `${sources.length} ${
                        sources.length === 1 ? "document" : "documents"
                      } found • Sorted by relevance`}
              </p>
            </div>

            <div className="space-y-4">
              {sources.length > 0 ? (
                sources.map((source) => (
                  <article
                    key={source.id}
                    className="bg-card border border-border rounded-xl p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-accent text-accent-foreground text-sm font-semibold">
                          {source.id}
                        </span>

                        {source.page ? (
                          <span className="inline-block px-2 py-1 bg-accent/10 text-accent rounded text-xs">
                            Page {source.page}
                          </span>
                        ) : null}

                        {source.category ? (
                          <span className="inline-block px-2 py-1 bg-secondary text-secondary-foreground rounded text-xs">
                            {source.category}
                          </span>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="text-accent">
                          {toMatchPercentage(source.score)}% match
                        </span>
                      </div>
                    </div>

                    <h3 className="text-lg mb-3 text-foreground leading-snug">
                      {source.source}
                    </h3>

                    <p className="text-muted-foreground mb-4 leading-relaxed whitespace-pre-wrap">
                      {source.excerpt}
                    </p>
                  </article>
                ))
              ) : (
                <div className="text-sm text-muted-foreground">
                  {needsAuth
                    ? "No documents to show while signed out."
                    : isStreaming
                      ? "Retrieving source documents..."
                      : "No source documents matched this query."}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
