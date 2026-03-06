"use client";

import "./navbar.css";
import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Search, X, User, LogOut, UserPlus,
  Settings, ChevronDown, Bell, Clock,
  TrendingUp, Bookmark,
} from "lucide-react";

const RECENTS_KEY = "lf_recent_searches";
const MAX_RECENTS = 5;

function getRecents(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENTS_KEY) ?? "[]");
  } catch { return []; }
}

function saveRecent(q: string) {
  const prev = getRecents().filter(r => r !== q);
  localStorage.setItem(RECENTS_KEY, JSON.stringify([q, ...prev].slice(0, MAX_RECENTS)));
}

function removeRecent(q: string) {
  const prev = getRecents().filter(r => r !== q);
  localStorage.setItem(RECENTS_KEY, JSON.stringify(prev));
}

/* ── Inner component that uses useSearchParams ────────────────── */
function NavbarInner() {
  const { data: session }  = useSession();
  const router             = useRouter();
  const searchParams       = useSearchParams();

  const [query,         setQuery]         = useState(searchParams.get("q") ?? "");
  const [dropOpen,      setDropOpen]      = useState(false);
  const [searchOpen,    setSearchOpen]    = useState(false);
  const [recents,       setRecents]       = useState<string[]>([]);
  const [popular,       setPopular]       = useState<string[]>([]);

  const dropRef    = useRef<HTMLDivElement>(null);
  const searchRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync query field with URL on back/forward navigation
  useEffect(() => {
    setQuery(searchParams.get("q") ?? "");
  }, [searchParams]);

  // Fetch popular categories once
  useEffect(() => {
    fetch("/api/feed/popular")
      .then(r => r.json())
      .then(d => setPopular(d.categories ?? []))
      .catch(() => {});
  }, []);

  // Cleanup debounce on unmount — fixes memory leak
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Close account dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setDropOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close search panel on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ── Debounced search ──────────────────────────────────────── */
  const doSearch = useCallback((value: string) => {
    const trimmed = value.trim();
    if (trimmed) {
      saveRecent(trimmed);
      setRecents(getRecents());
      router.push(`/?q=${encodeURIComponent(trimmed)}`);
    } else {
      router.push("/");
    }
    setSearchOpen(false);
  }, [router]);

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);

    // Debounce: fire search 350ms after user stops typing
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      doSearch(val);
    }, 350);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    doSearch(query);
  };

  const handleFocus = () => {
    setRecents(getRecents());
    setSearchOpen(true);
  };

  const clearSearch = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setQuery("");
    router.push("/");
    inputRef.current?.focus();
  };

  const pickRecent = (r: string) => {
    setQuery(r);
    doSearch(r);
    inputRef.current?.blur();
  };

  const deleteRecent = (e: React.MouseEvent, r: string) => {
    e.stopPropagation();
    removeRecent(r);
    setRecents(getRecents());
  };

  const pickPopular = (cat: string) => {
    setQuery(cat);
    doSearch(cat);
    inputRef.current?.blur();
  };

  // Show search dropdown when input focused and no query typed, or showing recents
  const showSearchPanel = searchOpen && (recents.length > 0 || popular.length > 0);

  const avatar   = session?.user?.image;
  const name     = session?.user?.name ?? "";
  const initials = name?.[0]?.toUpperCase() ?? "?";

  return (
    <nav className="navbar">
      <div className="navbar-inner">

        {/* ── Logo ── */}
        <a className="navbar-logo" href="/" aria-label="LookingFor home">
          <img
            src="/favicon.ico"
            alt=""
            className="navbar-logo-icon"
          />
          <span className="navbar-logo-wordmark">
            <span className="navbar-logo-text">Looking</span>
            <span className="navbar-logo-accent">For.</span>
          </span>
        </a>

        {/* ── Search ── */}
        <div className="navbar-search-wrap" ref={searchRef}>
          <form
            className={`navbar-search-form${query || searchOpen ? " focused" : ""}`}
            onSubmit={handleSubmit}
            role="search"
          >
            <Search size={14} className="navbar-search-icon" strokeWidth={2} />
            <input
              ref={inputRef}
              className="navbar-search-input"
              type="search"
              placeholder="Search For Intents…"
              value={query}
              onChange={handleQueryChange}
              onFocus={handleFocus}
              autoComplete="off"
              aria-label="Search intents"
            />
            {query && (
              <button
                type="button"
                className="navbar-search-clear"
                onClick={clearSearch}
                aria-label="Clear search"
              >
                <X size={12} strokeWidth={3} />
              </button>
            )}
          </form>

          {/* ── Search panel (recents + popular) ── */}
          {showSearchPanel && (
            <div className="navbar-search-panel">

              {/* Recent searches */}
              {recents.length > 0 && (
                <div className="navbar-search-section">
                  <p className="navbar-search-section-label">
                    <Clock size={11} /> Recent
                  </p>
                  <div className="navbar-search-chips">
                    {recents.map(r => (
                      <button
                        key={r}
                        className="navbar-search-chip recent"
                        onClick={() => pickRecent(r)}
                      >
                        <Clock size={11} />
                        {r}
                        <span
                          className="navbar-chip-delete"
                          onClick={e => deleteRecent(e, r)}
                          role="button"
                          aria-label={`Remove ${r}`}
                        >
                          <X size={10} strokeWidth={3} />
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Popular categories */}
              {popular.length > 0 && (
                <div className="navbar-search-section">
                  <p className="navbar-search-section-label">
                    <TrendingUp size={11} /> Trending
                  </p>
                  <div className="navbar-search-chips">
                    {popular.map(cat => (
                      <button
                        key={cat}
                        className="navbar-search-chip popular"
                        onClick={() => pickPopular(cat)}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>

        {/* ── Right controls ── */}
        <div className="navbar-right">

          {session && (
            <>
              <button
                className="navbar-icon-btn"
                onClick={() => router.push("/profile?tab=bookmarks")}
                aria-label="Bookmarks"
                title="Saved intents"
              >
                <Bookmark size={17} strokeWidth={1.8} />
              </button>
              <button className="navbar-icon-btn" aria-label="Notifications">
                <Bell size={17} strokeWidth={1.8} />
              </button>
            </>
          )}

          {/* Avatar / account dropdown */}
          <div className="navbar-drop-wrap" ref={dropRef}>
            <button
              className={`navbar-avatar-btn${dropOpen ? " open" : ""}`}
              onClick={() => setDropOpen(v => !v)}
              aria-haspopup="true"
              aria-expanded={dropOpen}
              aria-label="Account menu"
            >
              {session ? (
                avatar ? (
                  <img src={avatar} alt="" className="navbar-avatar-img" />
                ) : (
                  <span className="navbar-avatar-initials">{initials}</span>
                )
              ) : (
                <User size={16} strokeWidth={1.8} />
              )}
              <ChevronDown
                size={12}
                strokeWidth={2.5}
                className={`navbar-chevron${dropOpen ? " up" : ""}`}
              />
            </button>

            {dropOpen && (
              <div className="navbar-dropdown" role="menu">
                {session ? (
                  <>
                    <div className="navbar-drop-header">
                      <div className="navbar-drop-avatar">
                        {avatar
                          ? <img src={avatar} alt="" className="navbar-drop-avatar-img" />
                          : <span>{initials}</span>
                        }
                      </div>
                      <div className="navbar-drop-info">
                        <p className="navbar-drop-name">{name}</p>
                        <p className="navbar-drop-sub">{session.user?.email ?? ""}</p>
                      </div>
                    </div>

                    <div className="navbar-drop-divider" />

                    <button className="navbar-drop-item" onClick={() => { setDropOpen(false); router.push("/profile"); }} role="menuitem">
                      <User size={15} strokeWidth={1.8} /> My Profile
                    </button>
                    <button className="navbar-drop-item" onClick={() => { setDropOpen(false); router.push("/profile?tab=bookmarks"); }} role="menuitem">
                      <Bookmark size={15} strokeWidth={1.8} /> Saved Intents
                    </button>
                    <button className="navbar-drop-item" onClick={() => { setDropOpen(false); router.push("/settings"); }} role="menuitem">
                      <Settings size={15} strokeWidth={1.8} /> Settings
                    </button>
                    <button className="navbar-drop-item" onClick={() => { setDropOpen(false); router.push("/signup"); }} role="menuitem">
                      <UserPlus size={15} strokeWidth={1.8} /> Add Account
                    </button>

                    <div className="navbar-drop-divider" />

                    <button className="navbar-drop-item danger" onClick={() => { setDropOpen(false); signOut({ callbackUrl: "/login" }); }} role="menuitem">
                      <LogOut size={15} strokeWidth={1.8} /> Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <div className="navbar-drop-header guest">
                      <p className="navbar-drop-guest-title">Welcome to</p>
                      <p className="navbar-drop-guest-brand">LookingFor.</p>
                    </div>
                    <div className="navbar-drop-divider" />
                    <button className="navbar-drop-item" onClick={() => { setDropOpen(false); router.push("/login"); }} role="menuitem">
                      <User size={15} strokeWidth={1.8} /> Log In
                    </button>
                    <button className="navbar-drop-item accent" onClick={() => { setDropOpen(false); router.push("/signup"); }} role="menuitem">
                      <UserPlus size={15} strokeWidth={1.8} /> Create Account
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="navbar-line" />
    </nav>
  );
}

/* ── Exported Navbar wraps itself in Suspense ─────────────────── */
export default function Navbar() {
  return (
    <Suspense fallback={
      <nav className="navbar">
        <div className="navbar-inner">
          <a className="navbar-logo" href="/">
            <img src="/favicon.ico" alt="" className="navbar-logo-icon" />
            <span className="navbar-logo-wordmark">
              <span className="navbar-logo-text">Looking</span>
              <span className="navbar-logo-accent">For.</span>
            </span>
          </a>
          <div className="navbar-search-form" style={{ flex: 1 }}>
            <Search size={14} className="navbar-search-icon" strokeWidth={2} />
            <span style={{ color: "var(--subtle)", fontSize: 13, fontStyle: "italic" }}>Search For Intents…</span>
          </div>
        </div>
        <div className="navbar-line" />
      </nav>
    }>
      <NavbarInner />
    </Suspense>
  );
}


