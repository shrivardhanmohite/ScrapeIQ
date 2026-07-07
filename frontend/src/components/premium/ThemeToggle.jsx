import { Moon, Sun } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === "light";

  return (
    <button
      className={isLight ? "theme-switch theme-switch--light" : "theme-switch"}
      onClick={toggleTheme}
      type="button"
      aria-label={`Switch to ${isLight ? "dark" : "light"} mode`}
      aria-pressed={isLight}
      title={isLight ? "Switch to dark mode" : "Switch to light mode"}
    >
      <span className="theme-switch__track">
        <span className="theme-switch__thumb">
          {isLight ? <Sun size={15} /> : <Moon size={15} />}
        </span>
      </span>
      <span className="theme-switch__label">{isLight ? "Light" : "Dark"}</span>
    </button>
  );
}
