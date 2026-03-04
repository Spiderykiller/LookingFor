"use client";

import "./login.css";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { Globe } from "lucide-react";
import { useRouter } from "next/navigation";
import { FcGoogle } from "react-icons/fc";

export default function LoginPage() {
  const router = useRouter();

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const handleCredentials = async () => {
    setError(null);

    // Client-side validation
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);

    try {
      // Step 1 — validate credentials via our own API (gives us real errors)
      const check = await fetch("/api/login", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email, password }),
      });

      const data = await check.json();

      if (!check.ok) {
        setError(data.error ?? "Login failed. Please try again.");
        setLoading(false);
        return;
      }

      // Step 2 — credentials are valid, now create the session
      await signIn("credentials", {
        email,
        password,
        callbackUrl: "/",
      });

      // signIn with callbackUrl will redirect automatically on success

    } catch (err) {
      console.error("Login error:", err);
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="login-container">

      <div className="login-glow" />

      <div className="login-card">

        {/* Logo */}
        <div className="login-logo">
          <span className="login-logo-text">Looking</span>
          <span className="login-logo-accent">For.</span>
          <span className="login-logo-dot" />
        </div>

        <p className="login-tagline">Declare your intent. Find your people.</p>

        <div className="login-divider-line" />

        {/* Error banner */}
        {error && (
          <div className="login-error">
            {error}
            {error.includes("sign up") && (
              <span>{" "}<a href="/signup" className="login-error-link">Sign up here</a></span>
            )}
          </div>
        )}

        {/* Email */}
        <div className="login-field">
          <label className="login-label">EMAIL</label>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => { setEmail(e.target.value); setError(null); }}
            className={`login-input${error && !email.trim() ? " input-error" : ""}`}
          />
        </div>

        {/* Password */}
        <div className="login-field">
          <label className="login-label">PASSWORD</label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(null); }}
            className={`login-input${error && !password ? " input-error" : ""}`}
            onKeyDown={e => e.key === "Enter" && handleCredentials()}
          />
        </div>

        <button
          onClick={handleCredentials}
          disabled={loading}
          className={`login-btn-primary${loading ? " loading" : ""}`}
        >
          {loading ? "Signing in…" : "Login"}
        </button>

        <div className="login-or">
          <span className="login-or-line" />
          <span className="login-or-text">or</span>
          <span className="login-or-line" />
        </div>

        <button
          onClick={() => signIn("google", { callbackUrl: "/" })}
          className="login-btn-google"
        >
          <FcGoogle size={20} />
          Sign in with Google
        </button>

        <p className="login-signup-text">
          Don&apos;t have an account?{" "}
          <a href="/signup" className="login-signup-link">Sign Up</a>
        </p>

      </div>
    </div>
  );
}