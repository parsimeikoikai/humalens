"use client";
import { useCallback, useEffect, useState } from "react";
import Footer from "./components/Footer";
import Hero from "./components/Hero";
import Navbar from "./components/Navbar";
import RecentReports from "./components/RecentReports";
import KnowledgeBases from "./components/KnowledgeBases";
import UploadModal from "./components/UploadModal";
import SearchResults from "./components/SearchResults";
import AuthModal from "./components/AuthModal";

interface User {
  name: string;
  email: string;
}

type AuthModalMode = "login" | "register" | null;
type View = "home" | "search" | "knowledge-bases";

const AUTH_USER_STORAGE_KEY = "humalens:auth-user";

const readStoredUser = (): User | null => {
  if (typeof window === "undefined") return null;

  try {
    const rawUser = window.localStorage.getItem(AUTH_USER_STORAGE_KEY);
    if (!rawUser) return null;

    const parsedUser = JSON.parse(rawUser) as Partial<User>;
    if (!parsedUser.email || !parsedUser.name) return null;

    return {
      name: parsedUser.name,
      email: parsedUser.email,
    };
  } catch {
    window.localStorage.removeItem(AUTH_USER_STORAGE_KEY);
    return null;
  }
};

export default function Home() {
  const [user, setUser] = useState<User | null>(() => readStoredUser());
  const [authModal, setAuthModal] = useState<AuthModalMode>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string | null>(null);
const [view, setView] = useState<View>("home");
  const handleUploadClick = useCallback(() => {
    if (!user) {
      setAuthModal("login");
      return;
    }
    setIsUploadModalOpen(true);
  }, [user]);

  useEffect(() => {
    const handler = () => {
      handleUploadClick();
    };

    window.addEventListener(
      "humalens:open-upload-modal",
      handler as EventListener
    );

    return () => {
      window.removeEventListener(
        "humalens:open-upload-modal",
        handler as EventListener
      );
    };
  }, [handleUploadClick]);

const handleSearch = (
  query: string,
  _topK: number
) => {
  setSearchQuery(query);
};
   const handleKBNav = () => {
    if (!user) {
      setAuthModal("login");
      return;
    }
    setView("knowledge-bases");
  };

  const handleAuth = (authenticatedUser: User) => {
    setUser(authenticatedUser);
    window.localStorage.setItem(
      AUTH_USER_STORAGE_KEY,
      JSON.stringify(authenticatedUser)
    );
  };

  const handleLogout = () => {
    setUser(null);
    window.localStorage.removeItem(AUTH_USER_STORAGE_KEY);
  };

  const handleBackToHome = () => {
    setSearchQuery(null);
  };

  if (searchQuery) {
    return (
      <>
        <SearchResults query={searchQuery} onBack={handleBackToHome} />
        <UploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
        />
        <AuthModal
          isOpen={authModal !== null}
          onClose={() => setAuthModal(null)}
          onAuth={handleAuth}
          defaultTab={authModal ?? "login"}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
         <Navbar
          onUploadClick={handleUploadClick}
          onLoginClick={() => setAuthModal("login")}
          onRegisterClick={() => setAuthModal("register")}
          user={user}
          onLogout={() => { setUser(null); setView("home"); }}
          onKBClick={handleKBNav}
          activeView={view}
        />
      {view === "knowledge-bases" ? (
        <KnowledgeBases
          onQuery={(q) => setSearchQuery(q)}
          onUploadClick={handleUploadClick}
        />
      ) : (
        <>
          <Hero
            onSearch={handleSearch}
            onUploadClick={handleUploadClick}
            onLoginClick={() => setAuthModal("login")}
            isAuthenticated={!!user}
          />
          <RecentReports />
        </>
      )}
      <Footer />

      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
      />
      <AuthModal
        isOpen={authModal !== null}
        onClose={() => setAuthModal(null)}
        onAuth={handleAuth}
        defaultTab={authModal ?? "login"}
      />
    </div>
  );
}
