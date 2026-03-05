"use client";

import "./signup.css";
import { useState } from "react";
import { useRouter } from "next/navigation";

const ALLOWED_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "yahoo.co.uk",
  "yahoo.co.in",
  "ymail.com",
  "outlook.com",
  "outlook.co.uk",
  "hotmail.com",
  "hotmail.co.uk",
  "live.com",
  "msn.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "protonmail.com",
  "proton.me",
  "pm.me",
];

function validateEmail(email: string): string | null {
  const trimmed = email.trim().toLowerCase();

  // Basic format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return "Please enter a valid email address.";
  }

  const domain = trimmed.split("@")[1];

  if (!ALLOWED_DOMAINS.includes(domain)) {
    return `"${domain}" is not a supported email provider. Please use Gmail, Yahoo, Outlook, Hotmail, iCloud, or ProtonMail.`;
  }

  return null; // valid
}

export default function SignupPage() {
  const router = useRouter();
  const [email,    setEmail]    = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const handleSignup = async () => {
    if (!email || !username || !password) {
      setError("Please fill in all fields.");
      return;
    }

    // ── Email provider validation ────────────────────────────
    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/signup", {
        method:  "POST",
        body:    JSON.stringify({ email, username, password }),
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Signup failed. Please try again.");
        setLoading(false);
        return;
      }

      router.push("/login");

    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="signup-container">

      <div className="signup-glow" />

      <div className="signup-card">

        {/* Logo */}
        <div className="signup-logo">
          <span className="signup-logo-text">Looking</span>
          <span className="signup-logo-accent">For.</span>
          <span className="signup-logo-dot" />
        </div>

        <p className="signup-tagline">Join the city. Declare your intent.</p>

        <div className="signup-divider-line" />

        <p className="signup-step-label">CREATE YOUR ACCOUNT</p>

        {/* Error banner */}
        {error && <div className="signup-error">{error}</div>}

        {/* Username */}
        <div className="signup-field">
          <label className="signup-label">USERNAME</label>
          <input
            type="text"
            placeholder="how others will see you"
            value={username}
            onChange={e => { setUsername(e.target.value); setError(null); }}
            className="signup-input"
          />
        </div>

        {/* Email */}
        <div className="signup-field">
          <label className="signup-label">EMAIL</label>
          <input
            type="email"
            placeholder="you@gmail.com"
            value={email}
            onChange={e => { setEmail(e.target.value); setError(null); }}
            className={`signup-input${error && error.includes("provider") ? " input-error" : ""}`}
          />
          <p className="signup-field-hint">
            Use Gmail, Yahoo, Outlook, iCloud, or ProtonMail
          </p>
        </div>

        {/* Password */}
        <div className="signup-field">
          <label className="signup-label">PASSWORD</label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(null); }}
            className="signup-input"
            onKeyDown={e => e.key === "Enter" && handleSignup()}
          />
        </div>

        <button
          onClick={handleSignup}
          disabled={loading}
          className={`signup-btn-primary${loading ? " loading" : ""}`}
        >
          {loading ? "Creating account…" : "Sign Up →"}
        </button>

        <p className="signup-login-text">
          Already have an account?{" "}
          <a href="/login" className="signup-login-link">Login</a>
        </p>

      </div>
    </div>
  );
}