import {
  Navigate,
  Route,
  Routes
} from "react-router-dom";

/* COMPONENTS */

import Landing from "./components/Landing";
import Login from "./components/login";
import Signup from "./components/signup";

/* LAYOUTS */

import AppShell from "./layouts/AppShell";
import ProtectedRoute from "./layouts/ProtectedRoute";

/* PAGES */

import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Agent from "./pages/Agent";
import History from "./pages/History";
import Reports from "./pages/Reports";

/* STYLES */

import "./App.css";

export default function App() {

  return (

    <Routes>

      {/* PUBLIC ROUTES */}

      <Route
        path="/"
        element={<Landing />}
      />

      <Route
        path="/login"
        element={<Login />}
      />

      <Route
        path="/signup"
        element={<Signup />}
      />

      {/* PROTECTED ROUTES */}

      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >

        <Route
          path="/dashboard"
          element={<Dashboard />}
        />

        <Route
          path="/agent"
          element={<Agent />}
        />

        <Route
          path="/history"
          element={<History />}
        />

        <Route
          path="/reports"
          element={<Reports />}
        />

        <Route
          path="/profile"
          element={<Profile />}
        />

      </Route>

      {/* FALLBACK */}

      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />

    </Routes>
  );
}
