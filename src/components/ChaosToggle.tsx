"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { say } from "@/lib/pipSay";
import { unlock } from "@/lib/progress";
import { chaosFor, stickerAt, STICKER_POOL, type Chaos } from "@/lib/chaos";

/**
 * Chaos mode that reshapes itself to the screen. While it is on, a ResizeObserver-style listener recomputes the layout from the
 * window size and sets CSS variables on <html> (tilt, offsets, grid columns, border style), plus a data-chaos-tier attribute the CSS keys off.
 * Resize the window, rotate the phone or zoom, and the nursery re-scatters: a pocket-sized screen gets a gentle zig-zag with dotted borders,
 * a laptop gets a three-column collage, a cinema screen gets big tilts and grooved borders. A tiny readout shows what it decided.
 */
function ChaosLayer() {
  const [c, setC] = useState<Chaos | null>(null);
  const [size, setSize] = useState<[number, number]>([0, 0]);

  useEffect(() => {
    const root = document.documentElement;
    let raf = 0;
    const apply = () => {
      raf = 0;
      const vv = window.visualViewport;
      const w = Math.round(vv?.width ?? innerWidth), h = Math.round(vv?.height ?? innerHeight);
      const next = chaosFor(w, h);
      root.dataset.chaosTier = next.tier;
      root.dataset.chaosOrient = next.portrait ? "portrait" : "landscape";
      root.style.setProperty("--ct", `${next.tilt}deg`);
      root.style.setProperty("--cs", `${next.shift}px`);
      root.style.setProperty("--cc", String(next.cols));
      root.style.setProperty("--cb", next.border);
      setC(next); setSize([w, h]);
    };
    const queue = () => { if (!raf) raf = requestAnimationFrame(apply); };
    apply();
    addEventListener("resize", queue);
    addEventListener("orientationchange", queue);
    window.visualViewport?.addEventListener("resize", queue);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("resize", queue); removeEventListener("orientationchange", queue);
      window.visualViewport?.removeEventListener("resize", queue);
      for (const k of ["--ct", "--cs", "--cc", "--cb"]) root.style.removeProperty(k);
      delete root.dataset.chaosTier; delete root.dataset.chaosOrient;
    };
  }, []);

  if (!c) return null;
  return (
    <>
      <div className="chaos-hud" aria-hidden="true" data-testid="chaos-hud">CHAOS · {size[0]}×{size[1]} · {c.label}</div>
      <div className="chaos-layer" aria-hidden="true">
        {Array.from({ length: STICKER_POOL }, (_, i) => {
          if (i >= c.stickers) return null;
          const s = stickerAt(i);
          return <span key={i} className="chs" style={{ left: `${s.x}%`, top: `${s.y}%`, fontSize: `${s.size}rem`, animationDelay: `${s.delay}s` }}>{s.glyph}</span>;
        })}
      </div>
    </>
  );
}

export default function ChaosToggle() {
  const [on, setOn] = useState(false);
  return (
    <>
      <button className="chip" data-act="chaos" aria-pressed={on} onClick={() => {
        const n = !on; setOn(n);
        document.documentElement.classList.toggle("chaos", n);
        if (n) unlock("chaos");
        say(n ? "CHAOS! Pip regrets nothing. Try resizing the window." : "Phew. Calm. Back to cozy.");
      }}>
        {on ? "Calm things down" : "Chaos mode!"}
      </button>
      {/* A portal: the footer's reveal animation would otherwise become the containing block of these fixed layers. */}
      {on && createPortal(<ChaosLayer />, document.body)}
    </>
  );
}
