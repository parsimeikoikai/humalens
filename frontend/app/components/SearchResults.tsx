import { useState } from "react";
import { ArrowLeft, ExternalLink, MapPin, Calendar, FileText, Languages } from "lucide-react";
import SearchFilters from "./SearchFilters";

interface SearchResultsProps {
  query: string;
  onBack: () => void;
}

interface Filters {
  countries: string[];
  crisisTypes: string[];
  dateRange: string;
  languages: string[];
}

export default function SearchResults({ query, onBack }: SearchResultsProps) {
  const [filters, setFilters] = useState<Filters>({
    countries: [],
    crisisTypes: [],
    dateRange: "all",
    languages: []
  });

  const sources = [
    {
      id: 1,
      title: "Democratic Republic of the Congo: Humanitarian Snapshot",
      organization: "OCHA",
      date: "May 28, 2026",
      country: "DRC",
      url: "https://reliefweb.int/report/...",
      excerpt: "Over 6.9 million people internally displaced across North Kivu, South Kivu, and Ituri provinces. Emergency food assistance reaching 2.3 million people in Q1 2026.",
      relevance: 95,
      languages: ["en", "fr"],
      crisisType: "Displacement"
    },
    {
      id: 2,
      title: "Protection Monitoring Report: Eastern DRC",
      organization: "UNHCR",
      date: "May 15, 2026",
      country: "DRC",
      url: "https://reliefweb.int/report/...",
      excerpt: "Field assessment indicates 1.2M newly displaced individuals since March 2026. Primary concerns include shelter, protection, and access to basic services.",
      relevance: 92,
      languages: ["en", "fr", "ar"],
      crisisType: "Protection Crisis"
    },
    {
      id: 3,
      title: "IDP Situation Analysis: Great Lakes Region",
      organization: "IOM",
      date: "April 30, 2026",
      country: "Regional",
      url: "https://reliefweb.int/report/...",
      excerpt: "Regional displacement tracking shows significant population movements in North Kivu and South Kivu, with cross-border implications for Uganda and Rwanda.",
      relevance: 88,
      languages: ["en", "fr"],
      crisisType: "Displacement"
    },
    {
      id: 4,
      title: "Flash Update: Renewed Violence in North Kivu",
      organization: "OCHA",
      date: "May 20, 2026",
      country: "DRC",
      url: "https://reliefweb.int/report/...",
      excerpt: "Armed conflict in Rutshuru and Masisi territories has forced an estimated 180,000 people to flee their homes in the past two weeks.",
      relevance: 86,
      languages: ["en", "fr"],
      crisisType: "Conflict"
    }
  ];

  const languageLabels: Record<string, string> = {
    en: "EN",
    fr: "FR",
    ar: "AR",
    es: "ES"
  };

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
        <div className="bg-accent bg-opacity-5 border border-accent border-opacity-20 rounded-xl p-8 mb-8">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
              <span className="text-accent-foreground text-sm font-semibold">AI</span>
            </div>
            <div>
              <h2 className="text-lg mb-1 text-foreground">Answer</h2>
              <p className="text-sm text-muted-foreground">
                Generated from {sources.length} humanitarian reports
              </p>
            </div>
          </div>

          <div className="mb-4 pb-4 border-b border-accent border-opacity-20">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-accent/10 border border-accent/30 rounded-lg text-sm">
              <FileText className="w-4 h-4 text-accent" />
              <span className="text-foreground">
                <strong>Primary source:</strong> OCHA Humanitarian Snapshot, DRC, May 28, 2026
              </span>
            </div>
          </div>

          <div className="prose prose-slate max-w-none">
            <p className="text-foreground leading-relaxed mb-4">
              According to the most recent humanitarian reports, approximately <strong>6.9 million people</strong> are
              internally displaced in the Democratic Republic of the Congo as of May 2026. The displacement is
              concentrated primarily in the eastern provinces:
            </p>
            <ul className="space-y-2 text-foreground ml-6 mb-4">
              <li><strong>North Kivu</strong> — experiencing renewed violence in Rutshuru and Masisi territories,
              with 180,000 newly displaced in the past two weeks alone <sup className="text-accent">[4]</sup></li>
              <li><strong>South Kivu</strong> — ongoing protection concerns and limited access to basic services <sup className="text-accent">[2]</sup></li>
              <li><strong>Ituri</strong> — significant displacement with cross-border implications <sup className="text-accent">[1]</sup></li>
            </ul>
            <p className="text-foreground leading-relaxed">
              OCHA reports indicate that emergency food assistance is currently reaching 2.3 million people in Q1 2026 <sup className="text-accent">[1]</sup>.
              UNHCR field assessments show 1.2 million newly displaced individuals since March 2026 <sup className="text-accent">[2]</sup>, with primary
              needs including shelter, protection services, and healthcare access.
            </p>
          </div>

          <div className="mt-6 pt-6 border-t border-accent border-opacity-20">
            <p className="text-sm text-muted-foreground mb-3">Sources used to generate this answer:</p>
            <div className="flex flex-wrap gap-2">
              {sources.map((source) => (
                <span
                  key={source.id}
                  className="inline-flex items-center gap-1 text-sm px-3 py-1 bg-card border border-border rounded-full text-foreground"
                >
                  [{source.id}] {source.organization}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Source Documents */}
        <div className="mb-6">
          <h2 className="text-2xl mb-2 text-foreground">Source Reports</h2>
          <p className="text-muted-foreground">
            {sources.length} reports found • Sorted by relevance
          </p>
        </div>

        <div className="space-y-4">
          {sources.map((source) => (
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
                    {source.country}
                  </span>
                  <span className="inline-block px-2 py-1 bg-accent/10 text-accent rounded text-xs">
                    {source.crisisType}
                  </span>
                  <span className="text-sm text-accent">{source.organization}</span>
                  <div className="flex items-center gap-1">
                    <Languages className="w-3.5 h-3.5 text-muted-foreground" />
                    {source.languages.map((lang, i) => (
                      <span key={lang} className="text-xs text-muted-foreground">
                        {languageLabels[lang]}{i < source.languages.length - 1 ? "," : ""}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {source.date}
                  </span>
                  <span className="text-accent">{source.relevance}% match</span>
                </div>
              </div>

              <h3 className="text-lg mb-3 text-foreground leading-snug">
                {source.title}
              </h3>

              <p className="text-muted-foreground mb-4 leading-relaxed">
                {source.excerpt}
              </p>

              <div className="flex items-center gap-4">
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:text-opacity-80 transition-colors inline-flex items-center gap-1"
                >
                  <FileText className="w-4 h-4" />
                  Read full report
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </article>
          ))}
        </div>

        {/* Related Searches */}
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
          </div>
        </div>
      </div>
    </div>
  );
}
