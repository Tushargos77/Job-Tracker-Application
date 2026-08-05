import { useState, useEffect } from 'react';
import './App.css';

const API_URL = 'http://127.0.0.1:8000';

function App() {
  const [jobs, setJobs] = useState([]);
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('Applied');
  const [editingId, setEditingId] = useState(null);
  const [theme, setTheme] = useState(
    localStorage.getItem('theme') || 'dark'
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const fetchJobs = () => {
    fetch(`${API_URL}/jobs`)
      .then((res) => res.json())
      .then((data) => setJobs(data))
      .catch((err) => console.error('Error fetching jobs:', err));
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const resetForm = () => {
    setCompany('');
    setRole('');
    setStatus('Applied');
    setEditingId(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (editingId === null) {
      fetch(`${API_URL}/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company, role, status }),
      })
        .then((res) => res.json())
        .then(() => {
          resetForm();
          fetchJobs();
        })
        .catch((err) => console.error('Error creating job:', err));
    } else {
      fetch(`${API_URL}/jobs/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company, role, status }),
      })
        .then((res) => res.json())
        .then(() => {
          resetForm();
          fetchJobs();
        })
        .catch((err) => console.error('Error updating job:', err));
    }
  };

  const handleEdit = (job) => {
    setCompany(job.company);
    setRole(job.role);
    setStatus(job.status);
    setEditingId(job.id);
  };

  const handleDelete = (id) => {
    fetch(`${API_URL}/jobs/${id}`, { method: 'DELETE' })
      .then((res) => res.json())
      .then(() => fetchJobs())
      .catch((err) => console.error('Error deleting job:', err));
  };

  const statusClass = (s) => {
    const map = {
      Applied: 'badge-applied',
      Interview: 'badge-interview',
      Offer: 'badge-offer',
      Rejected: 'badge-rejected',
    };
    return map[s] || 'badge-applied';
  };

  return (
    <div className="app">
      <header className="header">
        <h1>Job Tracker</h1>
        <button
          className="theme-toggle"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
        </button>
      </header>

      <form onSubmit={handleSubmit} className="job-form">
        <input
          type="text"
          placeholder="Company"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          required
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="Applied">Applied</option>
          <option value="Interview">Interview</option>
          <option value="Offer">Offer</option>
          <option value="Rejected">Rejected</option>
        </select>
        <div className="form-actions">
          <button type="submit" className="btn-primary">
            {editingId === null ? 'Add Job' : 'Update Job'}
          </button>
          {editingId !== null && (
            <button type="button" className="btn-secondary" onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>
      </form>

      {jobs.length === 0 ? (
        <p className="empty-state">No jobs yet — add your first application above.</p>
      ) : (
        <div className="job-grid">
          {jobs.map((job) => (
            <div className="job-card" key={job.id}>
              <div className="job-card-top">
                <h3>{job.company}</h3>
                <span className={`badge ${statusClass(job.status)}`}>
                  {job.status}
                </span>
              </div>
              <p className="job-role">{job.role}</p>
              <div className="job-card-actions">
                <button onClick={() => handleEdit(job)}>Edit</button>
                <button className="btn-danger" onClick={() => handleDelete(job.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;