import { motion as Motion } from "framer-motion";

export default function GlassCard({ children, className = "", delay = 0 }) {
  return (
    <Motion.div
      className={`glass-card ${className}`}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.55, delay }}
    >
      {children}
    </Motion.div>
  );
}
