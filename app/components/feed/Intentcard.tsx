"use client";

import "./intentcard.css";
import { useState, useEffect } from "react";
import { Users, MessageCircle, MapPin, Clock, X, Send } from "lucide-react";
import { useSession } from "next-auth/react";

interface IntentCardProps {
  id: string;
  statement: string;
  category: string | string[];   // ← accepts both for backwards compat
  location: string | null;
  expiresAt: Date;
  responseCount: number;
  username?: string;
}

interface Response {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  username: string;
}

export default function IntentCard({
  id,
  statement,
  category,
  location,
  expiresAt,
  responseCount,
  username = "Anonymous",
}: IntentCardProps) {
  const { data: session } = useSession();

  // Normalise to array always
  const categories = Array.isArray(category) ? category : [category];

  const [timeLeft,      setTimeLeft]      = useState<string>("");
  const [isUrgent,      setIsUrgent]      = useState<boolean>(false);
  const [count,         setCount]         = useState<number>(responseCount);
  const [alsoLoading,   setAlsoLoading]   = useState<boolean>(false);
  const [alsoJoined,    setAlsoJoined]    = useState<boolean>(false);
  const [threadOpen,    setThreadOpen]    = useState<boolean>(false);
  const [responses,     setResponses]     = useState<Response[]>([]);
  const [threadLoading, setThreadLoading] = useState<boolean>(false);
  const [message,       setMessage]       = useState<string>("");
  const [sending,       setSending]       = useState<boolean>(false);

  useEffect(() => {
    const updateTime = () => {
      const now      = Date.now();
      const distance = new Date(expiresAt).getTime() - now;

      if (distance <= 0) { setTimeLeft("Expired"); setIsUrgent(false); return; }

      const hours   = Math.floor(distance / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      setIsUrgent(hours < 2);
      setTimeLeft(hours < 1 ? `${minutes}m` : `${hours}h ${minutes}m`);
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const handleAlsoLooking = async () => {
    if (!session?.user || alsoJoined || alsoLoading) return;
    setAlsoLoading(true);
    try {
      const res = await fetch("/api/responses", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ intent_id: id, message: "Also looking" }),
      });
      if (res.ok) { setAlsoJoined(true); setCount(c => c + 1); }
    } catch (err) {
      console.error("Failed to respond:", err);
    } finally {
      setAlsoLoading(false);
    }
  };

  const openThread = async () => {
    setThreadOpen(true);
    setThreadLoading(true);
    try {
      const res  = await fetch(`/api/responses?intent_id=${id}`);
      const data = await res.json();
      setResponses(data);
    } catch (err) {
      console.error("Failed to load responses:", err);
    } finally {
      setThreadLoading(false);
    }
  };

  const handleSend = async () => {
    if (!message.trim() || !session?.user || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/responses", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ intent_id: id, message: message.trim() }),
      });
      if (res.ok) {
        const newResponse = await res.json();
        setResponses(prev => [...prev, newResponse]);
        setCount(c => c + 1);
        setMessage("");
      }
    } catch (err) {
      console.error("Failed to send:", err);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div className="icard">

        {/* ── Top row ── */}
        <div className="icard-top">
          {/* Multi-category pills */}
          <div className="icard-categories">
            {categories.map(cat => (
              <span key={cat} className="icard-category-pill">{cat}</span>
            ))}
          </div>
          <span className="icard-username">{username}</span>
        </div>

        {/* ── Statement ── */}
        <p className="icard-statement">{statement}</p>

        {/* ── Meta ── */}
        <div className="icard-meta">
          <div className="icard-location">
            <MapPin size={12} strokeWidth={2} />
            <span>{location ?? "Unknown"}</span>
          </div>
          <div className={`icard-time${isUrgent ? " urgent" : ""}`}>
            <Clock size={12} strokeWidth={2} />
            <span>{timeLeft}</span>
          </div>
        </div>

        <div className="icard-divider" />

        {/* ── Footer ── */}
        <div className="icard-footer">
          <div className="icard-stats">
            <button className="icard-stat-btn">
              <Users size={14} strokeWidth={2} />
              <span>{count}</span>
            </button>
            <button className="icard-stat-btn" onClick={openThread}>
              <MessageCircle size={14} strokeWidth={2} />
            </button>
          </div>
          <button
            className={`icard-cta${alsoJoined ? " joined" : ""}`}
            onClick={handleAlsoLooking}
            disabled={alsoLoading || alsoJoined || !session?.user}
          >
            {alsoJoined ? "✓ Joined" : alsoLoading ? "…" : "Also Looking"}
          </button>
        </div>

      </div>

      {/* ── Thread Drawer ── */}
      {threadOpen && (
        <div className="icard-overlay" onClick={() => setThreadOpen(false)}>
          <div className="icard-drawer" onClick={e => e.stopPropagation()}>
            <div className="icard-drawer-header">
              <div>
                <div className="icard-drawer-cats">
                  {categories.map(cat => (
                    <span key={cat} className="icard-category-pill">{cat}</span>
                  ))}
                </div>
                <p className="icard-drawer-statement">{statement}</p>
              </div>
              <button className="icard-drawer-close" onClick={() => setThreadOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="icard-drawer-divider" />

            <div className="icard-drawer-messages">
              {threadLoading ? (
                <div className="icard-drawer-loading">
                  <div className="icard-drawer-spinner" />
                </div>
              ) : responses.length === 0 ? (
                <p className="icard-drawer-empty">No responses yet. Be the first.</p>
              ) : (
                responses.map(r => (
                  <div key={r.id} className="icard-msg">
                    <div className="icard-msg-avatar">
                      {(r.username?.[0] ?? "?").toUpperCase()}
                    </div>
                    <div className="icard-msg-body">
                      <span className="icard-msg-username">{r.username}</span>
                      <p className="icard-msg-text">{r.message}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {session?.user ? (
              <div className="icard-drawer-input-row">
                <input
                  className="icard-drawer-input"
                  placeholder="Write a response…"
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSend()}
                />
                <button
                  className="icard-drawer-send"
                  onClick={handleSend}
                  disabled={sending || !message.trim()}
                >
                  <Send size={15} />
                </button>
              </div>
            ) : (
              <p className="icard-drawer-login">
                <a href="/login">Log in</a> to respond
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}