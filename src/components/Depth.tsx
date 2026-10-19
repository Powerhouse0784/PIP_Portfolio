"use client";
import { useEffect } from "react";

/** Small, mostly static things lean toward the pointer (or a pressed finger), like a toy on a shelf. Big interactive panels get a whisper. */
const TILT: [string, number][] = [
  [".arch, .fact, .pv, .tonight, .gn-card, .sgrid li, .wish-card", 5],
  [".dcard, .ticket, .proj:not(.wide)", 2.2],
];
/** Hero layers sit at different depths and slide against each other as the pointer moves. [selector, px of travel] */
const DEPTH: [string, number][] = [[".hero-zone .moon", 26], [".hero-zone .orbit", 14], [".hero-zone .cl", 9], [".hero .arch", -9]];
const SELECTOR = TILT.map(([s]) => s).join(",");
const maxFor = (el: Element) => TILT.find(([s]) => el.matches(s))?.[1] ?? 3;

type St = { el: HTMLElement; cx: number; cy: number; tx: number; ty: number; max: number };

/**
 * Depth for a mostly flat page. Uses the individual `rotate` / `translate` properties, so it never fights the transforms and
 * animations other components already use. Mouse and pen lean on hover; touch leans while a finger is down. Reduced motion: off.
 */
export default function Depth() {
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion:reduce)").matches) return;
    const live = new Map<HTMLElement, St>();
    let raf = 0;
    const apply = (s: St) => {
      const m = Math.min(1, Math.hypot(s.cx, s.cy));
      if (m < 0.01) s.el.style.removeProperty("rotate");
      else s.el.style.rotate = `${(-s.cy).toFixed(3)} ${s.cx.toFixed(3)} 0 ${(m * s.max).toFixed(2)}deg`;
    };
    // parallax state
    const par = { x: 0, y: 0, tx: 0, ty: 0 };
    let layers: { el: HTMLElement; k: number }[] = [];
    const scan = () => { layers = DEPTH.flatMap(([sel, k]) => [...document.querySelectorAll<HTMLElement>(sel)].map((el) => ({ el, k }))); };
    scan();
    const frame = () => {
      raf = 0;
      let busy = false;
      for (const [el, s] of live) {
        s.cx += (s.tx - s.cx) * 0.16; s.cy += (s.ty - s.cy) * 0.16;
        apply(s);
        if (s.tx === 0 && s.ty === 0 && Math.abs(s.cx) + Math.abs(s.cy) < 0.01) { el.style.removeProperty("rotate"); live.delete(el); } else busy = true;
      }
      par.x += (par.tx - par.x) * 0.1; par.y += (par.ty - par.y) * 0.1;
      if (scrollY < innerHeight * 1.3) {
        for (const { el, k } of layers) { el.style.setProperty("--px", (par.x * k).toFixed(2)); el.style.setProperty("--pdy", (par.y * k).toFixed(2)); }
      }
      if (busy || Math.abs(par.tx - par.x) + Math.abs(par.ty - par.y) > 0.002) raf = requestAnimationFrame(frame);
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };

    const aim = (el: HTMLElement, e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) return;
      let s = live.get(el);
      if (!s) {
        s = { el, cx: 0, cy: 0, tx: 0, ty: 0, max: maxFor(el) };
        live.set(el, s);
        if (el.parentElement && !el.parentElement.style.perspective) el.parentElement.style.perspective = "1100px";
      }
      s.tx = ((e.clientX - r.left) / r.width - 0.5) * 2; s.ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
      kick();
    };
    const release = (except?: Element | null) => { for (const [el, s] of live) if (el !== except) { s.tx = 0; s.ty = 0; } kick(); };

    const move = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      par.tx = (e.clientX / innerWidth - 0.5) * 2; par.ty = (e.clientY / innerHeight - 0.5) * 2;
      const hit = (e.target as Element | null)?.closest?.(SELECTOR) as HTMLElement | null;
      release(hit);
      if (hit) aim(hit, e); else kick();
    };
    const down = (e: PointerEvent) => {
      if (e.pointerType !== "touch") return;
      const hit = (e.target as Element | null)?.closest?.(SELECTOR) as HTMLElement | null;
      if (hit) aim(hit, e);
    };
    const up = () => release(null);
    const out = (e: MouseEvent) => { if (!e.relatedTarget) { par.tx = 0; par.ty = 0; release(null); } };
    addEventListener("pointermove", move, { passive: true });
    addEventListener("pointerdown", down, { passive: true });
    addEventListener("pointerup", up, { passive: true });
    addEventListener("pointercancel", up, { passive: true });
    document.documentElement.addEventListener("mouseleave", out);
    // Rescan for new layers at most once per frame: streaming chat text and particle layers mutate the DOM constantly.
    let scanRaf = 0;
    const mo = new MutationObserver(() => { if (!scanRaf) scanRaf = requestAnimationFrame(() => { scanRaf = 0; scan(); }); });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      removeEventListener("pointermove", move); removeEventListener("pointerdown", down);
      removeEventListener("pointerup", up); removeEventListener("pointercancel", up);
      document.documentElement.removeEventListener("mouseleave", out);
      mo.disconnect(); cancelAnimationFrame(raf); cancelAnimationFrame(scanRaf);
      for (const [el] of live) el.style.removeProperty("rotate");
      for (const { el } of layers) { el.style.removeProperty("--px"); el.style.removeProperty("--pdy"); }
    };
  }, []);
  return null;
}
