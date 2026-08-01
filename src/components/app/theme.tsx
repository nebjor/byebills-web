"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

/**
 * Light/dark for the app shell only. Mirrors the mobile ThemeProvider: follow
 * the system by default, remember an explicit override.
 *
 * This is a display preference, not identity — localStorage is the right home
 * for it (unlike onboarding state, which must be server-derived).
 *
 * Read via useSyncExternalStore because the source of truth is outside React
 * (localStorage + a media query), and both can change without a render.
 */

const STORAGE_KEY = "byebills:colorMode";

type Mode = "light" | "dark";

type ThemeValue = {
  mode: Mode;
  isDark: boolean;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeValue>({
  mode: "light",
  isDark: false,
  toggle: () => {},
});

export const useAppTheme = () => useContext(ThemeContext);

// Local writes don't fire a `storage` event in the tab that made them, so we
// keep our own listener set and notify it on toggle.
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

function subscribe(onChange: () => void) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", onChange);
  // `storage` fires in OTHER tabs — keeps multiple tabs in sync.
  window.addEventListener("storage", onChange);
  listeners.add(onChange);
  return () => {
    mq.removeEventListener("change", onChange);
    window.removeEventListener("storage", onChange);
    listeners.delete(onChange);
  };
}

function getSnapshot(): Mode {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** The server can't know the preference; render light and let the client correct it. */
function getServerSnapshot(): Mode {
  return "light";
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const mode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = useCallback(() => {
    const next: Mode = mode === "dark" ? "light" : "dark";
    localStorage.setItem(STORAGE_KEY, next);
    notify();
  }, [mode]);

  const value = useMemo<ThemeValue>(
    () => ({ mode, isDark: mode === "dark", toggle }),
    [mode, toggle],
  );

  return (
    <ThemeContext.Provider value={value}>
      <div className="bb-app min-h-screen" data-theme={mode}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}
