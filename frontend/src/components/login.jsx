import { useState } from "react";
import axios from "axios";

import {
  Link,
  useLocation,
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

export default function Login() {

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();

  const submitLogin = async (event) => {

    event.preventDefault();

    setLoading(true);
    setError("");

    try {

      await axios.post(
        "http://localhost:5000/api/auth/login",
        { email, password }
      );

      login({
        email,
        name: email.split("@")[0]
      });

      navigate(
        location.state?.from || "/dashboard",
        { replace: true }
      );

    } catch {

      setError("Invalid credentials.");

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
          onSubmit={submitLogin}
        >

          <span className="eyebrow">
            Welcome back
          </span>

          <h1>
            Login to your
            <br />
            workspace.
          </h1>

          <p>
            Continue monitoring scraping jobs,
            exports, and AI workflows.
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
                placeholder="Your password"
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
              ? "Signing in..."
              : (
                <>
                  Login
                  <ArrowRight size={18} />
                </>
              )
            }

          </button>

          <p className="auth-switch">

            New here?

            <Link to="/signup">
              Create account
            </Link>

          </p>

        </form>

      </div>

    </div>
  );
}