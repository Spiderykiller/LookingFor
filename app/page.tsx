"use client";

import { useEffect, useState, useMemo } from "react";
import Navbar from "./components/ui/Navbar";
import RoleToggle from "./components/ui/Roletoggle";
import CategoryFilter from "./components/ui/Categoryfliter";
import Feed, { FeedItem } from "./components/ui/feed";
import { useIntentStore } from "@/store/useIntentstore";

export default function Home() {
  const [items,     setItems]     = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { mode, category } = useIntentStore();

  useEffect(() => {
    async function fetchFeed() {
      try {
        setIsLoading(true);
        const res = await fetch("/api/feed", { cache: "no-store" });
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
          userId:        item.user_id,   // ← include owner id
        }));

        setItems(mapped);
      } catch (err) {
        console.error("Failed to load feed:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchFeed();
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const modeMatch = mode === "LOOKING"
        ? item.mode === "looking"
        : item.mode === "offering";
      const categoryMatch = category === null
        || (Array.isArray(item.category)
          ? item.category.includes(category)
          : item.category === category);
      return modeMatch && categoryMatch;
    });
  }, [items, mode, category]);

  return (
    <main className="pb-20">
      <Navbar />
      <RoleToggle />
      <CategoryFilter />
      <Feed items={filteredItems} isLoading={isLoading} />
    </main>
  );
}