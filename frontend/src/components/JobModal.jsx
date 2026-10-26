import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { ALL_STATUSES } from "../constants/status";

const EMPTY = { company: "", role: "", status: "Applied", interview_at: "" };

// Convert an ISO datetime string (from the backend) into the
// "YYYY-MM-DDTHH:mm" format a <input type="datetime-local"> expects.
const toLocalInputValue = (isoString) => {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function JobModal({ open, initial, onClose, onSubmit, busy }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      setForm(
        initial
          ? {
              company: initial.company,
              role: initial.role,
              status: initial.status,
              interview_at: toLocalInputValue(initial.interview_at),
            }
          : EMPTY
      );
      setErrors({});
    }
  }, [open, initial]);

  if (!open) return null;

  const isEdit = Boolean(initial);

  const validate = () => {
    const next = {};
    if (!form.company.trim()) next.company = "Company is required.";
    if (!form.role.trim()) next.role = "Role is required.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      company: form.company.trim(),
      role: form.role.trim(),
      status: form.status,
      // datetime-local gives "2026-08-20T14:30" with no timezone — treat it
      // as the browser's local time and convert to a full ISO string.
      interview_at: form.interview_at ? new Date(form.interview_at).toISOString() : null,
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="job-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 id="job-modal-title">{isEdit ? "Edit Application" : "Add Application"}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form" noValidate>
          <label className="field">
            <span>Company</span>
            <input
              type="text"
              placeholder="e.g. Google"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              className={errors.company ? "input-error" : ""}
              autoFocus
            />
            {errors.company && <span className="field-error">{errors.company}</span>}
          </label>

          <label className="field">
            <span>Role</span>
            <input
              type="text"
              placeholder="e.g. Software Engineer Intern"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className={errors.role ? "input-error" : ""}
            />
            {errors.role && <span className="field-error">{errors.role}</span>}
          </label>

          <label className="field">
            <span>Status</span>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              {ALL_STATUSES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Interview date &amp; time (optional)</span>
            <input
              type="datetime-local"
              value={form.interview_at}
              onChange={(e) => setForm({ ...form, interview_at: e.target.value })}
            />
          </label>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="btn-accent" disabled={busy}>
              {busy ? "Saving…" : isEdit ? "Save changes" : "Add job"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}