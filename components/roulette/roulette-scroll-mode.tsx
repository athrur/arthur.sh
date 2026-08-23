"use client";

import { useEffect } from "react";

export function RouletteScrollMode() {
  useEffect(() => {
    document.documentElement.classList.add("roulette-scroll-mode");
    return () => document.documentElement.classList.remove("roulette-scroll-mode");
  }, []);

  return null;
}
