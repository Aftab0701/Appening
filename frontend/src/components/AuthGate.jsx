import { useState, useEffect, useRef } from "react";
import {
  CalendarCheck, Mail, Lock, Eye, EyeOff,
  User as UserIcon, Loader2,
} from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import AuroraField from "../gl/aurora";

function looksLikeEmail(val) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
}

export default function AuthGate({ onSignedIn }) {
  const [mode, setMode] = useState("signin");
  const [fields, setFields] = useState({ name: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const canvasRef = useRef(null);
  const cardRef = useRef(null);
  const auroraRef = useRef(null);

  useEffect(() => {
    const gl = new AuroraField();
    auroraRef.current = gl;
    if (canvasRef.current) gl.mount(canvasRef.current);
    return () => gl.destroy();
  }, []);

  useGSAP(() => {
    if (!cardRef.current) return;
    gsap.from(cardRef.current, {
      y: 20,
      scale: 0.94,
      opacity: 0,
      duration: 0.55,
      ease: "power3.out",
    });
  }, { scope: cardRef });

  function patchField(key, val) {
    setFields((prev) => ({ ...prev, [key]: val }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const email = fields.email.trim().toLowerCase();

    if (mode === "signin") {
      if (!email || !fields.password) {
        setError("Enter your email and password to continue.");
        return;
      }
      const raw = localStorage.getItem(`sb_account:${email}`);
      if (!raw) {
        setError("No account found for that email. Create one below.");
        return;
      }
      const acct = JSON.parse(raw);
      if (acct.password !== fields.password) {
        setError("That password doesn't match. Try again.");
        return;
      }
      localStorage.setItem("sb_session", email);
      onSignedIn(acct);
    } else {
      if (!fields.name.trim() || !email || !fields.password) {
        setError("Fill in your name, email, and a password.");
        return;
      }
      if (!looksLikeEmail(email)) {
        setError("Enter a valid email address.");
        return;
      }
      if (fields.password.length < 6) {
        setError("Use at least 6 characters for your password.");
        return;
      }
      if (fields.password !== fields.confirm) {
        setError("Passwords don't match.");
        return;
      }
      if (localStorage.getItem(`sb_account:${email}`)) {
        setError("An account with that email already exists. Sign in instead.");
        return;
      }

      const acct = { name: fields.name.trim(), email, password: fields.password };
      localStorage.setItem(`sb_account:${email}`, JSON.stringify(acct));
      localStorage.setItem("sb_session", email);
      onSignedIn(acct);
    }
  }

  function handleDemo() {
    const demoEmail = "aftab@dev.local";
    const acct = { name: "Aftab", email: demoEmail, password: "demo" };
    localStorage.setItem(`sb_account:${demoEmail}`, JSON.stringify(acct));
    localStorage.setItem("sb_session", demoEmail);
    onSignedIn(acct);
  }

  const segIndex = mode === "signin" ? 0 : 1;

  return (
    <div className="sb-auth-wrap">
      <canvas ref={canvasRef} className="sb-auth-canvas" />

      <div className="sb-auth-card" ref={cardRef}>
        <div className="sb-auth-head">
          <div className="sb-mark sb-auth-mark">
            <CalendarCheck size={26} strokeWidth={2.25} />
          </div>
          <h1 className="sb-auth-title">Slate</h1>
          <p className="sb-auth-sub">
            {mode === "signin"
              ? "Sign in to your team's board."
              : "Create an account to get started."}
          </p>
        </div>

        <div
          className="sb-segment sb-auth-segment"
          role="tablist"
          aria-label="Sign in or create account"
        >
          <div
            className="sb-segment-pill"
            style={{ width: "50%", transform: `translateX(${segIndex * 100}%)` }}
          />
          <button
            type="button"
            className={mode === "signin" ? "active" : ""}
            onClick={() => { setMode("signin"); setError(""); }}
          >
            Sign in
          </button>
          <button
            type="button"
            className={mode === "signup" ? "active" : ""}
            onClick={() => { setMode("signup"); setError(""); }}
          >
            Create account
          </button>
        </div>

        {error && <div className="sb-auth-error">{error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          {mode === "signup" && (
            <div className="sb-field">
              <label htmlFor="sb-name">Name</label>
              <div className="sb-input-wrap">
                <UserIcon size={16} className="sb-lead-icon" />
                <input
                  id="sb-name"
                  type="text"
                  value={fields.name}
                  onChange={(e) => patchField("name", e.target.value)}
                  placeholder="Full name"
                  autoComplete="name"
                />
              </div>
            </div>
          )}

          <div className="sb-field">
            <label htmlFor="sb-email">Email</label>
            <div className="sb-input-wrap">
              <Mail size={16} className="sb-lead-icon" />
              <input
                id="sb-email"
                type="text"
                value={fields.email}
                onChange={(e) => patchField("email", e.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
              />
            </div>
          </div>

          <div className="sb-field">
            <label htmlFor="sb-password">Password</label>
            <div className="sb-input-wrap">
              <Lock size={16} className="sb-lead-icon" />
              <input
                id="sb-password"
                type={showPw ? "text" : "password"}
                value={fields.password}
                onChange={(e) => patchField("password", e.target.value)}
                placeholder={mode === "signup" ? "At least 6 characters" : "Password"}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
              />
              <button
                type="button"
                className="sb-eye-btn"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {mode === "signup" && (
            <div className="sb-field">
              <label htmlFor="sb-confirm">Confirm password</label>
              <div className="sb-input-wrap">
                <Lock size={16} className="sb-lead-icon" />
                <input
                  id="sb-confirm"
                  type={showPw ? "text" : "password"}
                  value={fields.confirm}
                  onChange={(e) => patchField("confirm", e.target.value)}
                  placeholder="Type it again"
                  autoComplete="new-password"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            className="sb-btn-primary"
            style={{ width: "100%", marginTop: 6 }}
            disabled={busy}
          >
            {busy && <Loader2 size={16} className="sb-spin" />}
            {busy
              ? (mode === "signin" ? "Signing in…" : "Creating account…")
              : (mode === "signin" ? "Sign in" : "Create account")
            }
          </button>
        </form>

        <div className="sb-auth-demo">
          <button className="sb-textlink" onClick={handleDemo} disabled={busy}>
            Continue as Aftab (Demo Account)
          </button>
        </div>

        <p className="sb-auth-footnote">
          Accounts are stored locally in your browser — this is a prototype, not a production login system.
        </p>
      </div>
    </div>
  );
}
