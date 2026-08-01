import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, FileText } from "lucide-react";

import SearchFilters from "./SearchFilters";
import { API_BASE_URL } from "@/app/lib/api/baseUrl";

interface SearchResultsProps {
  query: string;
  onBack: () => void;
}

interface Filters {
  crisisTypes: string[];
}


interface QueryResultItem {
  id: number;
  source: string;
  page?: number | null;
  excerpt: string;
  score: number;
  category?: string | null;
}

export default function SearchResults({ query, onBack }: SearchResultsProps) {
  const [filters, setFilters] = useState<Filters>({
    crisisTypes: []
  });

  const [answer, setAnswer] = useState("");
  const [streamSources, setStreamSources] = useState("");
  const [streamError, setStreamError] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [sources, setSources] = useState<QueryResultItem[]>([]);



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

      const data = lines
        .filter(line => line.startsWith("data:"))
        .map(line => line.substring(5)) // removes only "data:"
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
      setIsStreaming(true);

      try {
        const response = await fetch(`${API_BASE_URL}/query/stream`, {
          method: "POST",
          headers: {
            accept: "text/event-stream",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            question: query,
            top_k: 3,
            crisis_types: filters.crisisTypes.length > 0 ? filters.crisisTypes : undefined,
          }),
          signal: controller.signal,
        });

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, filters.crisisTypes.join(",")]);



  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card sticky top-0 z-10">
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
            <SearchFilters filters={filters} onFilterChange={setFilters} resultCount={sources.length} />
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
                    {isStreaming
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

              {streamError ? (
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
                      {isStreaming ? "Retrieving sources..." : "No sources returned yet"}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Source Documents */}
            <div className="mb-6">
              <h2 className="text-2xl mb-2 text-foreground">Source Reports</h2>
              <p className="text-muted-foreground">
                {isStreaming && sources.length === 0
                  ? "Retrieving source documents..."
                  : `${sources.length} reports found • Sorted by relevance`}
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

                        <span className="inline-block px-3 py-1 bg-secondary text-secondary-foreground rounded-md text-sm">
                          {source.source}
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
                          {Math.round(source.score * 100)}% match
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
                <div className="text-sm text-slate-400">
                  {isStreaming
                    ? "Retrieving source documents..."
                    : "No source documents returned."}
                </div>
              )}
            </div>

            {/* Related Searches */}
            {/*
            <div className="mt-12 p-6 bg-secondary rounded-xl">
              <h3 className="text-foreground mb-4">Related searches you might find useful:</h3>
              <div className="flex flex-wrap gap-2">
                <button className="px-4 py-2 bg-card border border-border rounded-lg text-foreground hover:border-accent transition-colors">
                  What are the main protection concerns in DRC?
                </button>
                <button className="px-4 py-2 bg-card border border-border rounded-lg text-foreground hover:border-accent transition-colors">
                  Food security status in North Kivu
                </button>
                <button className="px-4 py-2 bg-card border border-border rounded-lg text-foreground hover:border-accent transition-colors">
                  Healthcare access for IDPs in eastern DRC
                </button>
              </div>
            </div>
            */}
          </div>
        </div>
      </div>
    </div>
  );
}
