import { User, Mail, Shield } from "lucide-react";

import { useAuth } from "../context/AuthContext";

export default function Profile() {

  const { user } = useAuth();

  return (

    <div className="dashboard-page">

      <section className="dashboard-hero">

        <span className="eyebrow">
          <User size={15} />
          Profile
        </span>

        <h1>
          Account Settings
        </h1>

        <p>
          Manage your workspace profile
          and session details.
        </p>

      </section>

      <div className="profile-grid">

        <div className="profile-card">

          <div className="profile-icon">
            <User size={24} />
          </div>

          <h3>Name</h3>

          <p>{user?.name}</p>

        </div>

        <div className="profile-card">

          <div className="profile-icon">
            <Mail size={24} />
          </div>

          <h3>Email</h3>

          <p>{user?.email}</p>

        </div>

        <div className="profile-card">

          <div className="profile-icon">
            <Shield size={24} />
          </div>

          <h3>Status</h3>

          <p>Premium Workspace Active</p>

        </div>

      </div>

    </div>
  );
}