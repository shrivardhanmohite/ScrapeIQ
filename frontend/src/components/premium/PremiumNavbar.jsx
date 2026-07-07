import { Menu, ScanSearch, X } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import AnimatedButton from "./AnimatedButton";
import ThemeToggle from "./ThemeToggle";

const navItems = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" }
];

const MotionHeader = motion.header;
const MotionSpan = motion.span;

export default function PremiumNavbar() {
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);

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

  return (
    <MotionHeader
      className={hidden ? "premium-navbar navbar-hidden" : "premium-navbar"}
      initial={{ opacity: 0, y: -18, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.35 }}
    >
      <Link to="/" className="brand-mark">
        <MotionSpan
          className="animated-brand-logo"
          initial={{ rotate: -12, scale: 0.9 }}
          animate={{ y: [0, -2, 0], rotate: [0, 1.5, -1.5, 0], scale: [1, 1.03, 1] }}
          whileHover={{ rotate: 8, scale: 1.08 }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        >
          <ScanSearch size={19} />
        </MotionSpan>
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
    </MotionHeader>
  );
}
