import { X, AlertTriangle, CheckCircle2 } from "lucide-react";


interface Filters {
  crisisTypes: string[];
}


interface SearchFiltersProps {
  filters: Filters;
  onFilterChange: (filters: Filters) => void;
  resultCount?: number;
}

export default function SearchFilters({ filters, onFilterChange, resultCount = 0 }: SearchFiltersProps) {


  const crisisTypes = [
    "Conflict", "Displacement", "Food Insecurity", "Health Emergency",
    "Natural Disaster", "Protection Crisis", "WASH Emergency"
  ];



  const toggleCrisisType = (type: string) => {
    const newTypes = filters.crisisTypes.includes(type)
      ? filters.crisisTypes.filter(t => t !== type)
      : [...filters.crisisTypes, type];
    onFilterChange({ ...filters, crisisTypes: newTypes });
  };

  const clearAllFilters = () => {
    onFilterChange({
      crisisTypes: []
    });
  };


  const activeFilterCount = filters.crisisTypes.length;


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
          {resultCount.toLocaleString()} reports found
        </p>
      </div>

      <div className="px-5 py-4 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
        {/* Crisis Types */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-accent" />
            <label className="text-sm font-medium text-foreground">Crisis Type</label>
            {filters.crisisTypes.length > 0 && (
              <span className="ml-auto text-xs px-2 py-0.5 bg-accent text-accent-foreground rounded-full">
                {filters.crisisTypes.length}
              </span>
            )}
          </div>
          <div className="space-y-1.5">
            {crisisTypes.map((type) => {
              const isSelected = filters.crisisTypes.includes(type);
              return (
                <button
                  key={type}
                  onClick={() => toggleCrisisType(type)}
                  className={`w-full flex items-center justify-between p-2 rounded-lg text-sm transition-all ${
                    isSelected
                      ? "bg-accent/10 text-accent"
                      : "text-foreground hover:bg-secondary/50 hover:text-accent"
                  }`}
                >
                  <span>{type}</span>
                  {isSelected && <CheckCircle2 className="w-4 h-4" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
}
