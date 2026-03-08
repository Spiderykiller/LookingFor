"use client";

import "../messages.css";
import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ArrowLeft, Send, Check, CheckCheck,
  Reply, Copy, Forward, Pin, PinOff,
  Pencil, Trash2, Info, X,
} from "lucide-react";

/* ── Types ────────────────────────────────────────────────────── */
interface Message {
  id: string;
  sender_id: string;
  sender_username: string;
  sender_avatar: string | null;
  content: string;
  read: boolean;
  created_at: string;
  edited: boolean;
  edited_at: string | null;
  deleted: boolean;
  pinned: boolean;
  reactions: Record<string, string[]>;
  reply_to_id: string | null;
  reply_content: string | null;
  reply_username: string | null;
}

interface ConversationMeta {
  id: string;
  other_id: string;
  other_username: string;
  other_avatar: string | null;
}

interface ContextMenu {
  msg: Message;
  x: number;
  y: number;
  isMine: boolean;
}

const EMOJI_REACTIONS = ["❤️", "😂", "👍", "🔥", "😮", "😢"];

/* ── Helpers ──────────────────────────────────────────────────── */
function formatTime(d: string) {
  return new Date(d).toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", hour12: true,
  });
}

function formatDateGroup(d: string) {
  const date = new Date(d);
  const diff = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return date.toLocaleDateString("en-US", {
    weekday: "long", month: "short", day: "numeric",
  });
}

function canEdit(createdAt: string) {
  return Date.now() - new Date(createdAt).getTime() < 15 * 60 * 1000;
}

