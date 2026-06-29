"use client";

import { useEffect, useState } from "react";
import {
  Search,
  Database,
  Upload,
  Sparkles,
  ChevronRight,
  Lock,
} from "lucide-react";

import { API_BASE_URL } from "@/app/lib/api/baseUrl";

interface HeroProps {
  onSearch: (query: string) => void;
  onUploadClick: () => void;
  onLoginClick: () => void;
  isAuthenticated: boolean;
}

type AdminOverviewResponse = {
  users: Array<unknown>;
  documents: Array<unknown>;
};

export default function Hero({
  onSearch,
  onUploadClick,
  onLoginClick,
  isAuthenticated,
}: HeroProps) {
  const [query, setQuery] = useState("");
  const [stats, setStats] = useState({
    documentsIndexed: 0,
    users: 0,
  });
  const [isStatsLoading, setIsStatsLoading] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query);
    }
  };

  useEffect(() => {
    const controller = new AbortController();

    const loadStats = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/admin/overview`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Unable to load platform stats.");
        }

        const data = (await response.json()) as AdminOverviewResponse;
        setStats({
          documentsIndexed: data.documents?.length ?? 0,
          users: data.users?.length ?? 0,
        });
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsStatsLoading(false);
        }
      }
    };

    loadStats();

    return () => {
      controller.abort();
    };
  }, []);

  const examples = [
    "Summarize Q3 revenue drivers",
    "What are our key compliance risks?",
    "Compare vendor pricing across contracts",
  ];

  return (
    <section className="bg-background pt-20 pb-24 px-6">
      <div className="max-w-4xl mx-auto text-center">
        {/* Eyebrow */}
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 bg-accent/8 border border-accent/20
                        rounded-full text-sm text-accent font-medium mb-6"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Multi-tenant AI document retrieval
        </div>

        <h1 className="text-5xl md:text-6xl mb-5 text-foreground tracking-tight leading-tight">
          Ask questions over<br />
          <span className="text-accent">any document</span>
        </h1>
        <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
          Ingest PDFs, DOCX, and text files into private knowledge bases.
          Get real-time, context-aware answers with rigorous source citations.
        </p>

        {/* Search form */}
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="relative group">
            <Search
              className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-accent transition-colors"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask anything across your documents..."
              className="w-full pl-14 pr-36 py-5 rounded-xl border border-border bg-card
                         focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent
                         text-lg placeholder:text-muted-foreground shadow-sm"
            />
            <button
              type="submit"
              disabled={!query.trim()}
              className="absolute right-3 top-1/2 -translate-y-1/2 px-5 py-2.5
                         bg-accent text-accent-foreground rounded-lg text-sm font-medium
                         hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Search
            </button>
          </div>

          {/* Badges */}
          <div className="flex items-center justify-center gap-3 mt-7 flex-wrap">
            <div className="group relative">
              <div
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-accent to-accent/80
                              text-accent-foreground rounded-full text-sm font-medium shadow-sm
                              hover:shadow-md transition-all cursor-default"
              >
                <Database className="w-4 h-4" />
                <span>Public knowledge bases</span>
                <Sparkles className="w-3.5 h-3.5 opacity-80" />
              </div>
              <div
                className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-2 bg-foreground text-background
                              rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity
                              pointer-events-none z-10"
              >
                Query across shared and curated document collections
              </div>
            </div>

            <span className="text-muted-foreground text-sm">or</span>

            <div className="group relative">
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={onUploadClick}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-card border-2 border-accent/30
                             text-foreground rounded-full text-sm font-medium
                             hover:bg-accent/5 hover:border-accent transition-all"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload your files</span>
                  <ChevronRight
                    className="w-3.5 h-3.5 opacity-60 group-hover:translate-x-0.5 transition-transform"
                  />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onLoginClick}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-card border-2 border-border
                             text-muted-foreground rounded-full text-sm font-medium
                             hover:border-accent hover:text-foreground transition-all"
                >
                  <Lock className="w-4 h-4" />
                  <span>Sign in to upload files</span>
                  <ChevronRight
                    className="w-3.5 h-3.5 opacity-60 group-hover:translate-x-0.5 transition-transform"
                  />
                </button>
              )}
              <div
                className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-2 bg-foreground text-background
                              rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity
                              pointer-events-none z-10"
              >
                {isAuthenticated
                  ? "Build private knowledge bases from your documents"
                  : "Create a free account to upload your documents"}
              </div>
            </div>
          </div>

          {/* Example queries */}
          <div className="mt-7 flex items-center justify-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">Try:</span>
            {examples.map((example, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setQuery(example)}
                className="text-sm px-3 py-1.5 rounded-lg bg-secondary hover:bg-accent/10
                           text-secondary-foreground hover:text-accent transition-all border border-transparent hover:border-accent/20"
              >
                {example}
              </button>
            ))}
          </div>
        </form>

        {/* Social proof */}
        <div className="mt-14 flex items-center justify-center gap-8 text-sm text-muted-foreground flex-wrap">
          {[
            [
              isStatsLoading ? "..." : stats.documentsIndexed.toLocaleString(),
              "documents indexed",
            ],
            [isStatsLoading ? "..." : stats.users.toLocaleString(), "users"],
          ].map(([stat, label]) => (
            <div key={label} className="text-center">
              <div className="text-2xl font-semibold text-foreground">{stat}</div>
              <div className="text-xs mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
