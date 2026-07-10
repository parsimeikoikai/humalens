import { useState } from "react";
import {
  Plus, FolderOpen, FileText, Globe, Lock, MoreHorizontal,
  Search, Upload, Trash2, Pencil, ExternalLink, Database,
  TrendingUp, Clock, CheckCircle,
} from "lucide-react";
import CreateKBModal from "./CreateKBModal";


interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  docCount: number;
  sizeLabel: string;
  updatedAt: string;
  createdAt: string;
  isPublic: boolean;
  tags: string[];
  status: "ready" | "indexing" | "error";
  queryCount: number;
}

const INITIAL_KBS: KnowledgeBase[] = [
  {
    id: "1",
    name: "Legal Contracts",
    description: "NDA agreements, vendor contracts, SLAs, and amendment history across all active engagements.",
    docCount: 148,
    sizeLabel: "312 MB",
    updatedAt: "Jun 18, 2026",
    createdAt: "Jan 5, 2026",
    isPublic: false,
    tags: ["Legal", "Contracts"],
    status: "ready",
    queryCount: 427,
  },
  {
    id: "2",
    name: "Research Papers — ML & Retrieval",
    description: "Curated collection of papers on dense retrieval, RAG architectures, and embedding methods.",
    docCount: 312,
    sizeLabel: "1.2 GB",
    updatedAt: "Jun 15, 2026",
    createdAt: "Mar 12, 2026",
    isPublic: true,
    tags: ["Research", "AI/ML"],
    status: "ready",
    queryCount: 1840,
  },
  {
    id: "3",
    name: "Product Roadmap Docs",
    description: "PRDs, spec sheets, design briefs, and meeting notes for active product initiatives.",
    docCount: 67,
    sizeLabel: "89 MB",
    updatedAt: "Jun 20, 2026",
    createdAt: "Feb 28, 2026",
    isPublic: false,
    tags: ["Product", "Internal"],
    status: "ready",
    queryCount: 203,
  },
  {
    id: "4",
    name: "Financial Reports Q1–Q2 2026",
    description: "Quarterly earnings, analyst reports, P&L statements, and board presentation decks.",
    docCount: 34,
    sizeLabel: "145 MB",
    updatedAt: "Jun 21, 2026",
    createdAt: "Apr 1, 2026",
    isPublic: false,
    tags: ["Finance", "Reports"],
    status: "indexing",
    queryCount: 88,
  },
];

const statusConfig = {
  ready: { label: "Ready", color: "text-green-600", bg: "bg-green-50", dot: "bg-green-500" },
  indexing: { label: "Indexing…", color: "text-amber-600", bg: "bg-amber-50", dot: "bg-amber-400 animate-pulse" },
  error: { label: "Error", color: "text-destructive", bg: "bg-destructive/8", dot: "bg-destructive" },
};

interface KnowledgeBasesProps {
  onQuery: (query: string) => void;
  onUploadClick: () => void;
}

