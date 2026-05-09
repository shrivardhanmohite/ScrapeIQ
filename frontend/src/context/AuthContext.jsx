import { createContext, useContext, useMemo, useState } from "react";

const AuthContext = createContext(null);

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("scrapeiq-user") || "null");
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser);

  const value = useMemo(() => ({
    user,
    isAuthenticated: Boolean(user),
    login: (nextUser) => {
      localStorage.setItem("scrapeiq-user", JSON.stringify(nextUser));
      setUser(nextUser);
    },
    logout: () => {
      localStorage.removeItem("scrapeiq-user");
      setUser(null);
    }
  }), [user]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
