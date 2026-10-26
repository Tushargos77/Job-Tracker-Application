import { Link } from "react-router-dom";

export default function AuthLayout({ eyebrow, title, tagline, children }) {
  return (
    <div className="auth-shell">
      <aside className="auth-visual">
        <div className="auth-visual-blob auth-visual-blob-1" />
        <div className="auth-visual-blob auth-visual-blob-2" />
        <div className="auth-visual-content">
          <Link to="/" className="auth-visual-brand">
            <span className="auth-visual-brand-mark">JT</span>
            Job Tracker
          </Link>
          <div className="auth-visual-copy">
            <p className="auth-visual-eyebrow">{eyebrow}</p>
            <h2>{title}</h2>
            <p className="auth-visual-tagline">{tagline}</p>
          </div>
          <ul className="auth-visual-points">
            <li>Track every application in one pipeline</li>
            <li>See your progress at a glance</li>
            <li>Never lose track of a follow-up</li>
          </ul>
        </div>
      </aside>
      <main className="auth-form-side">
        <div className="auth-form-card">{children}</div>
      </main>
    </div>
  );
}