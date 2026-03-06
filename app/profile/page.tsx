"use client";

import "./profile.css";
import { useEffect, useState, useRef } from "react";
import { MapPin, MessageCircle, Clock, Edit2, Plus, X, Check, Camera, Eye, EyeOff, Bookmark } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

type Mode = "LOOKING" | "OFFERING";

interface ActiveRequest {
  id: string;
  statement: string;
  category: string;
  timeLeft: string;
  responses: number;
  isUrgent: boolean;
  mode: "looking" | "offering";
}

const CATEGORIES = [
  "Work", "Creative", "Business", "Social", "Events",
  "Tech", "Study", "Health", "Fitness", "Collab",
  "Arts", "Music", "Gaming", "Housing", "Community",
];

export default function ProfilePage() {
  const { data: session, status, update: updateSession } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mode,        setMode]        = useState<Mode>("LOOKING");
  const [activeTab,   setActiveTab]   = useState<"intents" | "bookmarks">(
    searchParams.get("tab") === "bookmarks" ? "bookmarks" : "intents"
  );
  const [user,        setUser]        = useState<any>(null);
  const [requests,    setRequests]    = useState<ActiveRequest[]>([]);
  const [bookmarks,   setBookmarks]   = useState<any[]>([]);
  const [interests,   setInterests]   = useState<string[]>([]);
  const [stats,       setStats]       = useState<any>(null);
  const [loading,     setLoading]     = useState(true);

  // Edit profile modal
  const [editing,      setEditing]      = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [saveSuccess,  setSaveSuccess]  = useState(false);
  const [saveError,    setSaveError]    = useState<string | null>(null);
  const [form,         setForm]         = useState({ username: "", location: "" });

  // Password change
  const [currentPw,    setCurrentPw]    = useState("");
  const [newPw,        setNewPw]        = useState("");
  const [confirmPw,    setConfirmPw]    = useState("");
  const [showCurrentPw,setShowCurrentPw]= useState(false);
  const [showNewPw,    setShowNewPw]    = useState(false);
  const [pwError,      setPwError]      = useState<string | null>(null);
  const [pwSuccess,    setPwSuccess]    = useState(false);
  const [pwSaving,     setPwSaving]     = useState(false);

  // Avatar
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarSaving,  setAvatarSaving]  = useState(false);

  // Interest tags modal
  const [tagsOpen,    setTagsOpen]    = useState(false);
  const [tagsSaving,  setTagsSaving]  = useState(false);
  const [tagsDraft,   setTagsDraft]   = useState<string[]>([]);

  const userId = session?.user?.id;

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user?.id) { router.push("/login"); return; }

    async function loadProfile() {
      try {
        const res = await fetch(`/api/profile/${session!.user.id}`);
        if (!res.ok) { setLoading(false); return; }

        const data = await res.json();
        setUser(data.user);
        setInterests(data.interests ?? []);
        setStats(data.stats);
        setForm({
          username: data.user.username ?? "",
          location: data.user.location ?? "",
        });

        const formatted = (data.activeIntents ?? []).map((i: any) => {
          const expires   = new Date(i.expires_at);
          const hoursLeft = Math.max(0, Math.floor((expires.getTime() - Date.now()) / (1000 * 60 * 60)));
          return {
            id:        i.id,
            statement: i.statement,
            category:  i.category,
            timeLeft:  `${hoursLeft}h left`,
            responses: Number(i.responses),
            isUrgent:  hoursLeft <= 6,
            mode:      i.mode,
          };
        });

        setRequests(formatted);
        if (data.user.current_mode) {
          setMode(data.user.current_mode === "offering" ? "OFFERING" : "LOOKING");
        }

        // Fetch bookmarks
        const bmRes  = await fetch("/api/bookmarks");
        const bmData = await bmRes.json();
        setBookmarks(Array.isArray(bmData) ? bmData : []);

      } catch (err) {
        console.error("Failed to load profile:", err);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [session, status]);

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/login");
  };

  // ── Open edit modal ──────────────────────────────────────────
  const openEditing = () => {
    setForm({ username: user.username ?? "", location: user.location ?? "" });
    setCurrentPw(""); setNewPw(""); setConfirmPw("");
    setPwError(null); setPwSuccess(false); setSaveError(null);
    setAvatarPreview(null);
    setEditing(true);
  };

  // ── Avatar: pick + compress ──────────────────────────────────
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const size   = 200;
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext("2d")!;
        const min  = Math.min(img.width, img.height);
        const sx   = (img.width  - min) / 2;
        const sy   = (img.height - min) / 2;
        ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
        setAvatarPreview(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.src = ev.target!.result as string;
    };
    reader.readAsDataURL(file);
  };

  // ── Save avatar ──────────────────────────────────────────────
  const handleSaveAvatar = async () => {
    if (!avatarPreview || !userId) return;
    setAvatarSaving(true);
    try {
      const res = await fetch(`/api/profile/${userId}/avatar`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ avatar_url: avatarPreview }),
      });
      if (res.ok) {
        setUser((prev: any) => ({ ...prev, avatar_url: avatarPreview }));
        await updateSession();
        setAvatarPreview(null);
      }
    } catch (err) {
      console.error("Failed to save avatar:", err);
    } finally {
      setAvatarSaving(false);
    }
  };

  // ── Save profile (username + location) ──────────────────────
  const handleSaveEdit = async () => {
    if (!form.username.trim()) return;
    setSaving(true); setSaveError(null);
    try {
      const res = await fetch(`/api/profile/${userId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          username: form.username.trim(),
          location: form.location.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setSaveError(data.error ?? "Failed to save");
        return;
      }
      setUser((prev: any) => ({
        ...prev,
        username: form.username.trim(),
        location: form.location.trim(),
      }));
      setSaveSuccess(true);
      setTimeout(() => { setSaveSuccess(false); }, 1500);
    } catch (err) {
      setSaveError("Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  // ── Change password ──────────────────────────────────────────
  const handleChangePassword = async () => {
    setPwError(null);
    if (!currentPw || !newPw || !confirmPw) {
      setPwError("All password fields are required."); return;
    }
    if (newPw.length < 8) {
      setPwError("New password must be at least 8 characters."); return;
    }
    if (newPw !== confirmPw) {
      setPwError("New passwords don't match."); return;
    }
    setPwSaving(true);
    try {
      const res = await fetch(`/api/profile/${userId}/password`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const data = await res.json();
      if (!res.ok) { setPwError(data.error ?? "Failed to change password."); return; }
      setPwSuccess(true);
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
      setTimeout(() => setPwSuccess(false), 2000);
    } catch (err) {
      setPwError("Something went wrong.");
    } finally {
      setPwSaving(false);
    }
  };

  // ── Tags ─────────────────────────────────────────────────────
  const openTagsModal = () => { setTagsDraft([...interests]); setTagsOpen(true); };
  const toggleTag = (cat: string) => {
    setTagsDraft(prev => prev.includes(cat) ? prev.filter(t => t !== cat) : [...prev, cat]);
  };
  const handleSaveTags = async () => {
    setTagsSaving(true);
    try {
      await fetch(`/api/profile/${userId}/tags`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: tagsDraft }),
      });
      setInterests(tagsDraft);
      setTimeout(() => { setTagsOpen(false); setTagsSaving(false); }, 300);
    } catch (err) {
      console.error("Failed to save tags:", err);
      setTagsSaving(false);
    }
  };

  const filteredRequests = requests.filter((r) => r.mode === mode.toLowerCase());

  // ── Loading ──────────────────────────────────────────────────
  if (status === "loading" || loading) {
    return (
      <div className="profile-container">
        <div className="profile-ambientGlow" />
        <div className="profile-loading">
          <div className="profile-loading-ring" />
          <p className="profile-loading-text">Loading profile…</p>
        </div>
      </div>
    );
  }

  if (!user || !stats) {
    return (
      <div className="profile-container">
        <div className="profile-ambientGlow" />
        <div className="profile-loading">
          <p className="profile-loading-text">Could not load profile.</p>
          <button className="profile-empty-cta" onClick={() => router.refresh()}>Try again</button>
        </div>
      </div>
    );
  }

  const isLocalUser = user.provider === "local";

  return (
    <div className="profile-container pb-20">
      <div className="profile-ambientGlow" />

      {/* ── Edit Profile Modal ── */}
      {editing && (
        <div className="profile-modal-overlay" onClick={() => setEditing(false)}>
          <div className="profile-modal profile-modal--edit" onClick={e => e.stopPropagation()}>

            <div className="profile-modal-header">
              <p className="profile-modal-title">EDIT PROFILE</p>
              <button className="profile-modal-close" onClick={() => setEditing(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="profile-modal-divider" />

            {/* ── Avatar section ── */}
            <div className="profile-edit-avatar-section">
              <div className="profile-edit-avatar-preview">
                {(avatarPreview || user.avatar_url) ? (
                  <img
                    src={avatarPreview ?? user.avatar_url}
                    alt="avatar"
                    className="profile-edit-avatar-img"
                  />
                ) : (
                  <div className="profile-edit-avatar-placeholder">
                    {user.username?.[0]?.toUpperCase() ?? "?"}
                  </div>
                )}
                <button
                  className="profile-edit-avatar-btn"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera size={14} />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleAvatarChange}
                />
              </div>

              {avatarPreview && (
                <div className="profile-edit-avatar-actions">
                  <p className="profile-edit-avatar-hint">New photo selected</p>
                  <button
                    className={`profile-edit-avatar-save${avatarSaving ? " saving" : ""}`}
                    onClick={handleSaveAvatar}
                    disabled={avatarSaving}
                  >
                    {avatarSaving ? "Saving…" : "Save Photo"}
                  </button>
                </div>
              )}
            </div>

            <div className="profile-modal-divider" />

            {/* ── Username + Location ── */}
            <p className="profile-edit-section-label">PROFILE INFO</p>

            {saveError && <div className="profile-edit-error">{saveError}</div>}

            <div className="profile-modal-field">
              <label className="profile-modal-label">USERNAME</label>
              <input
                className="profile-modal-input"
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                placeholder="Your username"
              />
            </div>
            <div className="profile-modal-field">
              <label className="profile-modal-label">LOCATION</label>
              <input
                className="profile-modal-input"
                value={form.location}
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                placeholder="e.g. Istanbul, Turkey"
              />
            </div>
            <button
              className={`profile-modal-save${saving ? " saving" : ""}${saveSuccess ? " success" : ""}`}
              onClick={handleSaveEdit}
              disabled={saving || saveSuccess}
            >
              {saveSuccess ? <><Check size={15} /> Saved!</> : saving ? "Saving…" : "Save Info"}
            </button>

            {/* ── Password section — local users only ── */}
            {isLocalUser && (
              <>
                <div className="profile-modal-divider" style={{ margin: "20px 0" }} />
                <p className="profile-edit-section-label">CHANGE PASSWORD</p>

                {pwError   && <div className="profile-edit-error">{pwError}</div>}
                {pwSuccess && <div className="profile-edit-success"><Check size={13} /> Password updated!</div>}

                <div className="profile-modal-field">
                  <label className="profile-modal-label">CURRENT PASSWORD</label>
                  <div className="profile-pw-input-wrap">
                    <input
                      className="profile-modal-input"
                      type={showCurrentPw ? "text" : "password"}
                      placeholder="••••••••"
                      value={currentPw}
                      onChange={e => setCurrentPw(e.target.value)}
                    />
                    <button
                      className="profile-pw-toggle"
                      onClick={() => setShowCurrentPw(v => !v)}
                    >
                      {showCurrentPw ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div className="profile-modal-field">
                  <label className="profile-modal-label">NEW PASSWORD</label>
                  <div className="profile-pw-input-wrap">
                    <input
                      className="profile-modal-input"
                      type={showNewPw ? "text" : "password"}
                      placeholder="Min 8 characters"
                      value={newPw}
                      onChange={e => setNewPw(e.target.value)}
                    />
                    <button
                      className="profile-pw-toggle"
                      onClick={() => setShowNewPw(v => !v)}
                    >
                      {showNewPw ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div className="profile-modal-field">
                  <label className="profile-modal-label">CONFIRM NEW PASSWORD</label>
                  <input
                    className="profile-modal-input"
                    type="password"
                    placeholder="Repeat new password"
                    value={confirmPw}
                    onChange={e => setConfirmPw(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleChangePassword()}
                  />
                </div>

                <button
                  className={`profile-modal-save${pwSaving ? " saving" : ""}${pwSuccess ? " success" : ""}`}
                  onClick={handleChangePassword}
                  disabled={pwSaving || pwSuccess}
                >
                  {pwSuccess ? <><Check size={15} /> Updated!</> : pwSaving ? "Updating…" : "Change Password"}
                </button>
              </>
            )}

          </div>
        </div>
      )}

      {/* ── Interest Tags Modal ── */}
      {tagsOpen && (
        <div className="profile-modal-overlay" onClick={() => setTagsOpen(false)}>
          <div className="profile-modal profile-modal--tags" onClick={e => e.stopPropagation()}>
            <div className="profile-modal-header">
              <p className="profile-modal-title">INTEREST TAGS</p>
              <button className="profile-modal-close" onClick={() => setTagsOpen(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="profile-modal-divider" />
            <p className="profile-modal-hint">Select categories that match your interests</p>
            <div className="profile-tags-grid">
              {CATEGORIES.map(cat => {
                const active = tagsDraft.includes(cat);
                return (
                  <button
                    key={cat}
                    onClick={() => toggleTag(cat)}
                    className={`profile-tag-option${active ? " active" : ""}`}
                  >
                    {active && <Check size={11} strokeWidth={3} />}
                    {cat}
                  </button>
                );
              })}
            </div>
            <div className="profile-modal-divider" style={{ marginTop: 16, marginBottom: 16 }} />
            <div className="profile-tags-summary">
              {tagsDraft.length === 0
                ? <span className="profile-tags-none">No tags selected</span>
                : tagsDraft.map(t => (
                    <span key={t} className="profile-tag-chip">
                      {t}
                      <button onClick={() => toggleTag(t)} className="profile-tag-chip-remove">
                        <X size={10} />
                      </button>
                    </span>
                  ))
              }
            </div>
            <button
              className={`profile-modal-save${tagsSaving ? " saving" : ""}`}
              onClick={handleSaveTags}
              disabled={tagsSaving}
              style={{ marginTop: 16 }}
            >
              {tagsSaving ? "Saving…" : `Save Tags (${tagsDraft.length})`}
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="profile-header">
        <p className="profile-header-eyebrow">PROFILE</p>
        <h1 className="profile-header-title">
          Hey, <span className="profile-accent">{user.username}</span>
        </h1>
      </div>

      {/* Identity */}
      <div className="profile-identity">
        <div className="profile-avatar-wrapper">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt="avatar" className="profile-avatar profile-avatar--img" />
          ) : (
            <div className="profile-avatar">{user.username?.[0]?.toUpperCase() ?? "?"}</div>
          )}
          <div className="profile-avatar-ring" />
        </div>
        <div className="profile-identity-info">
          <h2 className="profile-name">{user.username}</h2>
          <div className="profile-location">
            <MapPin size={12} strokeWidth={2} />
            <span>{user.location || "Unknown"}</span>
          </div>
        </div>
        <button className="profile-edit-btn" onClick={openEditing}>
          <Edit2 size={14} />
        </button>
      </div>

      {/* Mode */}
      <div className="profile-section">
        <p className="profile-section-label">CURRENT MODE</p>
        <div className="profile-mode-toggle">
          <div className="profile-mode-slider" style={{ left: mode === "LOOKING" ? "3px" : "50%" }} />
          <button
            className={`profile-mode-btn${mode === "LOOKING" ? " active" : ""}`}
            onClick={async () => {
              setMode("LOOKING");
              await fetch(`/api/profile/${userId}/mode`, {
                method: "PATCH", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mode: "looking" }),
              });
            }}
          >I&apos;m Looking</button>
          <button
            className={`profile-mode-btn${mode === "OFFERING" ? " active" : ""}`}
            onClick={async () => {
              setMode("OFFERING");
              await fetch(`/api/profile/${userId}/mode`, {
                method: "PATCH", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mode: "offering" }),
              });
            }}
          >I&apos;m Offering</button>
        </div>
      </div>

      {/* Interest Tags */}
      <div className="profile-section">
        <p className="profile-section-label">INTEREST TAGS</p>
        <div className="profile-tags">
          {interests.length === 0
            ? <span className="profile-tags-empty">No tags yet</span>
            : interests.map((tag) => (
                <span key={tag} className="profile-tag">{tag}</span>
              ))
          }
          <button className="profile-tag-add" onClick={openTagsModal}>
            <Plus size={12} /> Add
          </button>
        </div>
      </div>

      {/* ── Tabs: My Intents / Saved ── */}
      <div className="profile-tabs">
        <button
          className={`profile-tab${activeTab === "intents" ? " active" : ""}`}
          onClick={() => setActiveTab("intents")}
        >
          My Intents
        </button>
        <button
          className={`profile-tab${activeTab === "bookmarks" ? " active" : ""}`}
          onClick={() => setActiveTab("bookmarks")}
        >
          <Bookmark size={13} />
          Saved
          {bookmarks.length > 0 && (
            <span className="profile-tab-badge">{bookmarks.length}</span>
          )}
        </button>
      </div>

      {/* ── My Intents tab ── */}
      {activeTab === "intents" && (
        <div className="profile-section">
          <div className="profile-section-header">
            <p className="profile-section-label">ACTIVE REQUESTS</p>
            <span className="profile-section-count">{filteredRequests.length}</span>
          </div>
          <div className="profile-requests">
            {filteredRequests.length === 0 ? (
              <div className="profile-empty">
                <p className="profile-empty-text">No active requests.</p>
                <button className="profile-empty-cta" onClick={() => router.push("/post")}>
                  Post an intent →
                </button>
              </div>
            ) : (
              filteredRequests.map((req, i) => (
                <div key={req.id} className="profile-request-card" style={{ animationDelay: `${i * 80}ms` }}>
                  <div className="profile-request-top">
                    <span className="profile-request-label">
                      {req.mode === "looking" ? "LOOKING FOR" : "OFFERING"} —
                    </span>
                    <span className={`profile-request-time${req.isUrgent ? " urgent" : ""}`}>
                      <Clock size={11} strokeWidth={2} />
                      {req.timeLeft}
                    </span>
                  </div>
                  <p className="profile-request-statement">{req.statement}</p>
                  <div className="profile-request-footer">
                    <span className="profile-request-category">{req.category}</span>
                    <div className="profile-request-responses">
                      <MessageCircle size={13} strokeWidth={2} />
                      <span>{req.responses} responses</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Saved / Bookmarks tab ── */}
      {activeTab === "bookmarks" && (
        <div className="profile-section">
          <div className="profile-requests">
            {bookmarks.length === 0 ? (
              <div className="profile-empty">
                <p className="profile-empty-text">No saved intents yet.</p>
                <button className="profile-empty-cta" onClick={() => router.push("/")}>
                  Browse the feed →
                </button>
              </div>
            ) : (
              bookmarks.map((bm, i) => (
                <div key={bm.id} className="profile-request-card" style={{ animationDelay: `${i * 80}ms` }}>
                  <div className="profile-request-top">
                    <span className="profile-request-label">
                      {bm.mode === "looking" ? "LOOKING FOR" : "OFFERING"} —
                    </span>
                    <span className="profile-request-label" style={{ color: "var(--muted)" }}>
                      {bm.username}
                    </span>
                  </div>
                  <p className="profile-request-statement">{bm.statement}</p>
                  <div className="profile-request-footer">
                    <span className="profile-request-category">
                      {Array.isArray(bm.category) ? bm.category[0] : bm.category}
                    </span>
                    <div className="profile-request-responses">
                      <MessageCircle size={13} strokeWidth={2} />
                      <span>{bm.response_count} responses</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="profile-stats">
        <div className="profile-stat">
          <span className="profile-stat-value">{stats.total_posts}</span>
          <span className="profile-stat-label">Total Posts</span>
        </div>
        <div className="profile-stat-divider" />
        <div className="profile-stat">
          <span className="profile-stat-value">{stats.total_responses}</span>
          <span className="profile-stat-label">Responses</span>
        </div>
        <div className="profile-stat-divider" />
        <div className="profile-stat">
          <span className="profile-stat-value">{stats.active_now}</span>
          <span className="profile-stat-label">Active Now</span>
        </div>
      </div>

      {/* Logout */}
      <div className="profile-logout-wrapper">
        <button className="profile-logout-btn" onClick={handleLogout}>Log Out</button>
      </div>

    </div>
  );
}