import {
  FaGithub,
  FaTwitter,
  FaUserCircle,
  FaSearch
} from "react-icons/fa";

import { Link } from "react-router-dom";

export default function PremiumFooter() {
  return (
    <footer className="premium-footer">
      <div className="footer-separator" />

      <div className="footer-grid">
        {/* Brand */}
        <div className="footer-brand">
          <Link to="/" className="brand-mark">
            <span className="brand-icon">
              <FaSearch size={18} />
            </span>

            <strong>ScrapeIQ</strong>
          </Link>

          <p className="footer-description">
            AI-powered crawling, scraping,
            and analytics workflows for
            modern research teams.
          </p>
        </div>

        {/* Product */}
        <div className="footer-column">
          <h4>Product</h4>

          <a href="/#features">
            Features
          </a>

          <a href="/#how-it-works">
            How It Works
          </a>

          <Link to="/agent">
            Agent
          </Link>
        </div>

        {/* Workspace */}
        <div className="footer-column">
          <h4>Workspace</h4>

          <Link to="/dashboard">
            Dashboard
          </Link>

          <Link to="/history">
            History
          </Link>

          <Link to="/login">
            Login
          </Link>
        </div>

        {/* Social */}
        <div className="footer-column">
          <h4>Connect</h4>

          <div className="social-row">
            <a href="#" aria-label="Twitter">
              <FaTwitter size={18} />
            </a>

            <a href="#" aria-label="Github">
              <FaGithub size={18} />
            </a>

            <a href="#" aria-label="Profile">
              <FaUserCircle size={18} />
            </a>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p>
          © {new Date().getFullYear()}
          {" "}ScrapeIQ. All rights reserved.
        </p>
      </div>
    </footer>
  );
}