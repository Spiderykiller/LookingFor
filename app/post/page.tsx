"use client";

import "./post.css";
import { useState, useRef, useEffect } from "react";
import { Check } from "lucide-react";

const CATEGORIES = [
  { label: "Work",      icon: "💼" },
  { label: "Creative",  icon: "🎨" },
  { label: "Business",  icon: "📈" },
  { label: "Social",    icon: "🤝" },
  { label: "Events",    icon: "🎉" },
  { label: "Tech",      icon: "💻" },
  { label: "Study",     icon: "📚" },
  { label: "Health",    icon: "🏥" },
  { label: "Fitness",   icon: "🏋️" },
  { label: "Collab",    icon: "🫱🏽‍🫲🏾" },
  { label: "Arts",      icon: "🖼️" },
  { label: "Music",     icon: "🎵" },
  { label: "Gaming",    icon: "🎮" },
  { label: "Housing",   icon: "🏠" },
  { label: "Community", icon: "🌍" },
];

const DURATION_OPTIONS = [
  { label: "1 Hour",   value: 1   },
  { label: "6 Hours",  value: 6   },
  { label: "24 Hours", value: 24  },
  { label: "48 Hours", value: 48  },
  { label: "7 Days",   value: 168 },
];

type Mode = "looking" | "offering";

