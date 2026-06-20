import { Zap } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-card py-10 px-6">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-accent flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-accent-foreground" />
          </div>
          <span className="font-medium text-foreground">Humalens</span>
          <span className="text-border">·</span>
          <span>© 2026</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
          <a href="#" className="hover:text-foreground transition-colors">Terms</a>
          <a href="#" className="hover:text-foreground transition-colors">Docs</a>
          <a href="#" className="hover:text-foreground transition-colors">Status</a>
        </div>
      </div>
    </footer>
  );
}

