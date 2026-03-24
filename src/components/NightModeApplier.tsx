"use client";

import { useEffect } from "react";
import { useApp } from "@/context/AppContext";

/** Applies data-night attribute to <html> when night mode is active. */
export function NightModeApplier() {
  const { preferences } = useApp();

  useEffect(() => {
    const root = document.documentElement;
    if (preferences.nightMode) {
      root.setAttribute("data-night", "");
    } else {
      root.removeAttribute("data-night");
    }
  }, [preferences.nightMode]);

  return null;
}
