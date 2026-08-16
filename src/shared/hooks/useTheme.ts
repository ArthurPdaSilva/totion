import { useState } from "react";

export type Theme = "light" | "dark";

const THEME_STORAGE_KEY = "totion-theme";

function getInitialTheme(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  function toggleTheme() {
    const nextTheme = theme === "light" ? "dark" : "light";
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    document.documentElement.style.colorScheme = nextTheme;

    try {
      localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {
      // The visual preference still applies when storage is unavailable.
    }

    setTheme(nextTheme);
  }

  return { theme, toggleTheme };
}
