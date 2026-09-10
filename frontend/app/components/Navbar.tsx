"use client";

import { useState, useRef, useEffect } from "react";
import {
  Zap,
  ChevronDown,
  LogOut,
  FolderOpen,
  Upload,
} from "lucide-react";

import { API_BASE_URL } from "@/app/lib/api/baseUrl";

interface User {
  name: string;
  email: string;
}

interface NavbarProps {
  onUploadClick: () => void;
  onLoginClick: () => void;
  onRegisterClick: () => void;
  user: User | null;
  onLogout: () => void;
  onKBClick: () => void;
  onHomeClick: () => void;
  activeView: string;
}

export default function Navbar({
  onUploadClick,
  onLoginClick,
  onRegisterClick,
  user,
  onLogout,
  onKBClick,
  onHomeClick,
  activeView,
}: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const navLinks = [
    { label: "Home", view: "home", onClick: onHomeClick },
    {
      label: "Knowledge Bases",
      view: "knowledge-bases",
      onClick: onKBClick,
    },
  ];

  const initials = user
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "";

  return (
    <nav className="border-b border-border bg-card sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-5">
          <div
            className="flex items-center gap-2.5 cursor-pointer"
            onClick={onHomeClick}
          >
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <Zap className="w-4 h-4 text-accent-foreground" />
            </div>
            <span className="font-semibold text-xl text-foreground tracking-tight">
              Humalens
            </span>
          </div>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <button
                key={link.view}
                onClick={link.onClick}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  activeView === link.view
                    ? "bg-secondary text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                }`}
              >
                {link.label}
              </button>
            ))}
            {/* The API's own generated reference, rather than a dead "#". */}
            <a
              href={`${API_BASE_URL}/docs`}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
            >
              API Docs
            </a>
          </div>
        </div>

        {/* Auth area */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <button
                onClick={onUploadClick}
                className="hidden sm:flex items-center gap-2 px-4 py-2 border border-border rounded-lg
                           text-sm text-foreground hover:bg-secondary transition-all"
              >
                <Upload className="w-4 h-4" />
                Upload
              </button>

              {/* User menu */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-xl
                             hover:bg-secondary transition-all border border-transparent hover:border-border"
                >
                  <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-accent-foreground text-sm font-semibold">
                    {initials}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium text-foreground leading-none">
                      {user.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-none">
                      {user.email}
                    </p>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-muted-foreground transition-transform ${
                      menuOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-50">
                    <div className="px-4 py-3 border-b border-border">
                      <p className="text-sm font-medium text-foreground">
                        {user.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {user.email}
                      </p>
                    </div>
                    <div className="py-1">
                      <button
                        onClick={() => {
                          onKBClick();
                          setMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors"
                      >
                        <FolderOpen className="w-4 h-4 text-muted-foreground" />
                        My Knowledge Bases
                      </button>
                      <button
                        onClick={() => {
                          onUploadClick();
                          setMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors"
                      >
                        <Upload className="w-4 h-4 text-muted-foreground" />
                        Upload Documents
                      </button>
                    </div>
                    <div className="border-t border-border py-1">
                      <button
                        onClick={() => {
                          onLogout();
                          setMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/8 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <button
                onClick={onLoginClick}
                className="px-4 py-2 text-sm text-foreground hover:text-accent transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={onRegisterClick}
                className="px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm
                           hover:bg-accent/90 transition-all shadow-sm"
              >
                Get Started
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

