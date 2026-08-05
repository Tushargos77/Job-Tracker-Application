// Single source of truth for the application pipeline.
// Order matters — it drives the PipelineRail and the Stats page.
export const STAGES = [
  { key: "Applied", label: "Applied", color: "var(--stage-applied)" },
  { key: "OA", label: "OA", color: "var(--stage-oa)" },
  { key: "Interview", label: "Interview", color: "var(--stage-interview)" },
  { key: "HR", label: "HR", color: "var(--stage-hr)" },
  { key: "Offer", label: "Offer", color: "var(--stage-offer)" },
];

export const REJECTED = { key: "Rejected", label: "Rejected", color: "var(--stage-rejected)" };

export const ALL_STATUSES = [...STAGES, REJECTED];

export function stageColor(status) {
  return ALL_STATUSES.find((s) => s.key === status)?.color || "var(--ink-faint)";
}

export function stageIndex(status) {
  return STAGES.findIndex((s) => s.key === status);
}
