"use client";
import { useEffect, useRef } from "react";
import { say } from "@/lib/pipSay";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

/**
 * Makes the site an installable app that also opens offline after the first visit.
 * - Registers /sw.js (production only). Pages are network-first, images and build files cache-first, the API is never cached.
 * - Remembers the browser's install prompt for the "Install Pip as an app" command in the Jump menu (event: pip:install).
 * - Pip mentions it when the connection drops or returns.
 */
export default function PwaClient() {
  const deferred = useRef<InstallEvent | null>(null);

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      const reg = () => { navigator.serviceWorker.register("/sw.js").catch(() => { /* the site works fine without it */ }); };
      if (document.readyState === "complete") reg(); else addEventListener("load", reg, { once: true });
    }
    const onPrompt = (e: Event) => { e.preventDefault(); deferred.current = e as InstallEvent; };
    const onInstalled = () => { deferred.current = null; say("Pip is on your home screen now!"); };
    const onInstall = async () => {
      const d = deferred.current;
      if (d) {
        deferred.current = null;
        try { await d.prompt(); const c = await d.userChoice; if (c.outcome === "dismissed") say("No worries. Pip will wait right here."); } catch { /* prompt closed */ }
      } else if (matchMedia("(display-mode: standalone)").matches) say("Pip is already installed. Hello again!");
      else say("To install: open your browser menu, then Install app or Add to Home Screen.");
    };
    const offline = () => say("You’re offline. Pip keeps the nursery open anyway.");
    const online = () => say("Back online. Welcome back!");
    addEventListener("beforeinstallprompt", onPrompt);
    addEventListener("appinstalled", onInstalled);
    addEventListener("pip:install", onInstall);
    addEventListener("offline", offline);
    addEventListener("online", online);
    return () => {
      removeEventListener("beforeinstallprompt", onPrompt);
      removeEventListener("appinstalled", onInstalled);
      removeEventListener("pip:install", onInstall);
      removeEventListener("offline", offline);
      removeEventListener("online", online);
    };
  }, []);

  return null;
}
