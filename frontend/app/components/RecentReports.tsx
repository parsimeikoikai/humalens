"use client";

import {
  FileText,
  Lock,
  Globe,
  ArrowRight,
  Search,
  Upload,
  ShieldCheck,
  Quote,
} from "lucide-react";

import { useListKnowledgeBasesQuery } from "@/app/services/api/knowledgeBaseApi";

interface RecentReportsProps {
  isAuthenticated: boolean;
  onQuery: (knowledgeBaseId: number) => void;
  onBrowseAll: () => void;
}

const formatDate = (value: string | null): string => {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const HOW_IT_WORKS = [
  {
    icon: Upload,
    title: "Ingest your documents",
    body: "Upload PDFs, DOCX and text files into a private knowledge base, or push text straight in over the API.",
  },
  {
    icon: Search,
    title: "Ask in plain language",
    body: "Hybrid retrieval combines dense embeddings with BM25 keyword search, so exact terms and paraphrases both land.",
  },
  {
    icon: Quote,
    title: "Get cited answers",
    body: "Responses stream back grounded in the retrieved chunks, with the source document and page behind every answer.",
  },
  {
    icon: ShieldCheck,
    title: "Isolated per tenant",
    body: "Every chunk is tagged with its owner and retrieval is always scoped to the caller. Your documents stay yours.",
  },
];

export default function RecentReports({
  isAuthenticated,
  onQuery,
  onBrowseAll,
}: RecentReportsProps) {
  // This section used to render three hardcoded, invented knowledge bases
  // ("Acme Corp — Legal Contracts", 148 documents) as though they were real.
  // Signed in, show the user's own; signed out, explain the product instead
  // of fabricating content.
  const { data: knowledgeBases = [], isLoading } = useListKnowledgeBasesQuery(
    undefined,
    { skip: !isAuthenticated }
  );

  const recent = [...knowledgeBases]
    .sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""))
    .slice(0, 3);

  if (!isAuthenticated || (!isLoading && recent.length === 0)) {
    return (
      <section className="py-20 px-6 bg-secondary/40">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12">
            <h2 className="text-3xl text-foreground">How Humalens works</h2>
            <p className="text-muted-foreground mt-2">
              {isAuthenticated
                ? "Create your first knowledge base to see it here."
                : "From raw documents to cited answers in three steps."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {HOW_IT_WORKS.map(({ icon: Icon, title, body }) => (
              <article
                key={title}
                className="bg-card border border-border rounded-xl p-6 hover:shadow-md
                           transition-all hover:border-accent/30"
              >
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-accent" />
                </div>
                <h3 className="text-base font-medium text-foreground mb-2 leading-snug">
                  {title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 px-6 bg-secondary/40">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-end justify-between mb-12">
          <div>
            <h2 className="text-3xl text-foreground">Your Knowledge Bases</h2>
            <p className="text-muted-foreground mt-2">
              Recently updated collections, ready to query
            </p>
          </div>
          <button
            onClick={onBrowseAll}
            className="flex items-center gap-1.5 text-sm text-accent hover:underline"
          >
            Browse all
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {isLoading
            ? [0, 1, 2].map((key) => (
                <div
                  key={key}
                  className="bg-card border border-border rounded-xl p-6 animate-pulse h-56"
                />
              ))
            : recent.map((kb) => (
                <article
                  key={kb.id}
                  onClick={() => onQuery(kb.id)}
                  className="bg-card border border-border rounded-xl p-6 hover:shadow-md
                             transition-all hover:border-accent/30 group cursor-pointer flex flex-col"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center
                                    group-hover:bg-accent/20 transition-colors"
                    >
                      <FileText className="w-5 h-5 text-accent" />
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      {kb.visibility === "public" ? (
                        <>
                          <Globe className="w-3.5 h-3.5" /> Public
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5" /> Private
                        </>
                      )}
                    </div>
                  </div>

                  <h3 className="text-base font-medium text-foreground mb-2 leading-snug">
                    {kb.name}
                  </h3>

                  <p className="text-sm text-muted-foreground mb-5 leading-relaxed line-clamp-2 flex-1">
                    {kb.description || "No description."}
                  </p>

                  {/* Tags */}
                  {kb.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-5">
                      {kb.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-xs px-2.5 py-1 bg-secondary text-secondary-foreground rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-border text-xs text-muted-foreground">
                    <span>
                      {kb.document_count.toLocaleString()}{" "}
                      {kb.document_count === 1 ? "document" : "documents"}
                    </span>
                    <span>Updated {formatDate(kb.updated_at)}</span>
                  </div>
                </article>
              ))}
        </div>
      </div>
    </section>
  );
}
