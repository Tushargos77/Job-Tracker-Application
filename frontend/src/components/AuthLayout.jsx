import VoxelPanel from "./VoxelPanel";

const POINTS = [
  "Track every application in one pipeline",
  "See your progress at a glance",
  "Never lose track of a follow-up",
];

const visualSlotStyle = { background: "none", padding: 0, display: "block" };

export default function AuthLayout({ title, tagline, children }) {
  return (
    <div className="auth-shell">
      <aside className="auth-visual" style={visualSlotStyle}>
        <VoxelPanel title={title} subtitle={tagline} points={POINTS} />
      </aside>
      <main className="auth-form-side">
        <div className="auth-form-card">{children}</div>
      </main>
    </div>
  );
}
