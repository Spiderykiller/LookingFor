"use client";

import "./feed.css";
import { useMemo } from "react";
import IntentCard from "../feed/Intentcard";

export interface FeedItem {
  id: string;
  statement: string;
  category: string;
  location: string | null;
  expiresAt: Date;
  createdAt: Date;
  responseCount: number;
  mode: "looking" | "offering";
  username?: string;
}

interface FeedProps {
  items: FeedItem[];
  isLoading?: boolean;
}

export default function Feed({ items, isLoading = false }: FeedProps) {
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const aDate = a.createdAt ?? a.expiresAt;
      const bDate = b.createdAt ?? b.expiresAt;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });
  }, [items]);

  /* ── Skeleton loader ──────────────────────────────────────── */
  if (isLoading) {
    return (
      <section className="feed-section">
        <div className="feed-grid">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="feed-skeleton"
              style={{ animationDelay: `${i * 80}ms` }}
            />
          ))}
        </div>
      </section>
    );
  }

  /* ── Empty state ──────────────────────────────────────────── */
  if (sortedItems.length === 0) {
    return (
      <section className="feed-section">
        <div className="feed-empty">
          <div className="feed-empty-icon">◎</div>
          <p className="feed-empty-title">Nothing here yet.</p>
          <p className="feed-empty-sub">Be the first to post an intent.</p>
        </div>
      </section>
    );
  }

  /* ── Feed grid ────────────────────────────────────────────── */
  return (
    <section className="feed-section">
      <div className="feed-grid">
        {sortedItems.map((item, i) => (
          <div
            key={item.id}
            className="feed-card-wrapper"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <IntentCard
              id={item.id}
              statement={item.statement}
              category={item.category}
              location={item.location}
              expiresAt={item.expiresAt}
              responseCount={item.responseCount}
              username={item.username}
            />
          </div>
        ))}
      </div>
    </section>
  );
}