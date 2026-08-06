import { NavLink } from "react-router-dom";
import { LayoutGrid, BarChart3, Settings, Moon, Sun, Briefcase } from "lucide-react";

export default function Sidebar({ theme, onToggleTheme, onAddJob }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="sidebar-brand-mark">
          <Briefcase size={18} strokeWidth={2.2} />
        </span>
        <span>Job Tracker</span>
      </div>

      <button className="btn-accent sidebar-add" onClick={onAddJob}>
        + Add Job
      </button>

      <nav className="sidebar-nav">
        <NavLink to="/" end className="sidebar-link">
          <LayoutGrid size={17} />
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/stats" className="sidebar-link">
          <BarChart3 size={17} />
          <span>Statistics</span>
        </NavLink>
        <NavLink to="/settings" className="sidebar-link">
          <Settings size={17} />
          <span>Settings</span>
        </NavLink>
      </nav>

      <button className="sidebar-theme" onClick={onToggleTheme}>
        {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
      </button>
    </aside>
  );
}
