import {
  LayoutDashboard,
  Search,
  History,
  User,
  LogOut
} from "lucide-react";

import {
  NavLink,
  Outlet,
  useNavigate
} from "react-router-dom";

import ThemeToggle from "../components/premium/ThemeToggle";

import { useAuth } from "../context/AuthContext";

export default function AppShell() {

  const { logout } = useAuth();

  const navigate = useNavigate();

  const handleLogout = () => {

    logout();

    navigate("/");
  };

  return (

    <div className="dashboard-shell">

      {/* TOP NAVBAR */}

      <header className="dashboard-navbar">

        {/* LEFT */}

        <div className="dashboard-brand">

          <h2>ScrapeIQ</h2>

        </div>

        {/* CENTER NAV */}

        <nav className="dashboard-nav">

          <NavLink to="/dashboard">

            <LayoutDashboard size={18} />

            Dashboard

          </NavLink>

          <NavLink to="/agent">

            <Search size={18} />

            Agent

          </NavLink>

          <NavLink to="/history">

            <History size={18} />

            History

          </NavLink>

          <NavLink to="/profile">

            <User size={18} />

            Profile

          </NavLink>

        </nav>

        {/* RIGHT */}

        <div className="dashboard-actions">

          <ThemeToggle />

          <button
            className="logout-btn"
            onClick={handleLogout}
          >

            <LogOut size={18} />

            Logout

          </button>

        </div>

      </header>

      {/* PAGE */}

      <main className="dashboard-content">

        <Outlet />

      </main>

    </div>
  );
}