import { useEffect, useRef, useState } from "react";
import { jobsApi } from "../api/client";
import { useToast } from "../context/ToastContext";
import { ALL_STATUSES } from "../constants/status";
import ConfirmDialog from "../components/ConfirmDialog";

const VALID_STATUS_KEYS = ALL_STATUSES.map((s) => s.key);

export default function Settings({ theme, onToggleTheme }) {
  const toast = useToast();
  const fileInputRef = useRef(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [importing, setImporting] = useState(false);

  const loadJobs = () => {
    setLoading(true);
    jobsApi
      .list()
      .then(setJobs)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const downloadBlob = (content, filename, type) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const exportJSON = () => {
    if (jobs.length === 0) {
      toast.error("No applications to export.");
      return;
    }
    downloadBlob(JSON.stringify(jobs, null, 2), "job-applications.json", "application/json");
    toast.success("Exported as JSON.");
  };

  const exportCSV = () => {
    if (jobs.length === 0) {
      toast.error("No applications to export.");
      return;
    }
    const headers = ["id", "company", "role", "status"];
    const rows = jobs.map((j) =>
      headers
        .map((h) => {
          const val = String(j[h] ?? "");
          return /[",\n]/.test(val) ? `"${val.replace(/"/g, '""')}"` : val;
        })
        .join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    downloadBlob(csv, "job-applications.csv", "text/csv");
    toast.success("Exported as CSV.");
  };

  const handleClearAll = async () => {
    setClearing(true);
    try {
      await Promise.all(jobs.map((j) => jobsApi.remove(j.id)));
      setJobs([]);
      toast.success("All applications cleared.");
      setConfirmClearOpen(false);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setClearing(false);
    }
  };

  const normalizeStatus = (raw) => {
    const s = String(raw || "").trim();
    const match = VALID_STATUS_KEYS.find((k) => k.toLowerCase() === s.toLowerCase());
    return match || "Applied";
  };

  const parseCSV = (text) => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
    if (lines.length < 2) return [];

    const parseLine = (line) => {
      const cells = [];
      let cur = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (inQuotes) {
          if (ch === '"' && line[i + 1] === '"') {
            cur += '"';
            i++;
          } else if (ch === '"') {
            inQuotes = false;
          } else {
            cur += ch;
          }
        } else {
          if (ch === '"') inQuotes = true;
          else if (ch === ",") {
            cells.push(cur);
            cur = "";
          } else cur += ch;
        }
      }
      cells.push(cur);
      return cells;
    };

    const headers = parseLine(lines[0]).map((h) => h.trim().toLowerCase());
    return lines.slice(1).map((line) => {
      const cells = parseLine(line);
      const row = {};
      headers.forEach((h, i) => {
        row[h] = cells[i] ?? "";
      });
      return row;
    });
  };

  const parseJSONFile = (text) => {
    const data = JSON.parse(text);
    if (!Array.isArray(data)) throw new Error("JSON file must contain an array of jobs.");
    return data;
  };

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      let rawRows = [];

      if (file.name.toLowerCase().endsWith(".json")) {
        rawRows = parseJSONFile(text);
      } else if (file.name.toLowerCase().endsWith(".csv")) {
        rawRows = parseCSV(text);
      } else {
        toast.error("Please select a .json or .csv file.");
        setImporting(false);
        return;
      }

      const valid = [];
      let skipped = 0;

      rawRows.forEach((row) => {
        const company = String(row.company || "").trim();
        const role = String(row.role || "").trim();
        if (!company || !role) {
          skipped++;
          return;
        }
        valid.push({
          company,
          role,
          status: normalizeStatus(row.status),
        });
      });

      if (valid.length === 0) {
        toast.error("No valid rows found in that file.");
        setImporting(false);
        return;
      }

      const results = await Promise.allSettled(valid.map((job) => jobsApi.create(job)));
      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.length - succeeded;

      let message = `Imported ${succeeded} application${succeeded === 1 ? "" : "s"}.`;
      if (skipped > 0) message += ` Skipped ${skipped} invalid row${skipped === 1 ? "" : "s"}.`;
      if (failed > 0) message += ` ${failed} failed to save.`;

      if (succeeded > 0) toast.success(message);
      else toast.error(message);

      loadJobs();
    } catch (err) {
      toast.error(`Import failed: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p className="page-subtitle">Manage your data and preferences.</p>
        </div>
      </div>

      <div className="stats-panel">
        <h3>Appearance</h3>
        <div className="settings-row">
          <div>
            <p className="settings-row-title">Theme</p>
            <p className="page-subtitle">Currently using {theme === "dark" ? "dark" : "light"} mode.</p>
          </div>
          <button className="btn-secondary" onClick={onToggleTheme}>
            Switch to {theme === "dark" ? "light" : "dark"} mode
          </button>
        </div>
      </div>

      <div className="stats-panel">
        <h3>Export data</h3>
        <p className="page-subtitle">
          Download all {jobs.length} tracked application{jobs.length === 1 ? "" : "s"}.
        </p>
        <div className="settings-row">
          <button className="btn-secondary" onClick={exportJSON} disabled={loading}>
            Export as JSON
          </button>
          <button className="btn-secondary" onClick={exportCSV} disabled={loading}>
            Export as CSV
          </button>
        </div>
      </div>

      <div className="stats-panel">
        <h3>Import data</h3>
        <p className="page-subtitle">
          Upload a .json or .csv file (matching the export format) to add applications in bulk.
        </p>
        <div className="settings-row">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.csv"
            style={{ display: "none" }}
            onChange={handleFileSelected}
          />
          <button
            className="btn-secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
          >
            {importing ? "Importing…" : "Choose file to import"}
          </button>
        </div>
      </div>

      <div className="stats-panel danger-zone">
        <h3>Danger zone</h3>
        <div className="settings-row">
          <div>
            <p className="settings-row-title">Clear all applications</p>
            <p className="page-subtitle">This permanently deletes every tracked application. Cannot be undone.</p>
          </div>
          <button
            className="btn-danger"
            onClick={() => setConfirmClearOpen(true)}
            disabled={loading || jobs.length === 0}
          >
            Clear all
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmClearOpen}
        title="Clear all applications?"
        message={`This will permanently delete all ${jobs.length} tracked application${jobs.length === 1 ? "" : "s"}. This cannot be undone.`}
        onConfirm={handleClearAll}
        onCancel={() => setConfirmClearOpen(false)}
        busy={clearing}
      />
    </div>
  );
}