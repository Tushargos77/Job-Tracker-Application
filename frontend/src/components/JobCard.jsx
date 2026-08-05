import { Pencil, Trash2, Building2 } from "lucide-react";
import StatusBadge from "./StatusBadge";
import PipelineRail from "./PipelineRail";

export default function JobCard({ job, onEdit, onDelete }) {
  return (
    <div className="job-card">
      <div className="job-card-top">
        <div className="job-card-identity">
          <span className="job-card-icon">
            <Building2 size={16} strokeWidth={2} />
          </span>
          <div>
            <h3>{job.company}</h3>
            <p className="job-role">{job.role}</p>
          </div>
        </div>
        <StatusBadge status={job.status} />
      </div>

      <PipelineRail status={job.status} />

      <div className="job-card-actions">
        <button className="btn-ghost" onClick={() => onEdit(job)}>
          <Pencil size={14} /> Edit
        </button>
        <button className="btn-ghost btn-ghost-danger" onClick={() => onDelete(job)}>
          <Trash2 size={14} /> Delete
        </button>
      </div>
    </div>
  );
}
