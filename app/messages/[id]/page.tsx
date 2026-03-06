"use client";

import "../messages.css";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft, Send, Check, CheckCheck } from "lucide-react";

interface Message {
  id: string;
  sender_id: string;
  sender_username: string;
  sender_avatar: string | null;
  content: string;
  read: boolean;
  created_at: string;
}

interface ConversationMeta {
  id: string;
  other_id: string;
  other_username: string;
  other_avatar: string | null;
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour:   "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDateGroup(dateStr: string): string {
  const d    = new Date(dateStr);
  const now  = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

export default function ThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { data: session, status } = useSession();
  const router  = useRouter();
  const bottomRef   = useRef<HTMLDivElement>(null);
  const inputRef    = useRef<HTMLInputElement>(null);
  const pollRef     = useRef<ReturnType<typeof setInterval> | null>(null);

  const [convId,    setConvId]    = useState<string | null>(null);
  const [convo,     setConvo]     = useState<ConversationMeta | null>(null);
  const [messages,  setMessages]  = useState<Message[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [content,   setContent]   = useState("");
  const [sending,   setSending]   = useState(false);
  const [isTyping,  setIsTyping]  = useState(false); // future use

  // Unwrap params
  useEffect(() => {
    params.then(p => setConvId(p.id));
  }, [params]);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
  }, [status]);

  const fetchMessages = useCallback(async (silent = false) => {
    if (!convId) return;
    try {
      const res  = await fetch(`/api/conversations/${convId}`);
      if (!res.ok) { router.push("/messages"); return; }
      const data = await res.json();
      setConvo(data.conversation);
      setMessages(data.messages ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [convId]);

  // Initial load
  useEffect(() => {
    if (convId && status === "authenticated") fetchMessages();
  }, [convId, status]);

  // Poll every 3 seconds for new messages
  useEffect(() => {
    if (!convId || status !== "authenticated") return;
    pollRef.current = setInterval(() => fetchMessages(true), 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [convId, status, fetchMessages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: messages.length < 5 ? "instant" : "smooth" });
  }, [messages]);

  // Focus input on load
  useEffect(() => {
    if (!loading) inputRef.current?.focus();
  }, [loading]);

  const handleSend = async () => {
    if (!content.trim() || sending || !convId) return;
    const text = content.trim();
    setContent("");

    // Optimistic insert
    const optimistic: Message = {
      id:               `opt-${Date.now()}`,
      sender_id:        session!.user.id,
      sender_username:  session!.user.name ?? "You",
      sender_avatar:    null,
      content:          text,
      read:             false,
      created_at:       new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);
    setSending(true);

    try {
      const res = await fetch(`/api/conversations/${convId}`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ content: text }),
      });

      if (res.ok) {
        const real = await res.json();
        // Replace optimistic with real message
        setMessages(prev =>
          prev.map(m => m.id === optimistic.id ? real : m)
        );
      } else {
        // Remove optimistic on failure
        setMessages(prev => prev.filter(m => m.id !== optimistic.id));
        setContent(text);
      }
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
      setContent(text);
    } finally {
      setSending(false);
    }
  };

  // Group messages by date
  const grouped = messages.reduce<{ date: string; msgs: Message[] }[]>((acc, msg) => {
    const label = formatDateGroup(msg.created_at);
    const last  = acc[acc.length - 1];
    if (last && last.date === label) {
      last.msgs.push(msg);
    } else {
      acc.push({ date: label, msgs: [msg] });
    }
    return acc;
  }, []);

  if (loading) {
    return (
      <div className="thread-container">
        <div className="msg-ambient" />
        <div className="thread-loading">
          <div className="msg-loading-ring" />
        </div>
      </div>
    );
  }

  return (
    <div className="thread-container">
      <div className="msg-ambient" />

      {/* ── Top bar ── */}
      <div className="thread-topbar">
        <button className="thread-back" onClick={() => router.push("/messages")}>
          <ArrowLeft size={18} />
        </button>

        <div className="thread-participant">
          <div className="thread-participant-avatar">
            {convo?.other_avatar
              ? <img src={convo.other_avatar} alt="" className="thread-participant-avatar-img" />
              : (convo?.other_username?.[0] ?? "?").toUpperCase()
            }
            <span className="thread-online-dot" />
          </div>
          <div className="thread-participant-info">
            <p className="thread-participant-name">{convo?.other_username}</p>
            <p className="thread-participant-status">Active now</p>
          </div>
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="thread-messages">
        {messages.length === 0 ? (
          <div className="thread-empty">
            <div className="thread-empty-avatar">
              {(convo?.other_username?.[0] ?? "?").toUpperCase()}
            </div>
            <p className="thread-empty-name">{convo?.other_username}</p>
            <p className="thread-empty-hint">Say something to get the conversation started.</p>
          </div>
        ) : (
          grouped.map(group => (
            <div key={group.date}>
              {/* Date separator */}
              <div className="thread-date-sep">
                <span className="thread-date-label">{group.date}</span>
              </div>

              {group.msgs.map((msg, i) => {
                const isMine = msg.sender_id === session?.user?.id;
                const isOpt  = msg.id.startsWith("opt-");
                const prevMsg = group.msgs[i - 1];
                const isConsecutive = prevMsg && prevMsg.sender_id === msg.sender_id;

                return (
                  <div
                    key={msg.id}
                    className={`thread-msg-row${isMine ? " mine" : " theirs"}`}
                    style={{ marginTop: isConsecutive ? 2 : 12 }}
                  >
                    {/* Avatar — only show for first in a sequence */}
                    {!isMine && !isConsecutive && (
                      <div className="thread-msg-avatar">
                        {convo?.other_avatar
                          ? <img src={convo.other_avatar} alt="" className="thread-msg-avatar-img" />
                          : (convo?.other_username?.[0] ?? "?").toUpperCase()
                        }
                      </div>
                    )}
                    {!isMine && isConsecutive && <div className="thread-msg-avatar-spacer" />}

                    <div className={`thread-bubble-wrap${isMine ? " mine" : ""}`}>
                      <div className={`thread-bubble${isMine ? " mine" : " theirs"}${isOpt ? " optimistic" : ""}`}>
                        {msg.content}
                      </div>
                      <div className={`thread-bubble-meta${isMine ? " mine" : ""}`}>
                        <span className="thread-msg-time">{formatTime(msg.created_at)}</span>
                        {isMine && (
                          <span className="thread-read-icon">
                            {isOpt
                              ? <Check size={11} strokeWidth={2} className="thread-check pending" />
                              : msg.read
                                ? <CheckCheck size={11} strokeWidth={2} className="thread-check read" />
                                : <Check size={11} strokeWidth={2} className="thread-check sent" />
                            }
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Input bar ── */}
      <div className="thread-input-wrap">
        <div className="thread-input-row">
          <input
            ref={inputRef}
            className="thread-input"
            placeholder={`Message ${convo?.other_username ?? ""}…`}
            value={content}
            maxLength={1000}
            onChange={e => setContent(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button
            className={`thread-send-btn${content.trim() ? " active" : ""}`}
            onClick={handleSend}
            disabled={sending || !content.trim()}
          >
            <Send size={16} />
          </button>
        </div>
        <p className="thread-input-hint">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}