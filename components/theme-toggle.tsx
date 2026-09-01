"use client";

import { Moon, Sun } from "lucide-react";

/**
 * Class-based dark mode toggle. The current theme lives on <html class="dark">
 * (set pre-paint by the inline script in the root layout), so the button can
 * render both icons and let CSS decide — no hydration mismatch.
 */
export function ThemeToggle() {
  const toggle = () => {
    const isDark = document.documentElement.classList.toggle("dark");
    try {
      localStorage.setItem("ct-theme", isDark ? "dark" : "light");
    } catch {
      // Private mode / storage disabled — theme still toggles for this session.
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle dark mode"
      title="Toggle dark mode"
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
    >
      <Sun className="hidden h-4 w-4 dark:block" />
      <Moon className="h-4 w-4 dark:hidden" />
    </button>
  );
}
