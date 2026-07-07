import { ArrowRight, PlayCircle, Sparkles } from "lucide-react";

import { motion as Motion } from "framer-motion";
import { useEffect, useState } from "react";

import PremiumNavbar from "./premium/PremiumNavbar";
import PremiumFooter from "./premium/PremiumFooter";
import GlowBackground from "./premium/GlowBackground";

const trustedBrands = ["Notion", "Linear", "Vercel", "Cohere", "Stripe"];

const workflowStages = [
  {
    id: "query",
    title: "User types query",
    detail: "Find pricing shifts in fintech",
    accent: "query"
  },
  {
    id: "websites",
    title: "Website cards appear",
    detail: "Stripe, Plaid, Mercury detected",
    accent: "sites"
  },
  {
    id: "dataset",
    title: "Dataset grows",
    detail: "Rows, notes, and metadata merge",
    accent: "dataset"
  },
  {
    id: "charts",
    title: "Charts generate",
    detail: "Revenue and adoption signals surface",
    accent: "charts"
  },
  {
    id: "insights",
    title: "Insights appear",
    detail: "Patterns and recommendations are ready",
    accent: "insights"
  },
  {
    id: "report",
    title: "Report created",
    detail: "Executive brief is published",
    accent: "report"
  }
];

export default function Landing() {
  const [activeStage, setActiveStage] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frameId = 0;
    let startTime = performance.now();
    const duration = 7200;

    const tick = (now) => {
      const elapsed = (now - startTime) % duration;
      const normalized = elapsed / duration;
      const stageIndex = Math.floor(normalized * workflowStages.length);

      setActiveStage(stageIndex);
      setProgress(normalized * workflowStages.length - stageIndex);
      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);

    return () => window.cancelAnimationFrame(frameId);
  }, []);

  return (
    <div className="premium-app landing-page">
      <GlowBackground />
      <PremiumNavbar />

      <main>
        <section className="landing-hero" id="hero">
          <div className="landing-hero__copy">
            <span className="eyebrow">
              <Sparkles size={15} />
              Premium AI research workspace
            </span>

            <h1>
              Turn web research into a calm,
              <span className="gradient-text"> high-signal workflow</span>.
            </h1>

            <p>
              Discover relevant sources, structure them into evidence, and publish a professional
              report without the friction of a manual research desk.
            </p>

            <div className="hero-actions">
              <a href="/signup" className="btn-primary">
                Start free
                <ArrowRight size={18} />
              </a>
              <a href="#workflow" className="btn-secondary">
                <PlayCircle size={18} />
                See the workflow
              </a>
            </div>

            <div className="hero-trust-row">
              <span>Trusted by teams building in</span>
              <div className="hero-trust-logos">
                {trustedBrands.map((brand) => (
                  <span key={brand} className="hero-trust-chip">
                    {brand}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="landing-hero__visual" id="workflow">
            <div className="workflow-shell">
              <div className="workflow-shell__glow" />

              <div className="workflow-head">
                <div className="workflow-pill">Live AI workflow</div>
                <div className="workflow-status">4 agents online • looped in real time</div>
              </div>

              <div className="workflow-stage-list">
                {workflowStages.map((stage, index) => {
                  const isActive = index === activeStage;
                  const isComplete = index < activeStage;

                  return (
                    <div key={stage.id} className={`workflow-step ${isActive ? "active" : ""} ${isComplete ? "complete" : ""}`}>
                      <span className="workflow-step__dot" />
                      <div className="workflow-step__copy">
                        <strong>{stage.title}</strong>
                        <span>{stage.detail}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <Motion.div
                key={activeStage}
                className="workflow-scene"
                initial={{ opacity: 0, y: 18, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
              >
                {activeStage === 0 && (
                  <div className="workflow-scene__query">
                    <div className="workflow-input">
                      <span>Find recent pricing shifts across fintech competitors</span>
                      <Motion.span
                        className="workflow-cursor"
                        animate={{ opacity: [1, 0, 1] }}
                        transition={{ duration: 0.95, repeat: Infinity }}
                      />
                    </div>
                    <div className="workflow-badge-row">
                      <span>Competitor scan</span>
                      <span>Intent match</span>
                      <span>Signal map</span>
                    </div>
                  </div>
                )}

                {activeStage === 1 && (
                  <div className="workflow-scene__cards">
                    {[
                      { name: "Stripe", label: "Product page" },
                      { name: "Plaid", label: "Pricing note" },
                      { name: "Mercury", label: "Launch post" }
                    ].map((site, index) => (
                      <Motion.div
                        key={site.name}
                        className="workflow-card workflow-card--site"
                        animate={{ y: [0, -6, 0], opacity: [0.75, 1, 0.75] }}
                        transition={{ duration: 2.2 + index * 0.14, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <div className="workflow-card__dot" />
                        <div>
                          <strong>{site.name}</strong>
                          <span>{site.label}</span>
                        </div>
                      </Motion.div>
                    ))}
                  </div>
                )}

                {activeStage === 2 && (
                  <div className="workflow-scene__dataset">
                    {[
                      { label: "Text", value: 82 },
                      { label: "Tables", value: 64 },
                      { label: "Images", value: 48 }
                    ].map((item) => (
                      <div key={item.label} className="workflow-data-pill">
                        <span>{item.label}</span>
                        <Motion.div
                          className="workflow-data-fill"
                          animate={{ height: [24, item.value / 1.2, 24] }}
                          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {activeStage === 3 && (
                  <div className="workflow-scene__charts">
                    {[
                      { label: "Adoption", value: 74 },
                      { label: "Pricing", value: 58 },
                      { label: "Demand", value: 82 }
                    ].map((item) => (
                      <div key={item.label} className="workflow-chart">
                        <Motion.div
                          className="workflow-chart__bar"
                          animate={{ height: [20, item.value, 20] }}
                          transition={{ duration: 1.7, repeat: Infinity, ease: "easeInOut" }}
                        />
                        <span>{item.label}</span>
                      </div>
                    ))}
                  </div>
                )}

                {activeStage === 4 && (
                  <div className="workflow-scene__insights">
                    {[
                      { title: "Pricing trend", text: "Demand is moving faster than headline pricing" },
                      { title: "Signal quality", text: "The strongest evidence comes from launch pages" }
                    ].map((insight, index) => (
                      <Motion.div
                        key={insight.title}
                        className="workflow-insight"
                        animate={{ x: [0, index === 0 ? 4 : -4, 0], opacity: [0.78, 1, 0.78] }}
                        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <strong>{insight.title}</strong>
                        <span>{insight.text}</span>
                      </Motion.div>
                    ))}
                  </div>
                )}

                {activeStage === 5 && (
                  <div className="workflow-scene__report">
                    <Motion.div
                      className="workflow-report-card"
                      animate={{ y: [0, -8, 0], scale: [1, 1.01, 1] }}
                      transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <div className="workflow-report-card__top">
                        <span>Executive report</span>
                        <strong>Published</strong>
                      </div>
                      <div className="workflow-report-card__body">
                        <h4>Pricing pressure is rising</h4>
                        <p>Three competitors shifted positioning in under two weeks.</p>
                      </div>
                    </Motion.div>
                  </div>
                )}

                <div className="workflow-progress">
                  <div className="workflow-progress__bar">
                    <Motion.div
                      className="workflow-progress__fill"
                      animate={{ width: [`${progress * 100}%`, `${(progress + 0.12) * 100}%`, `${progress * 100}%`] }}
                      transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
                    />
                  </div>
                </div>
              </Motion.div>
            </div>
          </div>
        </section>
      </main>

      <PremiumFooter />
    </div>
  );
}
