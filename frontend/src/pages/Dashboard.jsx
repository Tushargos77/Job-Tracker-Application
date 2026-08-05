import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { jobsApi } from "../api/client";
import { useToast } from "../context/ToastContext";
import { ALL_STATUSES } from "../constants/status";
import StatCard from "../components/StatCard";
import SearchFilterBar from "../components/SearchFilterBar";
import JobCard from "../components/JobCard";
import SkeletonCard from "../components/SkeletonCard";
import EmptyState from "../components/EmptyState";
import JobModal from "../components/JobModal";
import ConfirmDialog from "../components/ConfirmDialog";

export default function Dashboard() {
  const toast = useToast();
  const location = useLocation();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");

  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadJobs = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await jobsApi.list();
      setJobs(data);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  // Lets the sidebar's "Add Job" button open the modal even when navigating in from another page.
  useEffect(() => {
    if (location.state?.openAdd) {
      setEditing(null);
      setModalOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state?.openAdd]);

  const openAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (job) => {
    setEditing(job);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const handleSubmit = async (values) => {
    setSaving(true);
    try {
      if (editing) {
        const res = await jobsApi.update(editing.id, values);
        setJobs((prev) => prev.map((j) => (j.id === editing.id ? res.job ?? { ...j, ...values } : j)));
        toast.success("Application updated.");
      } else {
        const res = await jobsApi.create(values);
        setJobs((prev) => [res.job ?? { id: Date.now(), ...values }, ...prev]);
        toast.success("Application added.");
      }
      closeModal();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await jobsApi.remove(deleteTarget.id);
      setJobs((prev) => prev.filter((j) => j.id !== deleteTarget.id));
      toast.success("Application deleted.");
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const stats = useMemo(() => {
    const counts = { total: jobs.length };
    ALL_STATUSES.forEach((s) => {
      counts[s.key] = jobs.filter((j) => j.status === s.key).length;
    });
    return counts;
  }, [jobs]);

  const visibleJobs = useMemo(() => {
    let list = [...jobs];
    if (statusFilter !== "all") {
      list = list.filter((j) => j.status === statusFilter);
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (j) => j.company.toLowerCase().includes(q) || j.role.toLowerCase().includes(q)
      );
    }
    if (sortBy === "company") {
      list.sort((a, b) => a.company.localeCompare(b.company));
    } else if (sortBy === "status") {
      list.sort((a, b) => a.status.localeCompare(b.status));
    } else {
      list.sort((a, b) => b.id - a.id);
    }
    return list;
  }, [jobs, query, statusFilter, sortBy]);

  const isFiltering = query.trim() !== "" || statusFilter !== "all";

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="page-subtitle">Track every application in one pipeline.</p>
        </div>
      </div>

      <div className="stat-grid">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Applied" value={stats.Applied} color="var(--stage-applied)" />
        <StatCard label="Interview" value={stats.Interview} color="var(--stage-interview)" />
        <StatCard label="Offer" value={stats.Offer} color="var(--stage-offer)" />
        <StatCard label="Rejected" value={stats.Rejected} color="var(--stage-rejected)" />
      </div>

      <SearchFilterBar
        query={query}
        setQuery={setQuery}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        sortBy={sortBy}
        setSortBy={setSortBy}
      />

      {loadError ? (
        <div className="error-banner">
          <p>Couldn't load your applications: {loadError}</p>
          <button className="btn-secondary" onClick={loadJobs}>
            Retry
          </button>
        </div>
      ) : loading ? (
        <div className="job-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : visibleJobs.length === 0 ? (
        <EmptyState filtered={isFiltering} onAddJob={openAdd} />
      ) : (
        <div className="job-grid">
          {visibleJobs.map((job) => (
            <JobCard key={job.id} job={job} onEdit={openEdit} onDelete={setDeleteTarget} />
          ))}
        </div>
      )}

      <JobModal
        open={modalOpen}
        initial={editing}
        onClose={closeModal}
        onSubmit={handleSubmit}
        busy={saving}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this application?"
        message={
          deleteTarget ? `This will permanently remove ${deleteTarget.company} — ${deleteTarget.role}.` : ""
        }
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        busy={deleting}
      />
    </div>
  );
}
