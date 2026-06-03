"use client"
import { useEffect, useState } from "react";
import Footer from "./components/Footer";
import Hero from "./components/Hero";
import Navbar from "./components/Navbar";
import RecentReports from "./components/RecentReports";
import UploadModal from "./components/UploadModal";
import SearchResults from "./components/SearchResults";

export default function Home() {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string | null>(null);

  useEffect(() => {
    const handler = () => setIsUploadModalOpen(true);
    window.addEventListener("relieflens:open-upload-modal", handler as EventListener);
    return () => {
      window.removeEventListener(
        "relieflens:open-upload-modal",
        handler as EventListener
      );
    };
  }, []);


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
      </>
    );
  }
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar onUploadClick={() => setIsUploadModalOpen(true)} />
      <Hero onSearch={handleSearch} />
      <RecentReports />
      <Footer />
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
      />
    </div>
  );
}
