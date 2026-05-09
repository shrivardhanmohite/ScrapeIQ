import GlassCard from "./GlassCard";

export default function DashboardCard({ label, value, detail, icon: Icon, delay = 0 }) {
  return (
    <GlassCard className="dashboard-card" delay={delay}>
      <div className="dashboard-card__icon">{Icon && <Icon size={20} />}</div>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </GlassCard>
  );
}
