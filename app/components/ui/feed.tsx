"use client";

import "./feed.css";
import { useMemo } from "react";
import IntentCard from "../feed/Intentcard";

export interface FeedItem {
  id: string;
  statement: string;
  category: string | string[];
  location: string | null;
  expiresAt: Date;
  createdAt: Date;
  responseCount: number;
  mode: "looking" | "offering";
  username?: string;
  userId?: string;   // ← owner's user_id for DM
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

  if (isLoading) {
    return (
      <section className="feed-section">
        <div className="feed-grid">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="feed-skeleton" style={{ animationDelay: `${i * 80}ms` }} />
          ))}
        </div>
      </section>
    );
  }

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
              mode={item.mode}
              userId={item.userId}     // ← pass through
            />
          </div>
        ))}
      </div>
    </section>
  );
}