export default function PostPage() {
  const [mode,               setMode]               = useState<Mode>("looking");
  const [statement,          setStatement]          = useState<string>("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);  // ← now array
  const [tags,               setTags]               = useState<string[]>([]);
  const [tagInput,           setTagInput]           = useState<string>("");
  const [duration,           setDuration]           = useState<number>(48);
  const [location,           setLocation]           = useState<string>("");
  const [submitted,          setSubmitted]          = useState<boolean>(false);
  const [animating,          setAnimating]          = useState<boolean>(false);
  const [error,              setError]              = useState<string | null>(null);
  const [charCount,          setCharCount]          = useState<number>(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const MAX_CHARS   = 200;

  useEffect(() => { setCharCount(statement.length); }, [statement]);

  const circumference = 2 * Math.PI * 16;
  const dashOffset    = circumference - (charCount / MAX_CHARS) * circumference;
  const isNearLimit   = charCount > MAX_CHARS * 0.9;
  const isReady       = statement.trim().length > 0 && selectedCategories.length > 0 && !animating;

  const selectedDurationLabel = DURATION_OPTIONS.find((d) => d.value === duration)?.label;

  // ── Toggle a category on/off ─────────────────────────────────
  const toggleCategory = (label: string) => {
    setSelectedCategories(prev =>
      prev.includes(label)
        ? prev.filter(c => c !== label)
        : [...prev, label]
    );
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim().replace(/,$/, "");
      if (newTag && !tags.includes(newTag) && tags.length < 5) {
        setTags([...tags, newTag]);
      }
      setTagInput("");
    }
    if (e.key === "Backspace" && !tagInput && tags.length > 0) {
      setTags(tags.slice(0, -1));
    }
  };

  const removeTag = (tag: string) => setTags(tags.filter((t) => t !== tag));

  const handleSubmit = async () => {
    if (!statement.trim() || selectedCategories.length === 0 || animating) return;

    setAnimating(true);
    setError(null);

    try {
      const res = await fetch("/api/intents", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          statement,
          category: selectedCategories,   // ← send array
          tags,
          duration,
          location,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to post intent");
        return;
      }

      setSubmitted(true);
    } catch (err) {
      console.error("Submission failed:", err);
      setError("Network error — please try again");
    } finally {
      setAnimating(false);
    }
  };

  const resetForm = () => {
    setSubmitted(false);
    setStatement("");
    setSelectedCategories([]);
    setTags([]);
    setTagInput("");
    setDuration(48);
    setLocation("");
    setError(null);
  };

  /* ── Success screen ─────────────────────────────────────── */
  if (submitted) {
    return (
      <div className="successOverlay">
        <div className="successCard">
          <div className="successRing">
            <span className="successEmoji">✓</span>
          </div>
          <h2 className="successTitle">Intent Posted</h2>
          <p className="successSub">
            Your intent is live for{" "}
            <span className="accentText">{selectedDurationLabel}</span>
          </p>
          <div className="successMeta">
            {selectedCategories.map(cat => (
              <span key={cat} className="metaBadge">{cat}</span>
            ))}
            <span className="metaBadge">
              {mode === "looking" ? "Looking" : "Offering"}
            </span>
            {location && <span className="metaBadge">📍 {location}</span>}
          </div>
          <button className="newPostBtn" onClick={resetForm}>
            Post Another Intent
          </button>
        </div>
      </div>
    );
  }

  /* ── Main form ──────────────────────────────────────────── */
  return (
    <div className="postContainer pb-20">
      <div className="ambientGlow" />

      {/* Page header */}
      <div className="pageHeader">
        <p className="headerEyebrow">DECLARE YOUR INTENT</p>
        <h1 className="headerTitle">
          What are you{" "}
          <span className="accentText">
            {mode === "looking" ? "looking for" : "offering"}
          </span>
          ?
        </h1>
      </div>

      <div className="postCard">

        {/* Mode Toggle */}
        <div className="modeToggleWrapper">
          <div className="modeToggle">
            <div
              className="modeSlider"
              style={{ left: mode === "looking" ? "3px" : "50%" }}
            />
            <button
              className={`modeBtn${mode === "looking" ? " modeBtnActive" : ""}`}
              onClick={() => setMode("looking")}
            >
              I&apos;m Looking
            </button>
            <button
              className={`modeBtn${mode === "offering" ? " modeBtnActive" : ""}`}
              onClick={() => setMode("offering")}
            >
              I&apos;m Offering
            </button>
          </div>
        </div>

        {/* Intent label */}
        <p className="intentLabel">
          {mode === "looking" ? "LOOKING FOR" : "OFFERING"} —
        </p>

        {/* Textarea */}
        <div className="textareaWrapper">
          <textarea
            ref={textareaRef}
            className="intentTextarea"
            placeholder={
              mode === "looking"
                ? "a drummer for weekend jam sessions..."
                : "React development skills for your startup..."
            }
            value={statement}
            maxLength={MAX_CHARS}
            onChange={(e) => setStatement(e.target.value)}
            rows={4}
          />
          <div className="charCounter">
            <svg width="40" height="40" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="20" cy="20" r="16" fill="none" stroke="#2a2a2a" strokeWidth="3" />
              <circle
                cx="20" cy="20" r="16"
                fill="none"
                stroke={isNearLimit ? "#ef4444" : "var(--accent)"}
                strokeWidth="3"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 0.2s ease" }}
              />
            </svg>
            <span className="charNumber">{MAX_CHARS - charCount}</span>
          </div>
        </div>

        {/* Category — multi-select */}
        <div className="sectionBlock">
          <div className="sectionTitleRow">
            <p className="sectionTitle">CATEGORY</p>
            {selectedCategories.length > 0 && (
              <span className="sectionCount">{selectedCategories.length} selected</span>
            )}
          </div>
          <div className="categoryGrid">
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategories.includes(cat.label);
              return (
                <button
                  key={cat.label}
                  onClick={() => toggleCategory(cat.label)}
                  className={`categoryBtn${isActive ? " active" : ""}`}
                >
                  {isActive && (
                    <span className="categoryCheck"><Check size={10} strokeWidth={3} /></span>
                  )}
                  <span className="catIcon">{cat.icon}</span>
                  {cat.label}
                </button>
              );
            })}
          </div>
          {selectedCategories.length === 0 && (
            <p className="categoryHint">Select at least one category</p>
          )}
        </div>

        {/* Duration */}
        <div className="sectionBlock">
          <p className="sectionTitle">DURATION</p>
          <div className="durationRow">
            {DURATION_OPTIONS.map((d) => (
              <button
                key={d.value}
                onClick={() => setDuration(d.value)}
                className={`durationBtn${duration === d.value ? " active" : ""}`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Location */}
        <div className="sectionBlock">
          <p className="sectionTitle">LOCATION (OPTIONAL)</p>
          <div className="locationWrapper">
            <span className="locationPin">📍</span>
            <input
              type="text"
              placeholder="Addis Ababa, Ethiopia..."
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="locationInput"
            />
          </div>
        </div>

        {/* Tags */}
        <div className="sectionBlock">
          <p className="sectionTitle">CUSTOM TAGS (OPTIONAL)</p>
          <div className="tagInputWrapper">
            {tags.map((tag) => (
              <span key={tag} className="tag">
                #{tag}
                <button className="tagRemove" onClick={() => removeTag(tag)}>×</button>
              </span>
            ))}
            {tags.length < 5 && (
              <input
                type="text"
                placeholder={tags.length === 0 ? "e.g. Drums, Weekend" : "Add tag..."}
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                className="tagInput"
              />
            )}
          </div>
          <p className="tagHint">Press Enter or comma to add · Max 5 tags</p>
        </div>

        {/* Error */}
        {error && <div className="errorBanner">⚠️ {error}</div>}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!isReady}
          className={`submitBtn${!isReady ? " submitDisabled" : ""}`}
          style={{ transform: animating ? "scale(0.97)" : "scale(1)" }}
        >
          {animating ? "Posting..." : `Post for ${selectedDurationLabel} →`}
        </button>

      </div>
    </div>
  );
}