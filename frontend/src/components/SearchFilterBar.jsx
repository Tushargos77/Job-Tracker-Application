import { Search } from "lucide-react";
import { ALL_STATUSES } from "../constants/status";

export default function SearchFilterBar({ query, setQuery, statusFilter, setStatusFilter, sortBy, setSortBy }) {
  return (
    <div className="toolbar">
      <div className="search-box">
        <Search size={16} strokeWidth={2} />
        <input
          type="text"
          placeholder="Search by company or role…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="toolbar-select">
        <option value="all">All statuses</option>
        {ALL_STATUSES.map((s) => (
          <option key={s.key} value={s.key}>
            {s.label}
          </option>
        ))}
      </select>

      <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="toolbar-select">
        <option value="recent">Sort: Most recent</option>
        <option value="company">Sort: Company (A–Z)</option>
        <option value="status">Sort: Status</option>
      </select>
    </div>
  );
}
