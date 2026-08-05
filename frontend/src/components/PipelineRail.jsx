import { STAGES, stageIndex } from "../constants/status";

// Encodes how far an application has progressed through the pipeline —
// a dotted rail rather than a flat badge, since order/progress is real information here.
export default function PipelineRail({ status }) {
  if (status === "Rejected") {
    return (
      <div className="rail rail-rejected">
        <span className="rail-rejected-label">Rejected</span>
      </div>
    );
  }

  const current = stageIndex(status);

  return (
    <div className="rail" aria-label={`Pipeline stage: ${status}`}>
      {STAGES.map((s, i) => (
        <span
          key={s.key}
          className={`rail-dot ${i <= current ? "rail-dot-filled" : ""} ${
            i === current ? "rail-dot-current" : ""
          }`}
          style={i <= current ? { background: s.color } : undefined}
          title={s.label}
        />
      ))}
    </div>
  );
}
