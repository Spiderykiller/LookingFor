"use client";

import "./categoryfilter.css";
import { useIntentStore } from "@/store/useIntentstore";

const categories = [
  "All",
  "Work",
  "Creative",
  "Business",
  "Social",
  "Events",
  "Tech",
  "Study",
  "Health",
  "Fitness",
  "Collab",
  "Arts",
  "Music",
  "Gaming",
  "Housing",
  "Community",
];

export default function CategoryFilter() {
  const { category, setCategory } = useIntentStore();

  return (
    <div className="catfilter-wrapper">
      <div className="catfilter-scroll no-scrollbar">
        {categories.map((cat, i) => {
          const isActive =
            (cat === "All" && category === null) || category === cat;

          return (
            <button
              key={cat}
              onClick={() => setCategory(cat === "All" ? null : cat)}
              className={`catfilter-btn${isActive ? " active" : ""}`}
              style={{ animationDelay: `${i * 30}ms` }}
            >
              {isActive && <span className="catfilter-active-dot" />}
              {cat}
            </button>
          );
        })}
      </div>

      {/* Fade-out edges */}
      <div className="catfilter-fade-left"  />
      <div className="catfilter-fade-right" />
    </div>
  );
}