export default function KnowledgeBases({ onQuery, onUploadClick }: KnowledgeBasesProps) {
  const [kbs, setKbs] = useState<KnowledgeBase[]>(INITIAL_KBS);
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "private" | "public">("all");

  const filtered = kbs.filter((kb) => {
    const matchesSearch =
      kb.name.toLowerCase().includes(search.toLowerCase()) ||
      kb.description.toLowerCase().includes(search.toLowerCase()) ||
      kb.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    const matchesFilter =
      filter === "all" ||
      (filter === "public" && kb.isPublic) ||
      (filter === "private" && !kb.isPublic);
    return matchesSearch && matchesFilter;
  });

  const totalDocs = kbs.reduce((s, kb) => s + kb.docCount, 0);
  const totalQueries = kbs.reduce((s, kb) => s + kb.queryCount, 0);

  const handleCreate = (data: { name: string; description: string; isPublic: boolean; tags: string[] }) => {
    const newKb: KnowledgeBase = {
      id: String(Date.now()),
      name: data.name,
      description: data.description,
      docCount: 0,
      sizeLabel: "0 MB",
      updatedAt: "Just now",
      createdAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      isPublic: data.isPublic,
      tags: data.tags,
      status: "ready",
      queryCount: 0,
    };
    setKbs([newKb, ...kbs]);
    setIsCreateOpen(false);
  };

  const handleDelete = (id: string) => {
    setKbs(kbs.filter((kb) => kb.id !== id));
    setOpenMenu(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Page header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl font-semibold text-foreground">Knowledge Bases</h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Manage your document collections and private knowledge stores.
              </p>
            </div>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-accent text-accent-foreground
                         rounded-xl font-medium hover:bg-accent/90 transition-all shadow-sm text-sm"
            >
              <Plus className="w-4 h-4" />
              New Knowledge Base
            </button>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-7">
            {[
              { icon: Database, label: "Knowledge Bases", value: kbs.length },
              { icon: FileText, label: "Total Documents", value: totalDocs.toLocaleString() },
              { icon: TrendingUp, label: "Queries Run", value: totalQueries.toLocaleString() },
              { icon: CheckCircle, label: "Ready", value: kbs.filter((k) => k.status === "ready").length },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="bg-background border border-border rounded-xl px-5 py-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Icon className="w-4 h-4" />
                  <span className="text-xs">{label}</span>
                </div>
                <div className="text-2xl font-semibold text-foreground">{value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Toolbar */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-56">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search knowledge bases…"
              className="w-full pl-10 pr-4 py-2.5 border border-border rounded-xl bg-card text-sm
                         focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
            />
          </div>

          {/* Filter pills */}
          <div className="flex items-center gap-1.5 bg-secondary rounded-xl p-1">
            {(["all", "private", "public"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${
                  filter === f
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="text-center py-20 border border-dashed border-border rounded-2xl">
            <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
              <FolderOpen className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-foreground font-medium mb-1">
              {search ? "No results found" : "No knowledge bases yet"}
            </p>
            <p className="text-sm text-muted-foreground mb-5">
              {search
                ? "Try a different search term or filter."
                : "Create your first knowledge base to start querying your documents."}
            </p>
            {!search && (
              <button
                onClick={() => setIsCreateOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-accent-foreground
                           rounded-xl text-sm font-medium hover:bg-accent/90 transition-all"
              >
                <Plus className="w-4 h-4" />
                New Knowledge Base
              </button>
            )}
          </div>
        )}

        {/* KB cards grid */}
        {filtered.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map((kb) => {
              const status = statusConfig[kb.status];
              return (
                <article
                  key={kb.id}
                  className="bg-card border border-border rounded-xl p-6 hover:shadow-md
                             hover:border-accent/30 transition-all flex flex-col group"
                >
                  {/* Card header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center
                                    group-hover:bg-accent/20 transition-colors flex-shrink-0">
                      <FolderOpen className="w-5 h-5 text-accent" />
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Status badge */}
                      <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${status.bg} ${status.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                        {status.label}
                      </span>
                      {/* Visibility */}
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        {kb.isPublic
                          ? <Globe className="w-3.5 h-3.5" />
                          : <Lock className="w-3.5 h-3.5" />}
                      </span>
                      {/* Menu */}
                      <div className="relative">
                        <button
                          onClick={() => setOpenMenu(openMenu === kb.id ? null : kb.id)}
                          className="p-1 rounded-lg hover:bg-secondary transition-colors text-muted-foreground"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                        {openMenu === kb.id && (
                          <div className="absolute right-0 top-full mt-1 w-44 bg-card border border-border
                                          rounded-xl shadow-lg overflow-hidden z-20">
                            <button
                              onClick={() => { onQuery(`Search in ${kb.name}`); setOpenMenu(null); }}
                              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors"
                            >
                              <Search className="w-4 h-4 text-muted-foreground" /> Query
                            </button>
                            <button
                              onClick={() => { onUploadClick(); setOpenMenu(null); }}
                              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors"
                            >
                              <Upload className="w-4 h-4 text-muted-foreground" /> Upload docs
                            </button>
                            <button
                              onClick={() => setOpenMenu(null)}
                              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors"
                            >
                              <Pencil className="w-4 h-4 text-muted-foreground" /> Rename
                            </button>
                            <div className="border-t border-border" />
                            <button
                              onClick={() => handleDelete(kb.id)}
                              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-destructive hover:bg-destructive/8 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Name + description */}
                  <h3 className="text-base font-medium text-foreground mb-1.5 leading-snug">
                    {kb.name}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed flex-1 line-clamp-2 mb-4">
                    {kb.description}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 mb-5">
                    {kb.tags.map((tag) => (
                      <span key={tag} className="text-xs px-2.5 py-1 bg-secondary text-secondary-foreground rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Meta row */}
                  <div className="border-t border-border pt-4 grid grid-cols-3 gap-2 text-center mb-4">
                    {[
                      { label: "Docs", value: kb.docCount.toLocaleString() },
                      { label: "Size", value: kb.sizeLabel },
                      { label: "Queries", value: kb.queryCount.toLocaleString() },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <div className="text-sm font-medium text-foreground">{value}</div>
                        <div className="text-xs text-muted-foreground">{label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {kb.updatedAt}
                    </span>
                    <button
                      onClick={() => onQuery(`Search in ${kb.name}`)}
                      className="inline-flex items-center gap-1.5 text-xs text-accent font-medium
                                 hover:underline transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Query
                    </button>
                  </div>
                </article>
              );
            })}

            {/* "New KB" card */}
            <button
              onClick={() => setIsCreateOpen(true)}
              className="border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center
                         justify-center gap-3 hover:border-accent hover:bg-accent/3 transition-all
                         text-center group min-h-[220px]"
            >
              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center
                              group-hover:bg-accent/10 transition-colors">
                <Plus className="w-5 h-5 text-muted-foreground group-hover:text-accent transition-colors" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">New Knowledge Base</p>
                <p className="text-xs text-muted-foreground mt-0.5">Upload or connect documents</p>
              </div>
            </button>
          </div>
        )}
      </div>

      <CreateKBModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreate={handleCreate}
      />

      {/* Close menus on outside click */}
      {openMenu && (
        <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />
      )}
    </div>
  );
}
