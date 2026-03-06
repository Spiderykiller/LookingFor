"use client";

import "./intentcard.css";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Users, MessageCircle, MapPin, Clock, X, Send, Mail } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface IntentCardProps {
  id: string;
  statement: string;
  category: string | string[];
  location: string | null;
  expiresAt: Date;
  responseCount: number;
  username?: string;
  mode?: "looking" | "offering";
  userId?: string;   // ← owner's user_id for DM
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
  mode = "looking",
  userId,
}: IntentCardProps) {
  const { data: session } = useSession();
  const router = useRouter();

  const categories = Array.isArray(category) ? category : [category];
  const ctaLabel   = mode === "offering" ? "Also Offering" : "Also Looking";

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
  const [mounted,       setMounted]       = useState<boolean>(false);
  const [dmLoading,     setDmLoading]     = useState<boolean>(false);

  useEffect(() => { setMounted(true); }, []);

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
        body:    JSON.stringify({ intent_id: id, message: ctaLabel }),
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
    const text = message.trim();
    setMessage("");
    setSending(true);
    try {
      const res = await fetch("/api/responses", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ intent_id: id, message: text }),
      });
      if (res.ok) {
        const newResponse = await res.json();
        setResponses(prev => [...prev, newResponse]);
      } else {
        setMessage(text);
      }
    } catch (err) {
      console.error("Failed to send:", err);
      setMessage(text);
    } finally {
      setSending(false);
    }
  };

  // ── Start or open a DM with the intent poster ────────────────
  const handleDirectMessage = async () => {
    if (!session?.user) { router.push("/login"); return; }
    if (!userId || userId === session.user.id) return;
    setDmLoading(true);
    try {
      const res = await fetch("/api/conversations", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ other_user_id: userId }),
      });
      const data = await res.json();
      if (res.ok) {
        setThreadOpen(false);
        router.push(`/messages/${data.id}`);
      }
    } catch (err) {
      console.error("DM failed:", err);
    } finally {
      setDmLoading(false);
    }
  };

  const showDmButton = userId && session?.user?.id && userId !== session.user.id;

  const drawer = threadOpen && mounted ? createPortal(
    <div className="icard-overlay" onClick={() => setThreadOpen(false)}>
      <div className="icard-drawer" onClick={e => e.stopPropagation()}>

        <div className="icard-drawer-header">
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className="icard-drawer-mode">
              {mode === "looking" ? "LOOKING FOR" : "OFFERING"} —
            </p>
            <p className="icard-drawer-statement">{statement}</p>
          </div>
          <div className="icard-drawer-header-actions">
            {/* DM button in header */}
            {showDmButton && (
              <button
                className="icard-dm-btn"
                onClick={handleDirectMessage}
                disabled={dmLoading}
                title={`Message ${username}`}
              >
                <Mail size={14} />
                {dmLoading ? "…" : "DM"}
              </button>
            )}
            <button className="icard-drawer-close" onClick={() => setThreadOpen(false)}>
              <X size={16} />
            </button>
          </div>
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
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
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
    </div>,
    document.body
  ) : null;

  return (
    <>
      <div className="icard">

        <div className="icard-top">
          <p className="icard-mode-label">
            {mode === "looking" ? "LOOKING FOR" : "OFFERING"} —
          </p>
          <span className="icard-username">{username}</span>
        </div>

        <p className="icard-statement">{statement}</p>

        <div className="icard-categories">
          {categories.map(cat => (
            <span key={cat} className="icard-category-pill">{cat}</span>
          ))}
        </div>

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
            {alsoJoined ? "✓ Joined" : alsoLoading ? "…" : ctaLabel}
          </button>
        </div>

      </div>

      {drawer}
    </>
  );
}