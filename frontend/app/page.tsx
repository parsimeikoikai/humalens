"use client";
import { useEffect, useState } from "react";
import Footer from "./components/Footer";
import Hero from "./components/Hero";
import Navbar from "./components/Navbar";
import RecentReports from "./components/RecentReports";
import UploadModal from "./components/UploadModal";
import SearchResults from "./components/SearchResults";
import AuthModal from "./components/AuthModal";

interface User {
  name: string;
  email: string;
}

type AuthModalMode = "login" | "register" | null;

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [authModal, setAuthModal] = useState<AuthModalMode>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string | null>(null);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleUploadClick = () => {
    if (!user) {
      setAuthModal("login");
      return;
    }
    setIsUploadModalOpen(true);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
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
          onAuth={(u) => setUser(u)}
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
        onLogout={() => setUser(null)}
      />
      <Hero
        onSearch={handleSearch}
        onUploadClick={handleUploadClick}
        onLoginClick={() => setAuthModal("login")}
        isAuthenticated={!!user}
      />
      <RecentReports />
      <Footer />

      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
      />
      <AuthModal
        isOpen={authModal !== null}
        onClose={() => setAuthModal(null)}
        onAuth={(u) => setUser(u)}
        defaultTab={authModal ?? "login"}
      />
    </div>
  );
}

