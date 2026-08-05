export default function SkeletonCard() {
  return (
    <div className="job-card skeleton-card" aria-hidden="true">
      <div className="job-card-top">
        <div className="job-card-identity">
          <span className="skeleton skeleton-circle" />
          <div style={{ flex: 1 }}>
            <span className="skeleton skeleton-line" style={{ width: "60%" }} />
            <span className="skeleton skeleton-line" style={{ width: "40%" }} />
          </div>
        </div>
        <span className="skeleton skeleton-pill" />
      </div>
      <span className="skeleton skeleton-line" style={{ width: "100%", height: 8, marginTop: 18 }} />
      <div className="job-card-actions">
        <span className="skeleton skeleton-pill" style={{ width: 64 }} />
        <span className="skeleton skeleton-pill" style={{ width: 64 }} />
      </div>
    </div>
  );
}
