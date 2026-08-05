"use client";

import { AlertTriangle, Trash2, X } from "lucide-react";

import type { KnowledgeBase } from "@/app/services/api/knowledgeBaseApi";

interface DeleteKBDialogProps {
  knowledgeBase: KnowledgeBase | null;
  isDeleting: boolean;
  error?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function DeleteKBDialog({
  knowledgeBase,
  isDeleting,
  error,
  onCancel,
  onConfirm,
}: DeleteKBDialogProps) {
  if (!knowledgeBase) return null;

  const documentCount = knowledgeBase.document_count;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={onCancel} />

      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="h-1 bg-destructive" />

        <div className="p-7">
          <div className="flex items-start justify-between mb-5">
            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <button
              onClick={onCancel}
              className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground"
              aria-label="Cancel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <h2 className="text-xl font-semibold text-foreground">
            Delete “{knowledgeBase.name}”?
          </h2>

          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            {documentCount > 0 ? (
              <>
                This permanently deletes{" "}
                <span className="font-medium text-foreground">
                  {documentCount} document{documentCount === 1 ? "" : "s"}
                </span>{" "}
                and everything indexed from them. Queries will no longer return
                results from this collection.
              </>
            ) : (
              <>
                This knowledge base is empty. Deleting it removes it from your
                account.
              </>
            )}{" "}
            This cannot be undone.
          </p>

          {error && (
            <p className="text-sm text-destructive bg-destructive/8 border border-destructive/20 rounded-lg px-3 py-2 mt-4">
              {error}
            </p>
          )}

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onCancel}
              disabled={isDeleting}
              className="flex-1 py-2.5 border border-border rounded-xl text-sm text-foreground
                         hover:bg-secondary transition-all disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex-1 py-2.5 bg-destructive text-white rounded-xl text-sm font-medium
                         hover:bg-destructive/90 disabled:opacity-60 disabled:cursor-not-allowed
                         transition-all flex items-center justify-center gap-2"
            >
              {isDeleting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Deleting…
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Delete
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
