import { useState } from "react";
import axios from "axios";

import {
  Link,
  useNavigate
} from "react-router-dom";

import {
  Mail,
  LockKeyhole,
  ArrowRight
} from "lucide-react";

import GlowBackground from "./premium/GlowBackground";
import FloatingOrbBackground from "./premium/FloatingOrbBackground";
import ThemeToggle from "./premium/ThemeToggle";

import { useAuth } from "../context/AuthContext";

export default function Signup() {

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();

  const navigate = useNavigate();

  const submitSignup = async (event) => {

    event.preventDefault();

    setLoading(true);
    setError("");

    try {

      await axios.post(
        "http://localhost:5000/api/auth/signup",
        { email, password }
      );

      login({
        email,
        name: email.split("@")[0]
      });

      navigate("/dashboard");

    } catch {

      setError(
        "Unable to create account."
      );

    } finally {

      setLoading(false);
    }
  };

  return (
    <div className="premium-app auth-page">

      <GlowBackground />
      <FloatingOrbBackground />

      <div className="auth-topbar">

        {/* <Link to="/" className="brand-mark">
          <strong>ScrapeIQ</strong>
        </Link>

        <ThemeToggle /> */}

      </div>

      <div className="auth-wrapper">

        <form
          className="auth-card"
          onSubmit={submitSignup}
        >

          <span className="eyebrow">
            Create workspace
          </span>

          <h1>
            Start building
            <br />
            datasets.
          </h1>

          <p>
            Create your account and launch
            your AI scraping workspace.
          </p>

          {/* EMAIL */}

          <label>

            <span>Email</span>

            <div className="input-shell">

              <Mail size={18} />

              <input
                type="email"
                required
                placeholder="you@company.com"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
              />

            </div>

          </label>

          {/* PASSWORD */}

          <label>

            <span>Password</span>

            <div className="input-shell">

              <LockKeyhole size={18} />

              <input
                type="password"
                required
                placeholder="Create password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
              />

            </div>

          </label>

          {error && (
            <p className="form-error">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="btn-primary auth-button"
          >

            {loading
              ? "Creating..."
              : (
                <>
                  Create account
                  <ArrowRight size={18} />
                </>
              )
            }

          </button>

          <p className="auth-switch">

            Already have access?

            <Link to="/login">
              Login
            </Link>

          </p>

        </form>

      </div>

    </div>
  );
}