import { Bell, Mail, Moon, Settings, Shield, User } from "lucide-react";

import { useAuth } from "../context/AuthContext";

export default function Profile() {
  const { user } = useAuth();

  return (
    <div className="dashboard-page">
      <section className="dashboard-hero">
        <span className="eyebrow">
          <Settings size={15} />
          Settings
        </span>
        <h1>Profile and workspace preferences</h1>
        <p>Keep your account details and preferences aligned with the way you work.</p>
      </section>

      <div className="profile-grid">
        <section className="profile-card profile-card--wide">
          <div className="profile-card__header">
            <div className="profile-icon">
              <User size={22} />
            </div>
            <div>
              <h3>Account</h3>
              <p>Personal and workspace identity</p>
            </div>
          </div>
          <div className="profile-stack">
            <div>
              <span>Name</span>
              <strong>{user?.name || "Researcher"}</strong>
            </div>
            <div>
              <span>Email</span>
              <strong>{user?.email || "No email on file"}</strong>
            </div>
            <div>
              <span>Status</span>
              <strong>Premium workspace active</strong>
            </div>
          </div>
        </section>

        <section className="profile-card">
          <div className="profile-card__header">
            <div className="profile-icon">
              <Moon size={20} />
            </div>
            <div>
              <h3>Theme</h3>
              <p>Appearance and focus</p>
            </div>
          </div>
          <div className="profile-stack profile-stack--compact">
            <div>
              <span>Mode</span>
              <strong>Auto / system-aware</strong>
            </div>
          </div>
        </section>

        <section className="profile-card">
          <div className="profile-card__header">
            <div className="profile-icon">
              <Shield size={20} />
            </div>
            <div>
              <h3>Preferences</h3>
              <p>Research workflow defaults</p>
            </div>
          </div>
          <div className="profile-stack profile-stack--compact">
            <div>
              <span>Default view</span>
              <strong>Research workspace</strong>
            </div>
          </div>
        </section>

        <section className="profile-card">
          <div className="profile-card__header">
            <div className="profile-icon">
              <Mail size={20} />
            </div>
            <div>
              <h3>Export settings</h3>
              <p>Report delivery preferences</p>
            </div>
          </div>
          <div className="profile-stack profile-stack--compact">
            <div>
              <span>Exports</span>
              <strong>PDF and CSV ready</strong>
            </div>
          </div>
        </section>

        <section className="profile-card">
          <div className="profile-card__header">
            <div className="profile-icon">
              <Bell size={20} />
            </div>
            <div>
              <h3>Notifications</h3>
              <p>Workspace updates</p>
            </div>
          </div>
          <div className="profile-stack profile-stack--compact">
            <div>
              <span>Alerts</span>
              <strong>Enabled for report completion</strong>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}