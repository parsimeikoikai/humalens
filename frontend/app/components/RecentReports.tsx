import { FileText, Lock, Globe, ArrowRight } from "lucide-react";

interface KnowledgeBase {
  name: string;
  description: string;
  docCount: number;
  updatedAt: string;
  isPublic: boolean;
  tags: string[];
}

const knowledgeBases: KnowledgeBase[] = [
  {
    name: "Acme Corp — Legal Contracts",
    description:
      "NDA agreements, vendor contracts, SLAs, and amendment history across all active engagements.",
    docCount: 148,
    updatedAt: "Jun 18, 2026",
    isPublic: false,
    tags: ["Legal", "Contracts"],
  },
  {
    name: "Research Papers — ML & Retrieval",
    description:
      "Curated collection of papers on dense retrieval, RAG architectures, and embedding methods.",
    docCount: 312,
    updatedAt: "Jun 15, 2026",
    isPublic: true,
    tags: ["Research", "AI/ML"],
  },
  {
    name: "Product Roadmap Docs",
    description:
      "PRDs, spec sheets, design briefs, and meeting notes for active product initiatives.",
    docCount: 67,
    updatedAt: "Jun 20, 2026",
    isPublic: false,
    tags: ["Product", "Internal"],
  },
];

export default function RecentReports() {
  return (
    <section className="py-20 px-6 bg-secondary/40">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-end justify-between mb-12">
          <div>
            <h2 className="text-3xl text-foreground">Featured Knowledge Bases</h2>
            <p className="text-muted-foreground mt-2">Curated collections ready to query</p>
          </div>
          <button className="flex items-center gap-1.5 text-sm text-accent hover:underline">
            Browse all
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {knowledgeBases.map((kb, index) => (
            <article
              key={index}
              className="bg-card border border-border rounded-xl p-6 hover:shadow-md
                         transition-all hover:border-accent/30 group cursor-pointer"
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
                  {kb.isPublic ? (
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

              <p className="text-sm text-muted-foreground mb-5 leading-relaxed line-clamp-2">
                {kb.description}
              </p>

              {/* Tags */}
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

              {/* Footer */}
              <div
                className="flex items-center justify-between pt-4 border-t border-border text-xs text-muted-foreground"
              >
                <span>{kb.docCount.toLocaleString()} documents</span>
                <span>Updated {kb.updatedAt}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

