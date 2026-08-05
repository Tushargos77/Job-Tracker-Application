import { useEffect, useMemo, useState } from "react";
import { jobsApi } from "../api/client";
import { ALL_STATUSES } from "../constants/status";

export default function Stats() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    jobsApi
      .list()
      .then(setJobs)
      .finally(() => setLoading(false));
  }, []);

  const breakdown = useMemo(() => {
    const total = jobs.length || 1;
    return ALL_STATUSES.map((s) => {
      const count = jobs.filter((j) => j.status === s.key).length;
      return { ...s, count, pct: Math.round((count / total) * 100) };
    });
  }, [jobs]);

  const companies = useMemo(() => {
    const map = {};
    jobs.forEach((j) => {
      map[j.company] = (map[j.company] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [jobs]);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Statistics</h1>
          <p className="page-subtitle">Where your applications stand.</p>
        </div>
      </div>

      {loading ? (
        <p className="page-subtitle">Loading…</p>
      ) : jobs.length === 0 ? (
        <p className="page-subtitle">Add some applications to see stats here.</p>
      ) : (
        <>
          <div className="stats-panel">
            <h3>By status</h3>
            <div className="bar-list">
              {breakdown.map((s) => (
                <div className="bar-row" key={s.key}>
                  <span className="bar-label">{s.label}</span>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{ width: `${s.pct}%`, background: s.color }}
                    />
                  </div>
                  <span className="bar-count">{s.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="stats-panel">
            <h3>By company</h3>
            <div className="company-list">
              {companies.map(([company, count]) => (
                <div className="company-row" key={company}>
                  <span>{company}</span>
                  <span className="company-count">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
