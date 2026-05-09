export default function GlowBackground() {
  return (
    <div className="glow-background" aria-hidden="true">
      <div className="glow-grid" />
      <div className="noise-overlay" />
      <div className="particle-field">
        {Array.from({ length: 16 }).map((_, index) => (
          <span key={index} style={{ "--i": index }} />
        ))}
      </div>
    </div>
  );
}
