"use client";

import { useState } from "react";
import {
  Plus, FolderOpen, FileText, Globe, Lock, MoreHorizontal,
  Search, Upload, Trash2, Pencil, ExternalLink, Database,
  Clock, CheckCircle, AlertCircle, Loader2,
} from "lucide-react";
import CreateKBModal from "./CreateKBModal";
import DeleteKBDialog from "./DeleteKBDialog";
import {
  useDeleteKnowledgeBaseMutation,
  useListKnowledgeBasesQuery,
  type KnowledgeBase,
} from "@/app/services/api/knowledgeBaseApi";

const statusConfig: Record<
  KnowledgeBase["status"],
  { label: string; color: string; bg: string; dot: string }
> = {
  ready: { label: "Ready", color: "text-green-600", bg: "bg-green-50", dot: "bg-green-500" },
  indexing: { label: "Indexing…", color: "text-amber-600", bg: "bg-amber-50", dot: "bg-amber-400 animate-pulse" },
  empty: { label: "Empty", color: "text-muted-foreground", bg: "bg-secondary", dot: "bg-muted-foreground" },
  failed: { label: "Failed", color: "text-destructive", bg: "bg-destructive/8", dot: "bg-destructive" },
};

const formatBytes = (bytes: number): string => {
  if (!bytes) return "0 MB";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

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

const errorMessage = (error: unknown, fallback: string): string =>
  (error as { data?: { detail?: string } })?.data?.detail ?? fallback;

interface KnowledgeBasesProps {
  /** Scope the next search to this knowledge base. */
  onQuery: (knowledgeBaseId: number) => void;
  onUploadClick: (knowledgeBaseId?: number) => void;
}

export default function KnowledgeBases({ onQuery, onUploadClick }: KnowledgeBasesProps) {
  const { data: kbs = [], isLoading, isError, error, refetch } =
    useListKnowledgeBasesQuery();
  const [deleteKnowledgeBase, { isLoading: isDeleting }] =
    useDeleteKnowledgeBaseMutation();

  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editing, setEditing] = useState<KnowledgeBase | null>(null);
  const [pendingDelete, setPendingDelete] = useState<KnowledgeBase | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const [filter, setFilter] = useState<"all" | "private" | "public">("all");

  const filtered = kbs.filter((kb) => {
    const term = search.toLowerCase();
    const matchesSearch =
      kb.name.toLowerCase().includes(term) ||
      (kb.description ?? "").toLowerCase().includes(term) ||
      kb.tags.some((t) => t.toLowerCase().includes(term));
    const matchesFilter =
      filter === "all" ||
      (filter === "public" && kb.visibility === "public") ||
      (filter === "private" && kb.visibility === "private");
    return matchesSearch && matchesFilter;
  });

  const totalDocs = kbs.reduce((sum, kb) => sum + kb.document_count, 0);
  const totalChunks = kbs.reduce((sum, kb) => sum + kb.chunk_count, 0);

  const handleDelete = async () => {
    if (!pendingDelete) return;

    setDeleteError("");

    try {
      await deleteKnowledgeBase(pendingDelete.id).unwrap();
      setPendingDelete(null);
    } catch (err) {
      setDeleteError(
        errorMessage(err, "Could not delete this knowledge base. Please try again.")
      );
    }
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
              { icon: Search, label: "Indexed Chunks", value: totalChunks.toLocaleString() },
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

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Loading your knowledge bases…</span>
          </div>
        )}

        {/* Load failure */}
        {isError && !isLoading && (
          <div className="text-center py-20 border border-dashed border-destructive/30 rounded-2xl">
            <div className="w-14 h-14 rounded-2xl bg-destructive/8 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-7 h-7 text-destructive" />
            </div>
            <p className="text-foreground font-medium mb-1">
              Could not load your knowledge bases
            </p>
            <p className="text-sm text-muted-foreground mb-5">
              {errorMessage(error, "Check that the API is reachable and try again.")}
            </p>
            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 px-5 py-2.5 border border-border rounded-xl
                         text-sm font-medium text-foreground hover:bg-secondary transition-all"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !isError && filtered.length === 0 && (
          <div className="text-center py-20 border border-dashed border-border rounded-2xl">
            <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
              <FolderOpen className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-foreground font-medium mb-1">
              {search || kbs.length > 0 ? "No results found" : "No knowledge bases yet"}
            </p>
            <p className="text-sm text-muted-foreground mb-5">
              {search || kbs.length > 0
                ? "Try a different search term or filter."
                : "Create your first knowledge base to start querying your documents."}
            </p>
            {!search && kbs.length === 0 && (
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
        {!isLoading && !isError && filtered.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map((kb) => {
              const status = statusConfig[kb.status] ?? statusConfig.empty;
              const isEmpty = kb.document_count === 0;

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
                      <span
                        className="text-xs text-muted-foreground flex items-center gap-1"
                        title={kb.visibility === "public" ? "Public" : "Private"}
                      >
                        {kb.visibility === "public"
                          ? <Globe className="w-3.5 h-3.5" />
                          : <Lock className="w-3.5 h-3.5" />}
                      </span>
                      {/* Menu */}
                      <div className="relative">
                        <button
                          onClick={() => setOpenMenu(openMenu === kb.id ? null : kb.id)}
                          className="p-1 rounded-lg hover:bg-secondary transition-colors text-muted-foreground"
                          aria-label={`Actions for ${kb.name}`}
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                        {openMenu === kb.id && (
                          <div className="absolute right-0 top-full mt-1 w-44 bg-card border border-border
                                          rounded-xl shadow-lg overflow-hidden z-20">
                            <button
                              onClick={() => { onQuery(kb.id); setOpenMenu(null); }}
                              disabled={isEmpty}
                              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-foreground
                                         hover:bg-secondary transition-colors disabled:opacity-40
                                         disabled:cursor-not-allowed"
                            >
                              <Search className="w-4 h-4 text-muted-foreground" /> Query
                            </button>
                            <button
                              onClick={() => { onUploadClick(kb.id); setOpenMenu(null); }}
                              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors"
                            >
                              <Upload className="w-4 h-4 text-muted-foreground" /> Upload docs
                            </button>
                            <button
                              onClick={() => { setEditing(kb); setOpenMenu(null); }}
                              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors"
                            >
                              <Pencil className="w-4 h-4 text-muted-foreground" /> Edit
                            </button>
                            <div className="border-t border-border" />
                            <button
                              onClick={() => {
                                setPendingDelete(kb);
                                setDeleteError("");
                                setOpenMenu(null);
                              }}
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
                    {kb.description || "No description."}
                  </p>

                  {/* Tags */}
                  {kb.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-5">
                      {kb.tags.map((tag) => (
                        <span key={tag} className="text-xs px-2.5 py-1 bg-secondary text-secondary-foreground rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Meta row */}
                  <div className="border-t border-border pt-4 grid grid-cols-3 gap-2 text-center mb-4">
                    {[
                      { label: "Docs", value: kb.document_count.toLocaleString() },
                      { label: "Size", value: formatBytes(kb.total_size) },
                      { label: "Chunks", value: kb.chunk_count.toLocaleString() },
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
                      {formatDate(kb.updated_at)}
                    </span>
                    {isEmpty ? (
                      <button
                        onClick={() => onUploadClick(kb.id)}
                        className="inline-flex items-center gap-1.5 text-xs text-accent font-medium hover:underline"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        Add documents
                      </button>
                    ) : (
                      <button
                        onClick={() => onQuery(kb.id)}
                        className="inline-flex items-center gap-1.5 text-xs text-accent font-medium hover:underline"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Query
                      </button>
                    )}
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
      />

      <CreateKBModal
        isOpen={editing !== null}
        knowledgeBase={editing}
        onClose={() => setEditing(null)}
      />

      <DeleteKBDialog
        knowledgeBase={pendingDelete}
        isDeleting={isDeleting}
        error={deleteError}
        onCancel={() => {
          setPendingDelete(null);
          setDeleteError("");
        }}
        onConfirm={handleDelete}
      />

      {/* Close menus on outside click */}
      {openMenu !== null && (
        <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />
      )}
    </div>
  );
}
