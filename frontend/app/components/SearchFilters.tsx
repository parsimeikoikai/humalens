"use client";

import { X, Tag, CheckCircle2, Loader2 } from "lucide-react";

import { useListCategoriesQuery } from "@/app/services/api/knowledgeBaseApi";

interface Filters {
  categories: string[];
}

interface SearchFiltersProps {
  filters: Filters;
  onFilterChange: (filters: Filters) => void;
  resultCount?: number;
  knowledgeBaseId?: number | null;
  isAuthenticated?: boolean;
}

export default function SearchFilters({
  filters,
  onFilterChange,
  resultCount = 0,
  knowledgeBaseId = null,
  isAuthenticated = false,
}: SearchFiltersProps) {
  // The category list comes from the documents the user has actually
  // uploaded. It used to be a fixed list of humanitarian "crisis types"
  // that no ordinary document would ever be tagged with, so selecting one
  // reliably filtered every result away.
  const { data: categories = [], isLoading } = useListCategoriesQuery(
    knowledgeBaseId,
    { skip: !isAuthenticated }
  );

  const toggleCategory = (category: string) => {
    const next = filters.categories.includes(category)
      ? filters.categories.filter((c) => c !== category)
      : [...filters.categories, category];

    onFilterChange({ ...filters, categories: next });
  };

  const clearAllFilters = () => onFilterChange({ categories: [] });

  const activeFilterCount = filters.categories.length;

  return (
    <aside className="bg-card border border-border rounded-xl overflow-hidden h-fit sticky top-24">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-foreground font-medium">Refine Results</h3>
          {activeFilterCount > 0 && (
            <button
              onClick={clearAllFilters}
              className="text-xs text-accent hover:text-accent/80 transition-colors flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              Clear all
            </button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {resultCount.toLocaleString()}{" "}
          {resultCount === 1 ? "document" : "documents"} found
        </p>
      </div>

      <div className="px-5 py-4 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Tag className="w-4 h-4 text-accent" />
            <label className="text-sm font-medium text-foreground">
              Category
            </label>
            {activeFilterCount > 0 && (
              <span className="ml-auto text-xs px-2 py-0.5 bg-accent text-accent-foreground rounded-full">
                {activeFilterCount}
              </span>
            )}
          </div>

          {!isAuthenticated ? (
            <p className="text-sm text-muted-foreground">
              Sign in to filter by category.
            </p>
          ) : isLoading ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Loading categories…
            </p>
          ) : categories.length === 0 ? (
            <p className="text-sm text-muted-foreground leading-relaxed">
              No categories yet. Set one when you upload a document and it
              will show up here.
            </p>
          ) : (
            <div className="space-y-1.5">
              {categories.map((category) => {
                const isSelected = filters.categories.includes(category);

                return (
                  <button
                    key={category}
                    onClick={() => toggleCategory(category)}
                    className={`w-full flex items-center justify-between p-2 rounded-lg text-sm transition-all ${
                      isSelected
                        ? "bg-accent/10 text-accent"
                        : "text-foreground hover:bg-secondary/50 hover:text-accent"
                    }`}
                  >
                    <span className="truncate">{category}</span>
                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
