import { stageColor } from "../constants/status";

export default function StatusBadge({ status }) {
  const color = stageColor(status);
  return (
    <span
      className="status-badge"
      style={{
        color,
        background: `color-mix(in srgb, ${color} 16%, transparent)`,
        borderColor: `color-mix(in srgb, ${color} 40%, transparent)`,
      }}
    >
      <span className="status-dot" style={{ background: color }} />
      {status}
    </span>
  );
}
