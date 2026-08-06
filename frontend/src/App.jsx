import { useEffect, useState } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Stats from "./pages/Stats";
import Settings from "./pages/Settings";
import "./App.css";

function App() {
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const goAddJob = () => navigate("/", { state: { openAdd: Date.now() } });
  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  return (
    <div className="app-shell">
      <Sidebar theme={theme} onToggleTheme={toggleTheme} onAddJob={goAddJob} />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/settings" element={<Settings theme={theme} onToggleTheme={toggleTheme} />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
