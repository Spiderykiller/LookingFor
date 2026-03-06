"use client";

import "./messages.css";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { MessageCircle, Search, X } from "lucide-react";

interface Conversation {
  id: string;
  other_id: string;
  other_username: string;
  other_avatar: string | null;
  last_message: string | null;
  last_message_at: string | null;
  last_sender_id: string | null;
  unread_count: number;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return "just now";
  if (mins < 60)  return `${mins}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7)   return `${days}d`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function MessagesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [convos,   setConvos]   = useState<Conversation[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status !== "authenticated")   return;
    fetchConvos();
  }, [status]);

  const fetchConvos = async () => {
    try {
      const res  = await fetch("/api/conversations");
      const data = await res.json();
      setConvos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = convos.filter(c =>
    c.other_username.toLowerCase().includes(search.toLowerCase())
  );

  const totalUnread = convos.reduce((sum, c) => sum + Number(c.unread_count), 0);

  return (
    <div className="msg-container">
      <div className="msg-ambient" />

      {/* ── Header ── */}
      <div className="msg-header">
        <div className="msg-header-row">
          <div>
            <p className="msg-eyebrow">DIRECT</p>
            <h1 className="msg-title">
              Messages
              {totalUnread > 0 && (
                <span className="msg-title-badge">{totalUnread}</span>
              )}
            </h1>
          </div>
          <div className="msg-header-icon">
            <MessageCircle size={22} strokeWidth={1.5} />
          </div>
        </div>

        {/* Search */}
        <div className="msg-search-wrap">
          <Search size={14} className="msg-search-icon" />
          <input
            className="msg-search"
            placeholder="Search conversations…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="msg-search-clear" onClick={() => setSearch("")}>
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* ── Conversation list ── */}
      <div className="msg-list">
        {loading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="msg-skeleton" style={{ animationDelay: `${i * 70}ms` }} />
          ))
        ) : filtered.length === 0 ? (
          <div className="msg-empty">
            <div className="msg-empty-icon">
              <MessageCircle size={32} strokeWidth={1} />
            </div>
            <p className="msg-empty-title">
              {search ? "No conversations found." : "No messages yet."}
            </p>
            <p className="msg-empty-sub">
              {!search && "Start a conversation from someone's intent thread."}
            </p>
          </div>
        ) : (
          filtered.map((c, i) => {
            const isUnread  = Number(c.unread_count) > 0;
            const isMine    = c.last_sender_id === session?.user?.id;
            const preview   = c.last_message
              ? `${isMine ? "You: " : ""}${c.last_message}`
              : "No messages yet";

            return (
              <div
                key={c.id}
                className={`msg-item${isUnread ? " unread" : ""}`}
                style={{ animationDelay: `${i * 50}ms` }}
                onClick={() => router.push(`/messages/${c.id}`)}
              >
                {/* Avatar */}
                <div className="msg-item-avatar">
                  {c.other_avatar
                    ? <img src={c.other_avatar} alt="" className="msg-item-avatar-img" />
                    : (c.other_username?.[0] ?? "?").toUpperCase()
                  }
                  {isUnread && <span className="msg-item-dot" />}
                </div>

                {/* Content */}
                <div className="msg-item-body">
                  <div className="msg-item-top">
                    <span className="msg-item-name">{c.other_username}</span>
                    {c.last_message_at && (
                      <span className="msg-item-time">{timeAgo(c.last_message_at)}</span>
                    )}
                  </div>
                  <p className={`msg-item-preview${isUnread ? " bold" : ""}`}>
                    {preview.length > 60 ? preview.slice(0, 60) + "…" : preview}
                  </p>
                </div>

                {/* Unread badge */}
                {isUnread && (
                  <span className="msg-item-badge">{c.unread_count}</span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}