import { useEffect, useState } from "react";
import VoxelPanel from "./VoxelPanel";
import AuthVisual from "./AuthVisual";

const POINTS = [
  "Track every application in one pipeline",
  "See your progress at a glance",
  "Never lose track of a follow-up",
];

const visualSlotStyle = { background: "none", padding: 0, display: "block" };

function useIsMobile(query = "(max-width: 860px)") {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false
  );

  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = (e) => setIsMobile(e.matches);

    setIsMobile(mq.matches);

    if (mq.addEventListener) {
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    }
    // older Safari
    mq.addListener(onChange);
    return () => mq.removeListener(onChange);
  }, [query]);

  return isMobile;
}

export default function AuthLayout({ title, tagline, children }) {
  const isMobile = useIsMobile();

  return (
    <div className="auth-shell">
      {isMobile ? (
        <aside className="auth-visual">
          <AuthVisual />
          <div className="auth-visual-content">
            <div className="auth-visual-copy">
              <h2>{title}</h2>
              <p className="auth-visual-tagline">{tagline}</p>
            </div>
          </div>
        </aside>
      ) : (
        <aside className="auth-visual" style={visualSlotStyle}>
          <VoxelPanel title={title} subtitle={tagline} points={POINTS} />
        </aside>
      )}
      <main className="auth-form-side">
        <div className="auth-form-card">{children}</div>
      </main>
    </div>
  );
}
