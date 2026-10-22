import { useEffect, useState } from "react";
import { Routes, Route, Navigate, Outlet, useNavigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import ProtectedRoute from "./components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Stats from "./pages/Stats";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import { useAuth } from "./context/AuthContext";
import "./App.css";

function App() {
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const goAddJob = () => navigate("/", { state: { openAdd: Date.now() } });
  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  // Layout for every page that needs a logged-in user.
  // This is a plain element (not a component defined inside App) on purpose:
  // a component defined here would be re-created on every render and remount
  // the whole page, refetching data each time the theme is toggled.
  const appLayout = (
    <div className="app-shell">
      <Sidebar
        theme={theme}
        onToggleTheme={toggleTheme}
        onAddJob={goAddJob}
        user={user}
        onLogout={handleLogout}
      />
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      <Route element={<ProtectedRoute />}>
        <Route element={appLayout}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/stats" element={<Stats />} />
          <Route
            path="/settings"
            element={<Settings theme={theme} onToggleTheme={toggleTheme} />}
          />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
