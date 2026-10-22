import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Briefcase } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Shared form for the Login and Signup pages.
export default function AuthForm({ mode }) {
  const isSignup = mode === "signup";
  const { isAuthenticated, login, signup } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from?.pathname || "/";

  const [form, setForm] = useState({ email: "", password: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [busy, setBusy] = useState(false);

  if (isAuthenticated) return <Navigate to={redirectTo} replace />;

  const validate = () => {
    const next = {};
    if (!form.email.trim()) next.email = "Email is required.";
    else if (!EMAIL_RE.test(form.email.trim())) next.email = "Enter a valid email address.";

    if (!form.password) next.password = "Password is required.";
    else if (isSignup && form.password.length < 8) next.password = "Use at least 8 characters.";
    else if (isSignup && new TextEncoder().encode(form.password).length > 72)
      next.password = "Password is too long (72 bytes max).";

    if (isSignup && form.confirm !== form.password) next.confirm = "Passwords don't match.";

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");
    if (!validate()) return;

    setBusy(true);
    try {
      const email = form.email.trim();
      if (isSignup) await signup(email, form.password);
      else await login(email, form.password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="sidebar-brand-mark">
            <Briefcase size={18} strokeWidth={2.2} />
          </span>
          <span>Job Tracker</span>
        </div>

        <h1>{isSignup ? "Create your account" : "Welcome back"}</h1>
        <p className="page-subtitle">
          {isSignup ? "Start tracking every application in one place." : "Log in to see your applications."}
        </p>

        <form onSubmit={handleSubmit} className="modal-form auth-form" noValidate>
          {submitError && (
            <div className="error-banner" role="alert">
              <p>{submitError}</p>
            </div>
          )}

          <label className="field">
            <span>Email</span>
            <input
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={update("email")}
              className={errors.email ? "input-error" : ""}
              autoFocus
            />
            {errors.email && <span className="field-error">{errors.email}</span>}
          </label>

          <label className="field">
            <span>Password</span>
            <input
              type="password"
              autoComplete={isSignup ? "new-password" : "current-password"}
              placeholder={isSignup ? "At least 8 characters" : "Your password"}
              value={form.password}
              onChange={update("password")}
              className={errors.password ? "input-error" : ""}
            />
            {errors.password && <span className="field-error">{errors.password}</span>}
          </label>

          {isSignup && (
            <label className="field">
              <span>Confirm password</span>
              <input
                type="password"
                autoComplete="new-password"
                placeholder="Repeat your password"
                value={form.confirm}
                onChange={update("confirm")}
                className={errors.confirm ? "input-error" : ""}
              />
              {errors.confirm && <span className="field-error">{errors.confirm}</span>}
            </label>
          )}

          <button type="submit" className="btn-accent auth-submit" disabled={busy}>
            {busy ? (isSignup ? "Creating account…" : "Logging in…") : isSignup ? "Sign up" : "Log in"}
          </button>
        </form>

        <p className="auth-switch">
          {isSignup ? (
            <>
              Already have an account? <Link to="/login">Log in</Link>
            </>
          ) : (
            <>
              New here? <Link to="/signup">Create an account</Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
