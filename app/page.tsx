"use client";

import { useEffect, useState, useMemo, Suspense, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Navbar from "./components/ui/Navbar";
import RoleToggle from "./components/ui/Roletoggle";
import CategoryFilter from "./components/ui/Categoryfliter";
import Feed, { FeedItem } from "./components/ui/feed";
import { useIntentStore } from "@/store/useIntentstore";

function HomeContent() {
  const [items,      setItems]      = useState<FeedItem[]>([]);
  const [isLoading,  setIsLoading]  = useState(true);
  const [popular,    setPopular]    = useState<string[]>([]);

  const { mode, category } = useIntentStore();
  const searchParams = useSearchParams();
  const router       = useRouter();
  const q = searchParams.get("q") ?? "";

  // Fetch feed — re-runs when q changes
  useEffect(() => {
    async function fetchFeed() {
      try {
        setIsLoading(true);
        const url = q ? `/api/feed?q=${encodeURIComponent(q)}` : `/api/feed`;
        const res  = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error("Feed fetch failed");

        const data = await res.json();
        const mapped: FeedItem[] = data.map((item: any) => ({
          id:            item.id,
          statement:     item.statement,
          category:      Array.isArray(item.category) ? item.category : [item.category],
          location:      item.location ?? null,
          expiresAt:     new Date(item.expires_at),
          createdAt:     new Date(item.created_at),
          mode:          item.mode,
          responseCount: Number(item.response_count ?? 0),
          username:      item.username,
          userId:        item.user_id,
          isBookmarked:  item.is_bookmarked ?? false,
        }));

        setItems(mapped);
      } catch (err) {
        console.error("Failed to load feed:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchFeed();
  }, [q]);

  // Fetch popular categories for empty state
  useEffect(() => {
    fetch("/api/feed/popular")
      .then(r => r.json())
      .then(d => setPopular(d.categories ?? []))
      .catch(() => {});
  }, []);

  // Category chip click in empty state — navigates to that search
  const handleCategoryClick = useCallback((cat: string) => {
    router.push(`/?q=${encodeURIComponent(cat)}`);
  }, [router]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const modeMatch = mode === "LOOKING"
        ? item.mode === "looking"
        : item.mode === "offering";

      const categoryMatch =
        category === null ||
        (Array.isArray(item.category)
          ? item.category.includes(category)
          : item.category === category);

      return modeMatch && categoryMatch;
    });
  }, [items, mode, category]);

  const isSearchMode = q.length > 0;

  return (
    <main className="pb-20">
      <Navbar />
      <RoleToggle />

      {/* Search result banner */}
      {isSearchMode && (
        <div className="feed-search-banner">
          <span className="feed-search-label">
            Results for <strong>&ldquo;{q}&rdquo;</strong>
          </span>
          <span className="feed-search-count">
            {filteredItems.length} intent{filteredItems.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      <CategoryFilter />

      <Feed
        items={filteredItems}
        isLoading={isLoading}
        searchMode={isSearchMode}
        emptyQuery={isSearchMode ? q : ""}
        popularCategories={popular}
        onCategoryClick={handleCategoryClick}
      />
    </main>
  );
}

export default function Home() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  );
}