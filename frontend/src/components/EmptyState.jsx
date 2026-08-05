import { Inbox, SearchX } from "lucide-react";

export default function EmptyState({ filtered, onAddJob }) {
  if (filtered) {
    return (
      <div className="empty-state">
        <SearchX size={28} strokeWidth={1.5} />
        <p>No applications match your search or filters.</p>
      </div>
    );
  }

  return (
    <div className="empty-state">
      <Inbox size={28} strokeWidth={1.5} />
      <p>No applications yet.</p>
      <button className="btn-accent" onClick={onAddJob}>
        + Add your first job
      </button>
    </div>
  );
}
