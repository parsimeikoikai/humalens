"use client";
import { useCallback, useEffect, useState } from "react";
import { useDispatch } from "react-redux";

import Footer from "./components/Footer";
import Hero from "./components/Hero";
import Navbar from "./components/Navbar";
import RecentReports from "./components/RecentReports";
import KnowledgeBases from "./components/KnowledgeBases";
import UploadModal from "./components/UploadModal";
import SearchResults from "./components/SearchResults";
import AuthModal from "./components/AuthModal";
import {
  endSession,
  getAuthToken,
  getStoredUser,
  setStoredUser,
  SESSION_ENDED_EVENT,
  type StoredUser as User,
} from "./lib/auth/token";
import { authApi, useLazyMeQuery } from "./services/api/authApi";
import {
  knowledgeBaseApi,
  useListKnowledgeBasesQuery,
} from "./services/api/knowledgeBaseApi";

type AuthModalMode = "login" | "register" | null;
type View = "home" | "search" | "knowledge-bases";

/** A search the user asked for before signing in, replayed once they do. */
interface PendingSearch {
  query: string;
  topK: number;
}

export default function Home() {
  const dispatch = useDispatch();

  const [user, setUser] = useState<User | null>(null);
  const [authModal, setAuthModal] = useState<AuthModalMode>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadTargetKbId, setUploadTargetKbId] = useState<number | null>(null);
  const [searchKbId, setSearchKbId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState<string | null>(null);
  const [searchTopK, setSearchTopK] = useState(3);
  const [pendingSearch, setPendingSearch] = useState<PendingSearch | null>(null);
  const [sessionNotice, setSessionNotice] = useState("");
  const [view, setView] = useState<View>("home");
  const [fetchMe] = useLazyMeQuery();

  const { data: knowledgeBases = [] } = useListKnowledgeBasesQuery(undefined, {
    skip: !user,
  });
  const scopedKb = knowledgeBases.find((kb) => kb.id === searchKbId) ?? null;

  // Restoring the cached user has to happen after mount, not in the initial
  // state: on the server there is no localStorage, so seeding from it
  // directly makes the first client render disagree with the server's HTML
  // and React throws a hydration mismatch.
  useEffect(() => {
    if (!getAuthToken()) {
      endSession("signed-out");
      return;
    }

    setUser(getStoredUser());

    // The cached user is only a hint — the token is what actually grants
    // access. Verify it so an expired or revoked session drops back to
    // signed-out instead of showing a shell that 401s on every request.
    fetchMe()
      .unwrap()
      .then((me) => {
        const verified = {
          name: me.full_name || me.email.split("@")[0],
          email: me.email,
        };

        setUser(verified);
        setStoredUser(verified);
      })
      .catch(() => {
        endSession("expired");
      });
  }, [fetchMe]);

  // Any 401, from any request, ends the session here — so a token that
  // expires mid-visit takes the whole UI back to a signed-out state instead
  // of leaving a dead shell behind.
  useEffect(() => {
    const handleSessionEnded = (event: Event) => {
      const reason = (event as CustomEvent<"signed-out" | "expired">).detail;

      setUser(null);
      setView("home");
      setSearchQuery(null);
      setSearchKbId(null);
      setPendingSearch(null);

      // Drop every cached response, or the next person to sign in on this
      // browser briefly sees the previous user's knowledge bases.
      dispatch(knowledgeBaseApi.util.resetApiState());
      dispatch(authApi.util.resetApiState());

      if (reason === "expired") {
        setSessionNotice("Your session expired. Please sign in again.");
        setAuthModal("login");
      }
    };

    window.addEventListener(SESSION_ENDED_EVENT, handleSessionEnded);

    return () =>
      window.removeEventListener(SESSION_ENDED_EVENT, handleSessionEnded);
  }, [dispatch]);

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

  // Search reads the signed-in user's own documents, so there is nothing to
  // answer with while signed out. Ask for a sign-in up front and hold the
  // question, rather than letting the request 401 and stranding the user on
  // an error page.
  const handleSearch = (query: string, topK: number) => {
    if (!user) {
      setPendingSearch({ query, topK });
      setSessionNotice("Sign in to search across your documents.");
      setAuthModal("login");
      return;
    }

    setSearchTopK(topK);
    setSearchQuery(query);
  };

  const handleKBNav = () => {
    if (!user) {
      setAuthModal("login");
      return;
    }
    setView("knowledge-bases");
  };

  const handleHomeNav = () => {
    setView("home");
    setSearchQuery(null);
  };

  // Querying a knowledge base scopes the *next* search to it — the user still
  // types the question on the home search box, rather than the card firing a
  // placeholder query on their behalf.
  const handleQueryKB = (knowledgeBaseId: number) => {
    setSearchKbId(knowledgeBaseId);
    setSearchQuery(null);
    setView("home");
  };

  const handleAuth = (authenticatedUser: User) => {
    setUser(authenticatedUser);
    setStoredUser(authenticatedUser);
    setSessionNotice("");

    // Run the search they were stopped from running.
    if (pendingSearch) {
      setSearchTopK(pendingSearch.topK);
      setSearchQuery(pendingSearch.query);
      setPendingSearch(null);
    }
  };

  const handleLogout = () => {
    endSession("signed-out");
  };

  const closeAuthModal = () => {
    setAuthModal(null);
    setSessionNotice("");
    setPendingSearch(null);
  };

  const authModalElement = (
    <AuthModal
      // Remount when the requested tab changes: the modal reads defaultTab
      // as initial state only, so without this the "Get Started" button
      // would open the sign-in tab whenever sign-in had been opened before.
      key={authModal ?? "closed"}
      isOpen={authModal !== null}
      onClose={closeAuthModal}
      onAuth={handleAuth}
      defaultTab={authModal ?? "login"}
      notice={sessionNotice}
    />
  );

  const uploadModalElement = (
    <UploadModal
      isOpen={isUploadModalOpen}
      onClose={closeUploadModal}
      knowledgeBaseId={uploadTargetKbId}
      onManageKnowledgeBases={() => {
        closeUploadModal();
        setSearchQuery(null);
        setView("knowledge-bases");
      }}
    />
  );

  if (searchQuery) {
    return (
      <>
        {/* The results page keeps the nav: without it a signed-out or
            expired session had no way back to a sign-in from here. */}
        <SearchResults
          query={searchQuery}
          topK={searchTopK}
          onBack={handleHomeNav}
          knowledgeBaseId={searchKbId}
          user={user}
          onLoginClick={() => setAuthModal("login")}
          onRegisterClick={() => setAuthModal("register")}
          onLogout={handleLogout}
          onUploadClick={() => handleUploadClick()}
          onKBClick={() => {
            setSearchQuery(null);
            handleKBNav();
          }}
          onHomeClick={handleHomeNav}
        />
        {uploadModalElement}
        {authModalElement}
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
        onHomeClick={handleHomeNav}
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
          <RecentReports
            isAuthenticated={!!user}
            onQuery={handleQueryKB}
            onBrowseAll={handleKBNav}
          />
        </>
      )}
      <Footer />

      {uploadModalElement}
      {authModalElement}
    </div>
  );
}
