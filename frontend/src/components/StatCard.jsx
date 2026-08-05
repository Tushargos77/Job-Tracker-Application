export default function StatCard({ label, value, color }) {
  return (
    <div className="stat-card">
      <span className="stat-value" style={color ? { color } : undefined}>
        {value}
      </span>
      <span className="stat-label">{label}</span>
    </div>
  );
}
