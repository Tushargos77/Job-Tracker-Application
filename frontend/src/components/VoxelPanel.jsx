import { Component, lazy, Suspense, useEffect, useState } from "react";
import "./VoxelPanel.css";

// three.js is loaded on demand so the login form is interactive immediately.
const VoxelScene = lazy(() => import("./VoxelScene"));

/** If WebGL or the chunk fails to load, the card keeps its gradient and nothing crashes. */
class SceneBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error) {
    console.warn("Voxel scene failed to load:", error);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** Only mount the scene on screens wide enough to show this panel. */
function useMinWidth(px) {
  const query = `(min-width: ${px}px)`;
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [query]);
  return matches;
}

export default function VoxelPanel({ title, subtitle, points = [] }) {
  const [ready, setReady] = useState(false);
  const showScene = useMinWidth(901);

  useEffect(() => {
    if (!showScene) {
      console.info("VoxelPanel: hidden because the browser viewport is under 901px wide. Close docked DevTools or widen the window.");
    }
  }, [showScene]);

  return (
    <aside className="vp">
      <div className="vp-card">
        <div className={`vp-stage${ready ? " is-ready" : ""}`}>
          {showScene && (
            <SceneBoundary>
              <Suspense fallback={null}>
                <VoxelScene onReady={() => setReady(true)} />
              </Suspense>
            </SceneBoundary>
          )}
        </div>

        <div className="vp-shade" />

        <div className="vp-brand">
          <span className="vp-mark">JT</span>
          <span className="vp-name">Job Tracker</span>
        </div>

        <div className="vp-copy">
          <h2 className="vp-title">{title}</h2>
          {subtitle && <p className="vp-subtitle">{subtitle}</p>}
          {points.length > 0 && (
            <ul className="vp-points">
              {points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </aside>
  );
}
