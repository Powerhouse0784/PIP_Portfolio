"use client";
import { useEffect } from "react";
import { useAudio } from "./Providers";

/** While sound is on, the phone's lock screen and headphone buttons show Pip's artwork and can pause or resume the dream-world ambience. */
export default function MediaSession() {
  const { on, setOn } = useAudio();
  useEffect(() => {
    if (!on || typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    try {
      ms.metadata = new MediaMetadata({
        title: "Pip’s dream-world ambience", artist: "Midnight Nursery", album: "Pip’s Dream Workshop",
        artwork: [{ src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }, { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      });
      ms.playbackState = "playing";
      ms.setActionHandler("pause", () => setOn(false));
      ms.setActionHandler("stop", () => setOn(false));
    } catch { /* unsupported action: nothing to do */ }
    return () => {
      try {
        ms.setActionHandler("pause", null);
        ms.setActionHandler("stop", null);
        ms.playbackState = "none";
      } catch { /* ignore */ }
    };
  }, [on, setOn]);
  return null;
}
