"use client";
import { useEffect, useRef } from "react";

/** Living sky: twinkling stars, occasional shooting star (night), scroll progress bar, soft cursor glow. */
export default function StarField() {
  const cv = useRef<HTMLCanvasElement>(null);
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const c = cv.current, b = bar.current;
    const x = c?.getContext("2d");
    if (!c || !b || !x) return;
    const rm = matchMedia("(prefers-reduced-motion:reduce)").matches;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const stars = Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 1.4 + 0.4, p: Math.random() * 6 }));
    let w = 0, h = 0, raf = 0, next = 3000;
    let shoot: { x: number; y: number; k: number } | null = null;

    const size = () => { w = innerWidth; h = innerHeight; c.width = w * dpr; c.height = h * dpr; x.setTransform(dpr, 0, 0, dpr, 0, 0); };
    const night = () => { const t = document.documentElement.dataset.theme; return t ? t === "night" : matchMedia("(prefers-color-scheme:dark)").matches; };

    const draw = (t: number) => {
      x.clearRect(0, 0, w, h);
      const n = night();
      for (const s of stars) {
        const tw = 0.5 + 0.5 * Math.sin(t / 900 + s.p);
        x.fillStyle = n ? `rgba(255,232,170,${0.3 + 0.6 * tw})` : `rgba(235,140,175,${0.1 + 0.25 * tw})`;
        x.beginPath(); x.arc(s.x * w, s.y * h, s.r, 0, 7); x.fill();
      }
      if (n && !rm) {
        if (!shoot && t > next) shoot = { x: Math.random() * w * 0.8, y: Math.random() * h * 0.4, k: 0 };
        if (shoot) {
          shoot.k += 0.025;
          const px = shoot.x + shoot.k * 260, py = shoot.y + shoot.k * 130;
          const g = x.createLinearGradient(px - 90, py - 45, px, py);
          g.addColorStop(0, "rgba(255,232,170,0)");
          g.addColorStop(1, `rgba(255,244,210,${Math.max(0, 1 - shoot.k)})`);
          x.strokeStyle = g; x.lineWidth = 2; x.beginPath(); x.moveTo(px - 90, py - 45); x.lineTo(px, py); x.stroke();
          if (shoot.k >= 1) { shoot = null; next = t + 4000 + Math.random() * 5000; }
        }
      }
      if (!rm) raf = requestAnimationFrame(draw);
    };
    const scroll = () => {
      const m = document.documentElement.scrollHeight - innerHeight;
      b.style.transform = `scaleX(${m > 0 ? scrollY / m : 0})`;
    };
    let lx = 0, ly = 0;
    const move = (e: PointerEvent) => {
      if (!rm && Math.hypot(e.clientX - lx, e.clientY - ly) > 26) {
        lx = e.clientX; ly = e.clientY;
        const s = document.createElement("span");
        s.className = "spark"; s.textContent = "✦"; s.style.left = `${lx}px`; s.style.top = `${ly}px`;
        document.body.appendChild(s);
        setTimeout(() => s.remove(), 700);
      }
      document.documentElement.style.setProperty("--mx", `${e.clientX}px`);
      document.documentElement.style.setProperty("--my", `${e.clientY}px`);
    };
    size(); raf = requestAnimationFrame(draw); scroll();
    addEventListener("resize", size);
    addEventListener("scroll", scroll, { passive: true });
    const fine = matchMedia("(pointer:fine)").matches;
    if (fine) addEventListener("pointermove", move, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("resize", size);
      removeEventListener("scroll", scroll);
      removeEventListener("pointermove", move);
    };
  }, []);

  return (
    <>
      <div className="prog" ref={bar} aria-hidden="true" />
      <canvas className="sky" ref={cv} aria-hidden="true" />
    </>
  );
}
