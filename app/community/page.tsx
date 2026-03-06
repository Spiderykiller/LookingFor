"use client";

import "./community.css";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Search, Plus, Users, FileText, X, Check, ChevronRight } from "lucide-react";

const CATEGORY_OPTIONS = [
  "Work", "Creative", "Business", "Social", "Events",
  "Tech", "Study", "Health", "Fitness", "Collab",
  "Arts", "Music", "Gaming", "Housing", "Community",
];

interface Community {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  creator_name: string;
  member_count: number;
  post_count: number;
  created_at: string;
}

export default function CommunityPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [communities,  setCommunities]  = useState<Community[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState("");
  const [createOpen,   setCreateOpen]   = useState(false);

  // Create form
  const [name,         setName]         = useState("");
  const [description,  setDescription]  = useState("");
  const [category,     setCategory]     = useState("");
  const [creating,     setCreating]     = useState(false);
  const [createError,  setCreateError]  = useState<string | null>(null);

  useEffect(() => {
    fetchCommunities();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchCommunities(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchCommunities = async (q = "") => {
    try {
      const res  = await fetch(`/api/communities${q ? `?q=${encodeURIComponent(q)}` : ""}`);
      const data = await res.json();
      setCommunities(data);
    } catch (err) {
      console.error("Failed to fetch communities:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) { setCreateError("Name is required."); return; }
    setCreating(true);
    setCreateError(null);
    try {
      const res  = await fetch("/api/communities", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name, description, category }),
      });
      const data = await res.json();
      if (!res.ok) { setCreateError(data.error); setCreating(false); return; }
      setCreateOpen(false);
      setName(""); setDescription(""); setCategory("");
      router.push(`/community/${data.id}`);
    } catch {
      setCreateError("Something went wrong.");
      setCreating(false);
    }
  };

  const openCreate = () => {
    if (!session?.user) { router.push("/login"); return; }
    setCreateOpen(true);
  };

  return (
    <div className="comm-container">
      <div className="comm-ambient" />

      {/* ── Create Modal ── */}
      {createOpen && (
        <div className="comm-modal-overlay" onClick={() => setCreateOpen(false)}>
          <div className="comm-modal" onClick={e => e.stopPropagation()}>
            <div className="comm-modal-header">
              <p className="comm-modal-title">CREATE COMMUNITY</p>
              <button className="comm-modal-close" onClick={() => setCreateOpen(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="comm-modal-divider" />

            {createError && <div className="comm-error">{createError}</div>}

            <div className="comm-field">
              <label className="comm-label">COMMUNITY NAME</label>
              <input
                className="comm-input"
                placeholder="e.g. Late Night Coders"
                value={name}
                maxLength={40}
                onChange={e => { setName(e.target.value); setCreateError(null); }}
              />
              <span className="comm-char-hint">{40 - name.length} chars left</span>
            </div>

            <div className="comm-field">
              <label className="comm-label">DESCRIPTION</label>
              <textarea
                className="comm-textarea"
                placeholder="What is this community about?"
                value={description}
                maxLength={200}
                rows={3}
                onChange={e => setDescription(e.target.value)}
              />
            </div>

            <div className="comm-field">
              <label className="comm-label">CATEGORY</label>
              <div className="comm-cat-grid">
                {CATEGORY_OPTIONS.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat === category ? "" : cat)}
                    className={`comm-cat-btn${category === cat ? " active" : ""}`}
                  >
                    {category === cat && <Check size={10} strokeWidth={3} />}
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <button
              className={`comm-create-btn${creating ? " loading" : ""}`}
              onClick={handleCreate}
              disabled={creating}
            >
              {creating ? "Creating…" : "Create Community →"}
            </button>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="comm-header">
        <div className="comm-header-top">
          <div>
            <p className="comm-eyebrow">INTENT CITY</p>
            <h1 className="comm-title">
              Find Your <span className="comm-accent">Tribe</span>
            </h1>
            <p className="comm-subtitle">
              Communities built around shared intent
            </p>
          </div>
          <button className="comm-new-btn" onClick={openCreate}>
            <Plus size={16} />
            <span>New</span>
          </button>
        </div>

        {/* Search */}
        <div className="comm-search-wrap">
          <Search size={15} className="comm-search-icon" />
          <input
            className="comm-search"
            placeholder="Search communities…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="comm-search-clear" onClick={() => setSearch("")}>
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* ── Grid ── */}
      <div className="comm-grid">
        {loading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className="comm-skeleton" style={{ animationDelay: `${i * 80}ms` }} />
          ))
        ) : communities.length === 0 ? (
          <div className="comm-empty">
            <div className="comm-empty-icon">◎</div>
            <p className="comm-empty-title">No communities yet.</p>
            <p className="comm-empty-sub">Be the first to create one.</p>
            <button className="comm-create-btn" onClick={openCreate} style={{ marginTop: 20 }}>
              Create Community →
            </button>
          </div>
        ) : (
          communities.map((c, i) => (
            <div
              key={c.id}
              className="comm-card"
              style={{ animationDelay: `${i * 60}ms` }}
              onClick={() => router.push(`/community/${c.id}`)}
            >
              {/* Card glow accent */}
              <div className="comm-card-glow" />

              {/* Top */}
              <div className="comm-card-top">
                <div className="comm-card-avatar">
                  {c.name[0].toUpperCase()}
                </div>
                {c.category && (
                  <span className="comm-card-cat">{c.category}</span>
                )}
              </div>

              {/* Name + description */}
              <h3 className="comm-card-name">{c.name}</h3>
              {c.description && (
                <p className="comm-card-desc">{c.description}</p>
              )}

              {/* Stats */}
              <div className="comm-card-stats">
                <div className="comm-card-stat">
                  <Users size={12} strokeWidth={2} />
                  <span>{Number(c.member_count).toLocaleString()}</span>
                </div>
                <div className="comm-card-stat">
                  <FileText size={12} strokeWidth={2} />
                  <span>{Number(c.post_count).toLocaleString()}</span>
                </div>
                <div className="comm-card-creator">
                  by {c.creator_name}
                </div>
              </div>

              <div className="comm-card-arrow">
                <ChevronRight size={16} />
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}