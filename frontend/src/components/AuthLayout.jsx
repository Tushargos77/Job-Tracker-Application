
export default function AuthLayout({
  eyebrow,
  title,
  tagline,
  children,
}) {
  return (
    <main className="auth-shell">
      {/* Left-side visual section */}
      <section className="auth-visual">
        <div className="auth-visual-content">
          <p className="auth-eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
          <p>{tagline}</p>
        </div>
      </section>

      {/* Login / signup section */}
      <section className="auth-form-side">
        <div className="auth-form-card">
          {children}
        </div>
      </section>
    </main>
  );
}