/* ── Component ────────────────────────────────────────────────── */
export default function ThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { data: session, status } = useSession();
  const router    = useRouter();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);
  const editRef   = useRef<HTMLInputElement>(null);
  const pollRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const menuRef   = useRef<HTMLDivElement>(null);

  const [convId,      setConvId]      = useState<string | null>(null);
  const [convo,       setConvo]       = useState<ConversationMeta | null>(null);
  const [messages,    setMessages]    = useState<Message[]>([]);
  const [pinned,      setPinned]      = useState<Message[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [content,     setContent]     = useState("");
  const [sending,     setSending]     = useState(false);
  const [mounted,     setMounted]     = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [replyTo,     setReplyTo]     = useState<Message | null>(null);
  const [editingMsg,  setEditingMsg]  = useState<Message | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editError,   setEditError]   = useState<string | null>(null);
  const [forwardMsg,  setForwardMsg]  = useState<Message | null>(null);
  const [infoMsg,     setInfoMsg]     = useState<Message | null>(null);
  const [showPinned,  setShowPinned]  = useState(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { params.then(p => setConvId(p.id)); }, [params]);
  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status]);

  const fetchMessages = useCallback(async (silent = false) => {
    if (!convId) return;
    try {
      const res = await fetch(`/api/conversations/${convId}`);
      if (!res.ok) { router.push("/messages"); return; }
      const data = await res.json();
      setConvo(data.conversation);
      setMessages(data.messages ?? []);
      setPinned(data.pinned ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [convId]);

  useEffect(() => {
    if (convId && status === "authenticated") fetchMessages();
  }, [convId, status]);

  useEffect(() => {
    if (!convId || status !== "authenticated") return;
    pollRef.current = setInterval(() => fetchMessages(true), 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [convId, status, fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: messages.length < 5 ? "instant" : "smooth",
    });
  }, [messages]);

  useEffect(() => { if (!loading) inputRef.current?.focus(); }, [loading]);
  useEffect(() => { if (editingMsg) editRef.current?.focus(); }, [editingMsg]);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    if (contextMenu) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [contextMenu]);

  /* ── Open context menu ───────────────────────────────────────── */
  const openMenu = (
    e: React.MouseEvent | React.TouchEvent,
    msg: Message,
    isMine: boolean,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (msg.deleted) return;

    let x: number, y: number;
    if ("touches" in e) {
      x = e.touches[0].clientX;
      y = e.touches[0].clientY;
    } else {
      x = (e as React.MouseEvent).clientX;
      y = (e as React.MouseEvent).clientY;
    }

    x = Math.min(Math.max(x, 12), window.innerWidth  - 222);
    y = Math.min(Math.max(y, 12), window.innerHeight - 360);

    setContextMenu({ msg, x, y, isMine });
  };

  /* ── Send message ────────────────────────────────────────────── */
  const handleSend = async () => {
    if (!content.trim() || sending || !convId) return;
    const text = content.trim();
    setContent("");

    const optimistic: Message = {
      id:              `opt-${Date.now()}`,
      sender_id:       session!.user.id,
      sender_username: session!.user.name ?? "You",
      sender_avatar:   null,
      content:         text,
      read:            false,
      created_at:      new Date().toISOString(),
      edited:          false,
      edited_at:       null,
      deleted:         false,
      pinned:          false,
      reactions:       {},
      reply_to_id:     replyTo?.id ?? null,
      reply_content:   replyTo?.content ?? null,
      reply_username:  replyTo?.sender_username ?? null,
    };

    setMessages(prev => [...prev, optimistic]);
    setReplyTo(null);
    setSending(true);

    try {
      const res = await fetch(`/api/conversations/${convId}`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          content:     text,
          reply_to_id: replyTo?.id ?? null,
        }),
      });
      if (res.ok) {
        const real = await res.json();
        setMessages(prev => prev.map(m => m.id === optimistic.id ? real : m));
      } else {
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

  /* ── API action ──────────────────────────────────────────────── */
  const doAction = async (
    action: string,
    msg: Message,
    extra?: Record<string, any>,
  ) => {
    setContextMenu(null);

    if (action === "reply") {
      setReplyTo(msg);
      inputRef.current?.focus();
      return;
    }
    if (action === "copy") {
      navigator.clipboard.writeText(msg.content);
      return;
    }
    if (action === "forward") { setForwardMsg(msg); return; }
    if (action === "info")    { setInfoMsg(msg);    return; }
    if (action === "edit") {
      setEditingMsg(msg);
      setEditContent(msg.content);
      return;
    }

    try {
      const res = await fetch(
        `/api/conversations/${convId}/messages/${msg.id}`,
        {
          method:  "PATCH",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ action, ...extra }),
        },
      );
      if (res.ok) {
        const updated = await res.json();
        setMessages(prev =>
          prev.map(m => m.id === msg.id ? { ...m, ...updated } : m),
        );
        if (action === "pin") {
          setPinned(prev =>
            updated.pinned
              ? [...prev.filter(p => p.id !== msg.id), { ...msg, ...updated }]
              : prev.filter(p => p.id !== msg.id),
          );
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  /* ── Save edit ───────────────────────────────────────────────── */
  const saveEdit = async () => {
    if (!editingMsg || !editContent.trim()) return;

    const trimmed     = editContent.trim();
    const originalMsg = editingMsg; // capture before state clears

    // Optimistic update — feels instant
    setMessages(prev =>
      prev.map(m =>
        m.id === originalMsg.id
          ? { ...m, content: trimmed, edited: true }
          : m,
      ),
    );
    setEditingMsg(null);
    setEditContent("");
    setEditError(null);

    try {
      const res = await fetch(
        `/api/conversations/${convId}/messages/${originalMsg.id}`,
        {
          method:  "PATCH",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ action: "edit", content: trimmed }),
        },
      );

      if (res.ok) {
        // Sync real edited_at timestamp from server
        const updated = await res.json();
        setMessages(prev =>
          prev.map(m => m.id === originalMsg.id ? { ...m, ...updated } : m),
        );
      } else {
        // Revert + show server reason
        const err = await res.json().catch(() => ({}));
        const reason = err.error ?? "Edit failed";
        setMessages(prev =>
          prev.map(m =>
            m.id === originalMsg.id
              ? { ...m, content: originalMsg.content, edited: originalMsg.edited }
              : m,
          ),
        );
        setEditError(reason);
        setTimeout(() => setEditError(null), 4000);
      }
    } catch {
      // Network error — revert
      setMessages(prev =>
        prev.map(m =>
          m.id === originalMsg.id
            ? { ...m, content: originalMsg.content, edited: originalMsg.edited }
            : m,
        ),
      );
      setEditError("Network error — edit not saved");
      setTimeout(() => setEditError(null), 4000);
    }
  };

  /* ── Group by date ───────────────────────────────────────────── */
  const grouped = messages.reduce<{ date: string; msgs: Message[] }[]>(
    (acc, msg) => {
      const label = formatDateGroup(msg.created_at);
      const last  = acc[acc.length - 1];
      if (last?.date === label) last.msgs.push(msg);
      else acc.push({ date: label, msgs: [msg] });
      return acc;
    },
    [],
  );

  /* ── Context menu portal ─────────────────────────────────────── */
  const contextMenuPortal =
    contextMenu && mounted
      ? createPortal(
          <div
            className="ctx-overlay"
            onClick={() => setContextMenu(null)}
          >
            <div
              ref={menuRef}
              className="ctx-menu"
              style={{ left: contextMenu.x, top: contextMenu.y }}
              onClick={e => e.stopPropagation()}
            >
              {/* Emoji reactions */}
              <div className="ctx-reactions">
                {EMOJI_REACTIONS.map(emoji => {
                  const count =
                    contextMenu.msg.reactions?.[emoji]?.length ?? 0;
                  return (
                    <button
                      key={emoji}
                      className={`ctx-emoji-btn${count > 0 ? " reacted" : ""}`}
                      onClick={() =>
                        doAction("react", contextMenu.msg, { emoji })
                      }
                    >
                      {emoji}
                      {count > 0 && (
                        <span className="ctx-emoji-count">{count}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="ctx-divider" />

              <button
                className="ctx-item"
                onClick={() => doAction("reply", contextMenu.msg)}
              >
                <Reply size={15} /> Reply
              </button>

              <button
                className="ctx-item"
                onClick={() => doAction("copy", contextMenu.msg)}
              >
                <Copy size={15} /> Copy text
              </button>

              <button
                className="ctx-item"
                onClick={() => doAction("forward", contextMenu.msg)}
              >
                <Forward size={15} /> Forward
              </button>

              <button
                className="ctx-item"
                onClick={() => doAction("pin", contextMenu.msg)}
              >
                {contextMenu.msg.pinned ? (
                  <><PinOff size={15} /> Unpin</>
                ) : (
                  <><Pin size={15} /> Pin message</>
                )}
              </button>

              <button
                className="ctx-item"
                onClick={() => doAction("info", contextMenu.msg)}
              >
                <Info size={15} /> Message info
              </button>

              {contextMenu.isMine &&
                canEdit(contextMenu.msg.created_at) && (
                  <button
                    className="ctx-item"
                    onClick={() => doAction("edit", contextMenu.msg)}
                  >
                    <Pencil size={15} /> Edit
                    <span className="ctx-item-hint">15 min</span>
                  </button>
                )}

              {contextMenu.isMine && (
                <>
                  <div className="ctx-divider" />
                  <button
                    className="ctx-item danger"
                    onClick={() => doAction("delete", contextMenu.msg)}
                  >
                    <Trash2 size={15} /> Delete
                  </button>
                </>
              )}
            </div>
          </div>,
          document.body,
        )
      : null;

  /* ── Loading ─────────────────────────────────────────────────── */
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

  /* ── Main render ─────────────────────────────────────────────── */
  return (
    <div className="thread-container">
      <div className="msg-ambient" />

      {/* ── Top bar ── */}
      <div className="thread-topbar">
        <button
          className="thread-back"
          onClick={() => router.push("/messages")}
        >
          <ArrowLeft size={18} />
        </button>

        <div className="thread-participant">
          <div className="thread-participant-avatar">
            {convo?.other_avatar ? (
              <img
                src={convo.other_avatar}
                alt=""
                className="thread-participant-avatar-img"
              />
            ) : (
              (convo?.other_username?.[0] ?? "?").toUpperCase()
            )}
            <span className="thread-online-dot" />
          </div>
          <div className="thread-participant-info">
            <p className="thread-participant-name">
              {convo?.other_username}
            </p>
            <p className="thread-participant-status">Active now</p>
          </div>
        </div>

        {pinned.length > 0 && (
          <button
            className="thread-pin-badge"
            onClick={() => setShowPinned(v => !v)}
          >
            <Pin size={13} />
            {pinned.length} pinned
          </button>
        )}
      </div>

      {/* ── Pinned panel ── */}
      {showPinned && pinned.length > 0 && (
        <div className="thread-pinned-panel">
          <div className="thread-pinned-title">
            <Pin size={12} /> Pinned Messages
          </div>
          {pinned.map(p => (
            <div key={p.id} className="thread-pinned-item">
              <span className="thread-pinned-user">
                {p.sender_username}
              </span>
              <span className="thread-pinned-text">{p.content}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Messages ── */}
      <div className="thread-messages">
        {messages.length === 0 ? (
          <div className="thread-empty">
            <div className="thread-empty-avatar">
              {(convo?.other_username?.[0] ?? "?").toUpperCase()}
            </div>
            <p className="thread-empty-name">{convo?.other_username}</p>
            <p className="thread-empty-hint">
              Say something to get the conversation started.
            </p>
          </div>
        ) : (
          grouped.map(group => (
            <div key={group.date}>
              <div className="thread-date-sep">
                <span className="thread-date-label">{group.date}</span>
              </div>

              {group.msgs.map((msg, i) => {
                const isMine        = msg.sender_id === session?.user?.id;
                const isOpt         = msg.id.startsWith("opt-");
                const prevMsg       = group.msgs[i - 1];
                const isConsec      = prevMsg?.sender_id === msg.sender_id;
                const reactionList  = Object.entries(
                  msg.reactions ?? {},
                ).filter(([, users]) => users.length > 0);

                return (
                  <div
                    key={msg.id}
                    className={`thread-msg-row${isMine ? " mine" : " theirs"}`}
                    style={{ marginTop: isConsec ? 2 : 14 }}
                  >
                    {!isMine && !isConsec && (
                      <div className="thread-msg-avatar">
                        {convo?.other_avatar ? (
                          <img
                            src={convo.other_avatar}
                            alt=""
                            className="thread-msg-avatar-img"
                          />
                        ) : (
                          (convo?.other_username?.[0] ?? "?").toUpperCase()
                        )}
                      </div>
                    )}
                    {!isMine && isConsec && (
                      <div className="thread-msg-avatar-spacer" />
                    )}

                    <div
                      className={`thread-bubble-wrap${isMine ? " mine" : ""}`}
                    >
                      {/* Reply preview inside bubble */}
                      {msg.reply_to_id && msg.reply_content && !isOpt && (
                        <div
                          className={`thread-reply-preview${isMine ? " mine" : ""}`}
                        >
                          <span className="thread-reply-user">
                            {msg.reply_username}
                          </span>
                          <span className="thread-reply-text">
                            {msg.reply_content.length > 60
                              ? msg.reply_content.slice(0, 60) + "…"
                              : msg.reply_content}
                          </span>
                        </div>
                      )}

                      {/* Bubble */}
                      <div
                        className={[
                          "thread-bubble",
                          isMine ? "mine" : "theirs",
                          isOpt ? "optimistic" : "",
                          msg.deleted ? "deleted" : "",
                          msg.pinned && !msg.deleted ? "pinned-msg" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onClick={e =>
                          !msg.deleted && openMenu(e, msg, isMine)
                        }
                        onContextMenu={e =>
                          !msg.deleted && openMenu(e, msg, isMine)
                        }
                      >
                        {msg.pinned && !msg.deleted && (
                          <Pin
                            size={10}
                            className="thread-bubble-pin-icon"
                          />
                        )}
                        {msg.deleted ? (
                          <span className="thread-bubble-deleted">
                            🚫 This message was deleted
                          </span>
                        ) : (
                          msg.content
                        )}
                      </div>

                      {/* Reactions */}
                      {reactionList.length > 0 && (
                        <div
                          className={`thread-reactions${isMine ? " mine" : ""}`}
                        >
                          {reactionList.map(([emoji, users]) => (
                            <button
                              key={emoji}
                              className={`thread-reaction-pill${users.includes(session?.user?.id ?? "") ? " mine" : ""}`}
                              onClick={() =>
                                doAction("react", msg, { emoji })
                              }
                            >
                              {emoji} {users.length}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Meta row */}
                      <div
                        className={`thread-bubble-meta${isMine ? " mine" : ""}`}
                      >
                        <span className="thread-msg-time">
                          {formatTime(msg.created_at)}
                        </span>
                        {msg.edited && !msg.deleted && (
                          <span className="thread-edited-label">
                            edited
                          </span>
                        )}
                        {isMine && (
                          <span className="thread-read-icon">
                            {isOpt ? (
                              <Check
                                size={11}
                                strokeWidth={2}
                                className="thread-check pending"
                              />
                            ) : msg.read ? (
                              <CheckCheck
                                size={11}
                                strokeWidth={2}
                                className="thread-check read"
                              />
                            ) : (
                              <Check
                                size={11}
                                strokeWidth={2}
                                className="thread-check sent"
                              />
                            )}
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

      {/* ── Reply bar ── */}
      {replyTo && (
        <div className="thread-reply-bar">
          <div className="thread-reply-bar-content">
            <Reply size={13} />
            <div>
              <span className="thread-reply-bar-user">
                {replyTo.sender_username}
              </span>
              <p className="thread-reply-bar-text">
                {replyTo.content.length > 60
                  ? replyTo.content.slice(0, 60) + "…"
                  : replyTo.content}
              </p>
            </div>
          </div>
          <button
            className="thread-reply-bar-close"
            onClick={() => setReplyTo(null)}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Edit error toast ── */}
      {editError && (
        <div className="thread-edit-error">
          <span>{editError}</span>
          <button onClick={() => setEditError(null)}>✕</button>
        </div>
      )}

      {/* ── Edit bar ── */}
      {editingMsg && (
        <div className="thread-edit-bar">
          <div className="thread-edit-label">
            <Pencil size={12} /> Editing message
          </div>
          <div className="thread-input-row">
            <input
              ref={editRef}
              className="thread-input"
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  saveEdit();
                }
                if (e.key === "Escape") {
                  setEditingMsg(null);
                  setEditContent("");
                }
              }}
            />
            <button
              className="thread-send-btn active"
              onClick={saveEdit}
              disabled={!editContent.trim()}
              title="Save (Enter)"
            >
              <Check size={16} />
            </button>
            <button
              className="thread-send-btn"
              onClick={() => {
                setEditingMsg(null);
                setEditContent("");
              }}
              title="Cancel (Esc)"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── Input bar ── */}
      {!editingMsg && (
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
          <p className="thread-input-hint">
            Tap a message for options · Enter to send
          </p>
        </div>
      )}

      {/* ── Info modal ── */}
      {infoMsg &&
        mounted &&
        createPortal(
          <div
            className="ctx-overlay"
            onClick={() => setInfoMsg(null)}
          >
            <div
              className="info-modal"
              onClick={e => e.stopPropagation()}
            >
              <div className="info-modal-header">
                <p className="info-modal-title">Message Info</p>
                <button
                  className="ctx-close-btn"
                  onClick={() => setInfoMsg(null)}
                >
                  <X size={15} />
                </button>
              </div>
              <div className="info-modal-body">
                <div className="info-row">
                  <span>Sent</span>
                  <span>
                    {new Date(infoMsg.created_at).toLocaleString()}
                  </span>
                </div>
                {infoMsg.edited && (
                  <div className="info-row">
                    <span>Edited</span>
                    <span>
                      {infoMsg.edited_at
                        ? new Date(infoMsg.edited_at).toLocaleString()
                        : "—"}
                    </span>
                  </div>
                )}
                <div className="info-row">
                  <span>Read</span>
                  <span>{infoMsg.read ? "✓ Seen" : "Not yet"}</span>
                </div>
                <div className="info-row">
                  <span>Pinned</span>
                  <span>{infoMsg.pinned ? "Yes" : "No"}</span>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* ── Forward modal ── */}
      {forwardMsg &&
        mounted &&
        createPortal(
          <div
            className="ctx-overlay"
            onClick={() => setForwardMsg(null)}
          >
            <div
              className="info-modal"
              onClick={e => e.stopPropagation()}
            >
              <div className="info-modal-header">
                <p className="info-modal-title">Forward Message</p>
                <button
                  className="ctx-close-btn"
                  onClick={() => setForwardMsg(null)}
                >
                  <X size={15} />
                </button>
              </div>
              <div className="info-modal-body">
                <p className="info-forward-preview">
                  &ldquo;
                  {forwardMsg.content.length > 80
                    ? forwardMsg.content.slice(0, 80) + "…"
                    : forwardMsg.content}
                  &rdquo;
                </p>
                <p className="info-forward-hint">
                  Open another conversation and paste, or copy it now.
                </p>
                <button
                  className="info-copy-btn"
                  onClick={() => {
                    navigator.clipboard.writeText(forwardMsg.content);
                    setForwardMsg(null);
                  }}
                >
                  <Copy size={14} /> Copy & Close
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {contextMenuPortal}
    </div>
  );
}