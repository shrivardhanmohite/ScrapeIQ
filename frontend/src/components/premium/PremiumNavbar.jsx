import { Menu, ScanSearch, X } from "lucide-react";
import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import AnimatedButton from "./AnimatedButton";
import ThemeToggle from "./ThemeToggle";

const navItems = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" }
];

export default function PremiumNavbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="premium-navbar">
      <Link to="/" className="brand-mark">
        <span><ScanSearch size={19} /></span>
        <strong>ScrapeIQ</strong>
      </Link>

      <nav className="landing-nav">
        {navItems.map((item) => (
          <a key={item.href} href={item.href}>{item.label}</a>
        ))}
      </nav>

      <div className="navbar-actions">
        <ThemeToggle />
        <NavLink className="nav-link-soft" to="/login">Login</NavLink>
        <AnimatedButton to="/signup" variant="primary">Signup</AnimatedButton>
      </div>

      <button className="mobile-menu-button" onClick={() => setOpen((value) => !value)} aria-label="Open menu">
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {open && (
        <div className="mobile-menu-panel">
          {navItems.map((item) => (
            <a key={item.href} href={item.href} onClick={() => setOpen(false)}>{item.label}</a>
          ))}
          <Link to="/login" onClick={() => setOpen(false)}>Login</Link>
          <Link to="/signup" onClick={() => setOpen(false)}>Signup</Link>
          <ThemeToggle />
        </div>
      )}
    </header>
  );
}
