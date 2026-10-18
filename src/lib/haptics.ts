/** A tiny buzz on phones that support it. Never on reduced-motion, never on desktop, never throws. */
export const buzz = (pattern: number | number[] = 12) => {
  try {
    if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
    if (matchMedia("(prefers-reduced-motion:reduce)").matches) return;
    navigator.vibrate(pattern);
  } catch { /* vibration is a nicety, never a requirement */ }
};
