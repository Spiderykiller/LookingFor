"use client";

import "./roletoggle.css";
import { useIntentStore } from "@/store/useIntentstore";

export default function RoleToggle() {
  const { mode, setMode } = useIntentStore();

  return (
    <div className="roletoggle-wrapper">
      <div className="roletoggle">

        {/* Sliding fill */}
        <div
          className="roletoggle-slider"
          style={{ left: mode === "LOOKING" ? "3px" : "calc(50%)" }}
        />

        <button
          onClick={() => setMode("LOOKING")}
          className={`roletoggle-btn${mode === "LOOKING" ? " active" : ""}`}
        >
          <span className="roletoggle-icon">{mode === "LOOKING" ? "🔍" : "👀"}</span>
          I&apos;m Looking
        </button>

        <button
          onClick={() => setMode("OFFERING")}
          className={`roletoggle-btn${mode === "OFFERING" ? " active" : ""}`}
        >
          <span className="roletoggle-icon">{mode === "OFFERING" ? "✋" : "🤲"}</span>
          I&apos;m Offering
        </button>

      </div>

      {/* Mode descriptor */}
      <p className="roletoggle-desc">
        {mode === "LOOKING"
          ? "Browse what others are looking for"
          : "Browse what others are offering"}
      </p>
    </div>
  );
}