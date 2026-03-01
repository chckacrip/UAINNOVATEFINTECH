"use client";

import { useEffect } from "react";

/**
 * Dismisses the keyboard when the user taps/clicks outside of an input, textarea, or contenteditable.
 * Add once to the app layout so it applies everywhere.
 */
export function DismissKeyboard() {
  useEffect(() => {
    const dismiss = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      const active = document.activeElement as HTMLElement | null;
      if (!active || active === document.body) return;
      const tag = active.tagName?.toLowerCase();
      const isInput = tag === "input" || tag === "textarea" || tag === "select";
      const isEditable = active.getAttribute?.("contenteditable") === "true";
      if (isInput || isEditable) {
        if (!active.contains(target)) active.blur();
      }
    };
    document.addEventListener("mousedown", dismiss);
    document.addEventListener("touchstart", dismiss, { passive: true });
    return () => {
      document.removeEventListener("mousedown", dismiss);
      document.removeEventListener("touchstart", dismiss);
    };
  }, []);
  return null;
}
