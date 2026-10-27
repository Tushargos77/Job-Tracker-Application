import { useEffect, useState } from "react";
import VoxelPanel from "./VoxelPanel";
import AuthVisual from "./AuthVisual";

const POINTS = [
  "Track every application in one pipeline",
  "See your progress at a glance",
  "Never lose track of a follow-up",
];

const desktopSlot = { background: "none", padding: 0, display: "block" };
const mobileSlot = {
  position: "relative",
  display: "block",
  padding: "24px 20px",
  minHeight: 200,
  background: "linear-gradient(135deg, #2f9e7a, #a8a46a)",
  color: "#fff",
};

function useIsMobile(query = "(max-width: 768px)") {
  const [isMobile, setIsMobile] = useState(
    () => window.matchMedia(query).matches
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = (e) => setIsMobile(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);
  return isMobile;
}

export default function AuthLayout({ title, tagline, children }) {
  const isMobile = useIsMobile();

  return (
    <div className="auth-shell">
      <aside
        className="auth-visual"
        style={isMobile ? mobileSlot : desktopSlot}
      >
        {isMobile ? (
          <>
            <AuthVisual />
            <div style={{ position: "relative", zIndex: 1 }}>
              <h2 style={{ margin: 0 }}>{title}</h2>
              <p style={{ margin: "6px 0 0" }}>{tagline}</p>
            </div>
          </>
        ) : (
          <VoxelPanel title={title} subtitle={tagline} points={POINTS} />
        )}
      </aside>
      <main className="auth-form-side">
        <div className="auth-form-card">{children}</div>
      </main>
    </div>
  );
}
