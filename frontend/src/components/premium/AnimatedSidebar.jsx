import { BarChart3, History, LogOut, Search, User } from "lucide-react";
import { motion } from "framer-motion";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import ThemeToggle from "./ThemeToggle";

const items = [
  { to: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { to: "/agent", label: "Open Agent", icon: Search },
  { to: "/history", label: "History", icon: History },
  { to: "/dashboard", label: "Profile", icon: User }
];

export default function AnimatedSidebar() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <motion.aside
      className="app-sidebar"
      initial={{ x: -24, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.45 }}
    >
      <div className="sidebar-brand">ScrapeIQ</div>
      <nav>
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink key={`${item.to}-${item.label}`} to={item.to}>
              <Icon size={17} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
      <div className="sidebar-footer">
        <ThemeToggle />
        <button onClick={handleLogout}>
          <LogOut size={17} />
          <span>Logout</span>
        </button>
      </div>
    </motion.aside>
  );
}
