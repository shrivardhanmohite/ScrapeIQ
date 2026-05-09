import {
  BarChart3,
  Bot,
  DatabaseZap,
  Layers3,
  ShieldCheck,
  Workflow
} from "lucide-react";

import { motion } from "framer-motion";

import PremiumNavbar from "./premium/PremiumNavbar";
import PremiumFooter from "./premium/PremiumFooter";
import GlowBackground from "./premium/GlowBackground";
import FloatingOrbBackground from "./premium/FloatingOrbBackground";
import GlassCard from "./premium/GlassCard";
import HeroSection from "./premium/HeroSection";

const features = [
  {
    icon: Bot,
    title: "Autonomous web agent",
    text: "Search, crawl, scrape, and structure public web data from one guided workflow."
  },
  {
    icon: DatabaseZap,
    title: "Analytics-ready datasets",
    text: "Normalize rows, tables, sources, images, and charts into exportable research assets."
  },
  {
    icon: ShieldCheck,
    title: "Production-grade jobs",
    text: "Background processing, retries, queues, monitoring, and scalable crawling architecture."
  }
];

const steps = [
  "Describe the data you need",
  "Add seed URLs or search the web",
  "Track crawl and scrape progress",
  "Export clean CSV or Excel datasets"
];

export default function Landing() {
  return (
    <div className="premium-app landing-page">

      <GlowBackground />
      <FloatingOrbBackground />

      <PremiumNavbar />

      <main>

        <HeroSection />

        {/* FEATURES */}
        <section className="section-band" id="features">

          <div className="section-heading">
            <span className="eyebrow">
              <Layers3 size={15} />
              Platform
            </span>

            <h2>
              Built for crawling, scraping,
              and insight operations.
            </h2>

            <p>
              ScrapeIQ combines crawling,
              extraction, AI processing,
              exports, and analytics into
              one modern SaaS workspace.
            </p>
          </div>

          <div className="feature-grid">

            {features.map((feature, index) => {

              const Icon = feature.icon;

              return (
                <GlassCard
                  key={feature.title}
                  delay={index * 0.08}
                >

                  <div className="feature-icon">
                    <Icon size={24} />
                  </div>

                  <h3>{feature.title}</h3>

                  <p>{feature.text}</p>

                </GlassCard>
              );
            })}

          </div>
        </section>

        {/* FLOW */}
        <section
          className="section-band how-it-works"
          id="how-it-works"
        >

          <div className="section-heading">

            <span className="eyebrow">
              <Workflow size={15} />
              Workflow
            </span>

            <h2>
              From prompt to dataset
              in minutes.
            </h2>

            <p>
              ScrapeIQ automates discovery,
              crawling, extraction,
              cleaning, and exports.
            </p>

          </div>

          <div className="timeline-grid">

            {steps.map((step, index) => (

              <motion.div
                key={step}
                className="timeline-card"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >

                <div className="timeline-number">
                  {index + 1}
                </div>

                <p>{step}</p>

              </motion.div>

            ))}

          </div>

        </section>

        {/* PRICING */}
        <section
          className="section-band pricing-preview"
          id="pricing"
        >

          <GlassCard className="pricing-card">

            <span className="eyebrow">
              <BarChart3 size={15} />
              Pricing
            </span>

            <h2>Built for scale.</h2>

            <p>
              Start free locally.
              Upgrade later with hosted
              workers, queues, team workspaces,
              analytics pipelines, and AI exports.
            </p>

          </GlassCard>

        </section>

      </main>

      <PremiumFooter />

    </div>
  );
}