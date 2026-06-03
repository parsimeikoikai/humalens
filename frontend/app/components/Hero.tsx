import { useState } from "react";
import { Search, Database, Upload, Sparkles, ChevronRight } from "lucide-react";

interface HeroProps {
  onSearch: (query: string) => void;
}

export default function Hero({ onSearch }: HeroProps) {
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query);
    }
  };

  return (
    <section className="bg-background py-20 px-6">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-5xl mb-4 text-foreground tracking-tight">
          Search humanitarian reports with AI
        </h1>
        <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
          Ask questions across thousands of crisis briefs, situation reports,
          and field updates from ReliefWeb
        </p>

        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-accent transition-colors" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask anything — e.g. how many people displaced in DRC?"
              className="w-full pl-14 pr-6 py-5 rounded-xl border border-border bg-input-background
                       focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent
                       text-lg placeholder:text-muted-foreground shadow-sm"
            />
          </div>

          <div className="flex items-center justify-center gap-3 mt-8 flex-wrap">
          
            <div className="group relative">
              <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-accent to-accent/90
                            text-accent-foreground rounded-full text-sm font-medium shadow-sm
                            hover:shadow-md transition-all cursor-pointer">
                <Database className="w-4 h-4" />
                <span>Powered by ReliefWeb API</span>
                <Sparkles className="w-3.5 h-3.5 opacity-80" />
              </div>
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-2 bg-foreground text-background
                            rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity
                            pointer-events-none z-10">
                Search across 500,000+ humanitarian reports
              </div>
            </div>

    
            <span className="text-muted-foreground text-sm">or</span>

        
            <div className="group relative">
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent("relieflens:open-upload-modal")
                  );
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-card border-2 border-accent/30
                         text-foreground rounded-full text-sm font-medium
                         hover:bg-accent/5 hover:border-accent transition-all"
              >
                <Upload className="w-4 h-4" />
                <span>Upload your own PDF</span>
                <ChevronRight className="w-3.5 h-3.5 opacity-60 group-hover:translate-x-0.5 transition-transform" />
              </button>
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-2 bg-foreground text-background
                            rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity
                            pointer-events-none z-10">
                Add your organization's reports to search
              </div>
            </div>
          </div>

       
          <div className="mt-8 flex items-center justify-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">Try:</span>
            {["WASH needs in Yemen", "Cholera outbreak Sudan", "Funding gaps Syria"].map((example, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setQuery(example)}
                className="text-sm px-3 py-1 rounded-md bg-secondary hover:bg-accent/10
                         text-secondary-foreground hover:text-accent transition-all"
              >
                {example}
              </button>
            ))}
          </div>
        </form>
      </div>
    </section>
  );
}
