import { X, AlertTriangle, Calendar, Languages as LanguagesIcon, CheckCircle2 } from "lucide-react";


interface Filters {
  crisisTypes: string[];
  dateRange: string;
  languages: string[];
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

  const languages = [
    { code: "en", name: "English", flag: "🇬🇧" },
    { code: "fr", name: "Français", flag: "🇫🇷" },
    { code: "ar", name: "العربية", flag: "🇸🇦" },
    { code: "es", name: "Español", flag: "🇪🇸" }
  ];

  const dateRanges = [
    { value: "all", label: "All time" },
    { value: "7d", label: "Past week" },
    { value: "30d", label: "Past month" },
    { value: "90d", label: "Past 3 months" },
    { value: "1y", label: "Past year" }
  ];



  const toggleCrisisType = (type: string) => {
    const newTypes = filters.crisisTypes.includes(type)
      ? filters.crisisTypes.filter(t => t !== type)
      : [...filters.crisisTypes, type];
    onFilterChange({ ...filters, crisisTypes: newTypes });
  };

  const toggleLanguage = (lang: string) => {
    const newLanguages = filters.languages.includes(lang)
      ? filters.languages.filter(l => l !== lang)
      : [...filters.languages, lang];
    onFilterChange({ ...filters, languages: newLanguages });
  };

  const clearAllFilters = () => {
    onFilterChange({
      crisisTypes: [],
      dateRange: "all",
      languages: []
    });
  };


  const activeFilterCount = filters.crisisTypes.length +
    filters.languages.length + (filters.dateRange !== "all" ? 1 : 0);


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
        {/* Date Range */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-accent" />
            <label className="text-sm font-medium text-foreground">Publication Date</label>
          </div>
          <div className="space-y-1.5">
            {dateRanges.map((range) => (
              <label
                key={range.value}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-secondary/50 cursor-pointer transition-colors group"
              >
                <input
                  type="radio"
                  name="dateRange"
                  value={range.value}
                  checked={filters.dateRange === range.value}
                  onChange={(e) => onFilterChange({ ...filters, dateRange: e.target.value })}
                  className="w-4 h-4 text-accent accent-accent cursor-pointer"
                />
                <span className="text-sm text-foreground group-hover:text-accent transition-colors">
                  {range.label}
                </span>
              </label>
            ))}
          </div>
        </div>



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

        {/* Languages */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <LanguagesIcon className="w-4 h-4 text-accent" />
            <label className="text-sm font-medium text-foreground">Language</label>
            {filters.languages.length > 0 && (
              <span className="ml-auto text-xs px-2 py-0.5 bg-accent text-accent-foreground rounded-full">
                {filters.languages.length}
              </span>
            )}
          </div>
          <div className="space-y-1.5">
            {languages.map((lang) => {
              const isSelected = filters.languages.includes(lang.code);
              return (
                <button
                  key={lang.code}
                  onClick={() => toggleLanguage(lang.code)}
                  className={`w-full flex items-center justify-between p-2 rounded-lg text-sm transition-all ${
                    isSelected
                      ? "bg-accent/10 text-accent"
                      : "text-foreground hover:bg-secondary/50 hover:text-accent"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{lang.flag}</span>
                    <span>{lang.name}</span>
                  </div>
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
