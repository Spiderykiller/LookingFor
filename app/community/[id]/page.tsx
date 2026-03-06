"use client";

import "../community.css";
import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Users, FileText, Send, UserPlus, UserCheck, Lock } from "lucide-react";

interface Post {
  id: string;
  content: string;
  created_at: string;
  username: string;
  avatar_url: string | null;
}

interface CommunityDetail {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  creator_name: string;
  creator_id: string;
  member_count: number;
  post_count: number;
  created_at: string;
}

export default function CommunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [communityId, setCommunityId] = useState<string | null>(null);
  const [community,   setCommunity]   = useState<CommunityDetail | null>(null);
  const [posts,       setPosts]       = useState<Post[]>([]);
  const [isMember,    setIsMember]    = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [joining,     setJoining]     = useState(false);
  const [content,     setContent]     = useState("");
  const [posting,     setPosting]     = useState(false);
  const [postError,   setPostError]   = useState<string | null>(null);

  // Unwrap params
  useEffect(() => {
    params.then(p => setCommunityId(p.id));
  }, [params]);

  useEffect(() => {
    if (!communityId) return;
    fetch(`/api/communities/${communityId}`)
      .then(r => r.json())
      .then(data => {
        setCommunity(data.community);
        setPosts(data.posts ?? []);
        setIsMember(data.isMember ?? false);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [communityId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [posts]);

  const handleJoin = async () => {
    if (!session?.user) { router.push("/login"); return; }
    setJoining(true);
    try {
      const res  = await fetch(`/api/communities/${communityId}/join`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setIsMember(data.joined);
        setCommunity(prev => prev ? {
          ...prev,
          member_count: data.joined
            ? Number(prev.member_count) + 1
            : Math.max(0, Number(prev.member_count) - 1),
        } : prev);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setJoining(false);
    }
  };

  const handlePost = async () => {
    if (!content.trim() || posting) return;
    setPosting(true);
    setPostError(null);
    const text = content.trim();
    setContent("");
    try {
      const res  = await fetch(`/api/communities/${communityId}/posts`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ content: text }),
      });
      const data = await res.json();
      if (res.ok) {
        setPosts(prev => [data, ...prev]);
      } else {
        setPostError(data.error);
        setContent(text);
      }
    } catch {
      setPostError("Failed to post.");
      setContent(text);
    } finally {
      setPosting(false);
    }
  };

  if (loading) {
    return (
      <div className="comm-container">
        <div className="comm-ambient" />
        <div className="comm-loading">
          <div className="comm-loading-ring" />
        </div>
      </div>
    );
  }

  if (!community) {
    return (
      <div className="comm-container">
        <div className="comm-ambient" />
        <div className="comm-empty" style={{ paddingTop: 80 }}>
          <p className="comm-empty-title">Community not found.</p>
          <button className="comm-back-btn" onClick={() => router.push("/community")}>
            ← Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="comm-container">
      <div className="comm-ambient" />

      {/* ── Detail Header ── */}
      <div className="comm-detail-header">
        <button className="comm-back-btn" onClick={() => router.push("/community")}>
          <ArrowLeft size={16} />
          <span>Communities</span>
        </button>

        <div className="comm-detail-hero">
          <div className="comm-detail-avatar">
            {community.name[0].toUpperCase()}
          </div>
          <div className="comm-detail-info">
            <div className="comm-detail-meta-row">
              {community.category && (
                <span className="comm-card-cat">{community.category}</span>
              )}
              <span className="comm-detail-creator">by {community.creator_name}</span>
            </div>
            <h1 className="comm-detail-name">{community.name}</h1>
            {community.description && (
              <p className="comm-detail-desc">{community.description}</p>
            )}
            <div className="comm-detail-stats">
              <div className="comm-card-stat">
                <Users size={13} strokeWidth={2} />
                <span>{Number(community.member_count).toLocaleString()} members</span>
              </div>
              <div className="comm-card-stat">
                <FileText size={13} strokeWidth={2} />
                <span>{Number(community.post_count).toLocaleString()} posts</span>
              </div>
            </div>
          </div>

          {/* Join/Leave button */}
          <button
            className={`comm-join-btn${isMember ? " joined" : ""}`}
            onClick={handleJoin}
            disabled={joining}
          >
            {joining ? "…" : isMember
              ? <><UserCheck size={14} /> Joined</>
              : <><UserPlus size={14} /> Join</>
            }
          </button>
        </div>
      </div>

      <div className="comm-detail-divider" />

      {/* ── Posts feed ── */}
      <div className="comm-posts">
        {posts.length === 0 ? (
          <div className="comm-posts-empty">
            <p>No posts yet.</p>
            {isMember && <p>Be the first to post something.</p>}
          </div>
        ) : (
          [...posts].reverse().map((post, i) => (
            <div
              key={post.id}
              className="comm-post"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="comm-post-avatar">
                {post.avatar_url
                  ? <img src={post.avatar_url} alt="" className="comm-post-avatar-img" />
                  : (post.username?.[0] ?? "?").toUpperCase()
                }
              </div>
              <div className="comm-post-body">
                <div className="comm-post-top">
                  <span className="comm-post-username">{post.username}</span>
                  <span className="comm-post-time">
                    {new Date(post.created_at).toLocaleDateString("en-US", {
                      month: "short", day: "numeric",
                    })}
                  </span>
                </div>
                <p className="comm-post-content">{post.content}</p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Post input ── */}
      {isMember ? (
        <div className="comm-post-input-wrap">
          {postError && <p className="comm-post-error">{postError}</p>}
          <div className="comm-post-input-row">
            <div className="comm-post-input-avatar">
              {(session?.user?.name?.[0] ?? "?").toUpperCase()}
            </div>
            <input
              className="comm-post-input"
              placeholder={`Post in ${community.name}…`}
              value={content}
              maxLength={500}
              onChange={e => setContent(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handlePost(); }
              }}
            />
            <button
              className="comm-post-send"
              onClick={handlePost}
              disabled={posting || !content.trim()}
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      ) : (
        <div className="comm-join-prompt">
          <Lock size={14} />
          <span>
            <button className="comm-join-link" onClick={handleJoin}>
              Join this community
            </button>
            {" "}to post
          </span>
        </div>
      )}

    </div>
  );
}