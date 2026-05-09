import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export default function ThemeToggle() {

  const [light, setLight] = useState(() => {

    return localStorage.getItem("theme") === "light";
  });

  useEffect(() => {

    if (light) {

      document.body.classList.add("light");

      localStorage.setItem(
        "theme",
        "light"
      );

    } else {

      document.body.classList.remove("light");

      localStorage.setItem(
        "theme",
        "dark"
      );
    }

  }, [light]);

  return (

    <button
      className="theme-toggle"
      onClick={() => setLight(!light)}
    >

      {light
        ? <Moon size={18} />
        : <Sun size={18} />
      }

    </button>
  );
}