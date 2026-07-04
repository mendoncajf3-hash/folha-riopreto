import { create } from "zustand";

type Theme = "light" | "dark";

interface UIState {
  sidebarCollapsed: boolean;
  theme: Theme;
  toggleSidebar: () => void;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
}

function initialTheme(): Theme {
  const stored = localStorage.getItem("portal.theme") as Theme | null;
  if (stored) return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle("dark", theme === "dark");
  localStorage.setItem("portal.theme", theme);
}

export const useUI = create<UIState>((set, get) => {
  const theme = initialTheme();
  applyTheme(theme);
  return {
    sidebarCollapsed: localStorage.getItem("portal.sidebar") === "1",
    theme,
    toggleSidebar: () => {
      const next = !get().sidebarCollapsed;
      localStorage.setItem("portal.sidebar", next ? "1" : "0");
      set({ sidebarCollapsed: next });
    },
    setTheme: (t) => {
      applyTheme(t);
      set({ theme: t });
    },
    toggleTheme: () => {
      const next = get().theme === "dark" ? "light" : "dark";
      applyTheme(next);
      set({ theme: next });
    },
  };
});
