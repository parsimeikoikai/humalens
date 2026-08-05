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
import { clearAuthToken, getAuthToken } from "./lib/auth/token";
import { useLazyMeQuery } from "./services/api/authApi";
import { useListKnowledgeBasesQuery } from "./services/api/knowledgeBaseApi";

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
  const [uploadTargetKbId, setUploadTargetKbId] = useState<number | null>(null);
  const [searchKbId, setSearchKbId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState<string | null>(null);
  const [view, setView] = useState<View>("home");
  const [fetchMe] = useLazyMeQuery();

  const { data: knowledgeBases = [] } = useListKnowledgeBasesQuery(undefined, {
    skip: !user,
  });
  const scopedKb = knowledgeBases.find((kb) => kb.id === searchKbId) ?? null;

  // The cached user is only a hint — the token is what actually grants
  // access. Verify it on mount so an expired or revoked session drops back
  // to signed-out instead of showing a shell that 401s on every request.
  useEffect(() => {
    if (!getAuthToken()) {
      setUser(null);
      window.localStorage.removeItem(AUTH_USER_STORAGE_KEY);
      return;
    }

    fetchMe()
      .unwrap()
      .then((me) => {
        setUser({
          name: me.full_name || me.email.split("@")[0],
          email: me.email,
        });
      })
      .catch(() => {
        clearAuthToken();
        window.localStorage.removeItem(AUTH_USER_STORAGE_KEY);
        setUser(null);
        setView("home");
      });
  }, [fetchMe]);

  const handleUploadClick = useCallback(
    (knowledgeBaseId?: number) => {
      if (!user) {
        setAuthModal("login");
        return;
      }
      setUploadTargetKbId(knowledgeBaseId ?? null);
      setIsUploadModalOpen(true);
    },
    [user]
  );

  const closeUploadModal = useCallback(() => {
    setIsUploadModalOpen(false);
    setUploadTargetKbId(null);
  }, []);

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

  // Querying a knowledge base scopes the *next* search to it — the user still
  // types the question on the home search box, rather than the card firing a
  // placeholder query on their behalf.
  const handleQueryKB = (knowledgeBaseId: number) => {
    setSearchKbId(knowledgeBaseId);
    setView("home");
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
    setView("home");
    clearAuthToken();
    window.localStorage.removeItem(AUTH_USER_STORAGE_KEY);
  };

  const handleBackToHome = () => {
    setSearchQuery(null);
  };

  if (searchQuery) {
    return (
      <>
        <SearchResults
          query={searchQuery}
          onBack={handleBackToHome}
          knowledgeBaseId={searchKbId}
        />
        <UploadModal
          isOpen={isUploadModalOpen}
          onClose={closeUploadModal}
          knowledgeBaseId={uploadTargetKbId}
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
          onUploadClick={() => handleUploadClick()}
          onLoginClick={() => setAuthModal("login")}
          onRegisterClick={() => setAuthModal("register")}
          user={user}
          onLogout={handleLogout}
          onKBClick={handleKBNav}
          activeView={view}
        />
      {view === "knowledge-bases" ? (
        <KnowledgeBases
          onQuery={handleQueryKB}
          onUploadClick={handleUploadClick}
        />
      ) : (
        <>
          {scopedKb && (
            <div className="max-w-7xl mx-auto w-full px-6 pt-6">
              <div className="flex items-center justify-between gap-3 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3">
                <p className="text-sm text-foreground">
                  Searching only{" "}
                  <span className="font-medium">{scopedKb.name}</span>
                </p>
                <button
                  onClick={() => setSearchKbId(null)}
                  className="text-xs text-accent hover:underline font-medium"
                >
                  Search all knowledge bases
                </button>
              </div>
            </div>
          )}
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
        onClose={closeUploadModal}
        knowledgeBaseId={uploadTargetKbId}
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
