import {
  FaArrowRight,
  FaDatabase,
  FaMagic,
  FaGlobe,
  FaChartBar
} from "react-icons/fa";

import { motion } from "framer-motion";
import { Link } from "react-router-dom";

export default function HeroSection() {
  return (
    <section className="hero-section">

      {/* LEFT */}
      <motion.div
        className="hero-copy"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >

        <div className="hero-badge">
          <FaMagic />
          <span>AI scraping workspace</span>
        </div>

        <h1>
          Turn the web into
          <span className="gradient-text">
            {" "}structured intelligence
          </span>
        </h1>

        <p>
          Crawl websites, scrape datasets, extract tables,
          analyze pages, and export clean research-ready
          intelligence from one premium AI workspace.
        </p>

        {/* CTA */}
        <div className="hero-actions">

          <Link to="/signup" className="btn-primary">
            Start Free
            <FaArrowRight />
          </Link>

          <Link to="/login" className="btn-secondary">
            Watch Demo
          </Link>

        </div>

        {/* STATS */}
        <div className="hero-stats">

          <div className="stat-card">
            <FaGlobe />
            <div>
              <strong>12k+</strong>
              <span>Pages Crawled</span>
            </div>
          </div>

          <div className="stat-card">
            <FaDatabase />
            <div>
              <strong>4.8M</strong>
              <span>Rows Extracted</span>
            </div>
          </div>

          <div className="stat-card">
            <FaChartBar />
            <div>
              <strong>98%</strong>
              <span>Structured Accuracy</span>
            </div>
          </div>

        </div>

      </motion.div>

      {/* RIGHT */}
      <motion.div
        className="hero-product"
        initial={{ opacity: 0, scale: 0.92, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.15 }}
      >

        <div className="product-window">

          <div className="window-top">
            <span />
            <span />
            <span />
          </div>

          <div className="agent-preview">

            <div className="agent-preview__query">
              <FaDatabase />
              <span>
                Extract competitor pricing intelligence
                from 12 websites
              </span>
            </div>

            <div className="progress-orbit">
              <strong>84%</strong>
              <span>Crawling sources</span>
            </div>

            <div className="preview-bars">
              <span style={{ width: "92%" }} />
              <span style={{ width: "76%" }} />
              <span style={{ width: "58%" }} />
              <span style={{ width: "88%" }} />
            </div>

            <div className="preview-grid">

              <div className="preview-card">
                <strong>CSV</strong>
                <span>Export ready</span>
              </div>

              <div className="preview-card">
                <strong>AI</strong>
                <span>Auto structured</span>
              </div>

              <div className="preview-card">
                <strong>Charts</strong>
                <span>Insights generated</span>
              </div>

            </div>

          </div>
        </div>

      </motion.div>

    </section>
  );
}