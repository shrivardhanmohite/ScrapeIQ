import {
  LayoutDashboard,
  Search,
  History,
  FileText,
  User,
  LogOut,
  ScanSearch,
} from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

import {
  NavLink,
  Outlet,
  Link,
  useNavigate
} from "react-router-dom";

import ThemeToggle from "../components/premium/ThemeToggle";

import { useAuth } from "../context/AuthContext";

const MotionHeader = motion.header;
const MotionSpan = motion.span;

export default function AppShell() {

  const { logout } = useAuth();
  const [hidden, setHidden] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    let lastY = window.scrollY;

    const handleScroll = () => {
      const currentY = window.scrollY;
      setHidden(currentY > lastY && currentY > 120);
      lastY = currentY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = () => {

    logout();

    navigate("/");
  };

  return (

    <div className="dashboard-shell">

      {/* TOP NAVBAR */}

      <MotionHeader
        className={hidden ? "dashboard-navbar navbar-hidden" : "dashboard-navbar"}
        initial={{ opacity: 0, y: -18, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.35 }}
      >

        {/* LEFT */}

        <Link to="/" className="dashboard-brand" aria-label="Go to ScrapeIQ home">

          <MotionSpan
            className="animated-brand-logo"
            initial={{ rotate: -12, scale: 0.9 }}
            animate={{ rotate: [0, 1.5, -1.5, 0], scale: [1, 1.03, 1] }}
            whileHover={{ rotate: 8, scale: 1.08 }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          >
            <ScanSearch size={18} />
          </MotionSpan>

          <h2>ScrapeIQ</h2>

        </Link>

        {/* CENTER NAV */}

        <nav className="dashboard-nav">

          <NavLink to="/dashboard">
            <LayoutDashboard size={18} />
            Overview
          </NavLink>

          <NavLink to="/agent">
            <Search size={18} />
            Research
          </NavLink>

          <NavLink to="/history">
            <History size={18} />
            Datasets
          </NavLink>

          <NavLink to="/reports">
            <FileText size={18} />
            Reports
          </NavLink>

          <NavLink to="/profile">
            <User size={18} />
            Settings
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

      </MotionHeader>

      {/* PAGE */}

      <main className="dashboard-content">

        <Outlet />

      </main>

    </div>
  );
}
