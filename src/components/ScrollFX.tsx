"use client";
import { useEffect } from "react";

/** Selector -> reveal style. Elements are tagged from here so the page markup stays clean. */
const FX: [string, string][] = [
  [".about .arch", "left"],
  [".about .label, .about h2, .about .lede", "rise"],
  [".fact", "rise"],
  [".proj", "zoom"],
  [".game", "zoom"],
  [".dr", "zoom"],
  [".dm > *", "rise"],
  [".gb > *", "rise"],
  ["footer .wrap > *", "rise"],
];
/** Parallax: element -> speed (fraction of its distance from the viewport centre). */
const PAR: [string, number][] = [[".hero-zone .moon", -0.12], [".hero-zone .orbit", 0.08], [".hero-zone .cl", 0.05]];

/**
 * Scroll choreography: elements fade/slide in once as they enter, hero decorations drift at their own speed,
 * and --sp (0..1 scroll progress) tints the page from dawn to dusk. Does nothing for reduced motion.
 */
export default function ScrollFX() {
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion:reduce)").matches || !("IntersectionObserver" in window)) return;
    const root = document.documentElement;
    root.classList.add("fx-ready");

    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("fx-in"); io.unobserve(e.target); }
    }), { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });

    const scan = () => {
      for (const [sel, kind] of FX) {
        document.querySelectorAll<HTMLElement>(sel).forEach((el, i) => {
          if (el.dataset.fx) return;
          el.dataset.fx = kind;
          el.style.setProperty("--i", String(i % 6));
          io.observe(el);
        });
      }
    };
    scan();
    // Below-the-fold sections mount lazily, so look again (debounced) when the DOM grows.
    let timer = 0;
    const mo = new MutationObserver(() => { clearTimeout(timer); timer = window.setTimeout(scan, 300); });
    mo.observe(document.body, { childList: true, subtree: true });

    const par = PAR.flatMap(([sel, k]) => [...document.querySelectorAll<HTMLElement>(sel)].map((el) => ({ el, k })));
    let raf = 0;
    const tick = () => {
      raf = 0;
      const y = scrollY, max = document.documentElement.scrollHeight - innerHeight;
      root.style.setProperty("--sp", String(max > 0 ? Math.min(1, y / max).toFixed(3) : 0));
      root.classList.toggle("scrolled", y > 80);
      for (const { el, k } of par) {
        const r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > innerHeight + 200) continue;
        el.style.setProperty("--py", String(Math.round((r.top + r.height / 2 - innerHeight / 2) * k)));
      }
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(tick); };
    tick();
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    return () => {
      io.disconnect(); mo.disconnect(); clearTimeout(timer); cancelAnimationFrame(raf);
      removeEventListener("scroll", onScroll); removeEventListener("resize", onScroll);
      root.classList.remove("fx-ready", "scrolled");
    };
  }, []);
  return null;
}
