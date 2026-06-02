import { Search } from "lucide-react";

interface NavbarProps {
  onUploadClick: () => void;
}

export default function Navbar({ onUploadClick }: NavbarProps) {
  return (
    <nav className="border-b border-border bg-card">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Search className="w-6 h-6 text-accent" />
          <span className="font-semibold text-xl text-foreground">ReliefLens</span>
        </div>

        <div className="flex items-center gap-8">
          <a href="#" className="text-foreground hover:text-accent transition-colors">
            Home
          </a>
          <a href="#" className="text-foreground hover:text-accent transition-colors">
            Reports
          </a>
          <a href="#" className="text-foreground hover:text-accent transition-colors">
            About
          </a>
          <button
            onClick={onUploadClick}
            className="px-5 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-opacity-90 transition-all"
          >
            Upload Report
          </button>
        </div>
      </div>
    </nav>
  );
}
