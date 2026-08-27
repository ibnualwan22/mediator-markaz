"use client";

import { useTheme } from "./ThemeProvider";
import { Moon, Sun } from "lucide-react";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-10 w-full rounded-xl" />; // Placeholder
  }

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center gap-3 px-3 py-2 w-full text-text-secondary rounded-xl hover:bg-primary/5 hover:text-primary transition-all font-medium outline-none"
      title="Toggle Dark Mode"
    >
      {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
      <span className="hidden md:inline">
        {theme === "dark" ? "Light Mode" : "Dark Mode"}
      </span>
    </button>
  );
}
