"use client";
import { useEffect, useRef, useState } from "react";
import Receipt from "./Receipt";
import { nextReceipt, type R } from "@/lib/receipt";

const HOUSES = [
  { x: 70, y: 150, name: "Bunny Burrow Row", note: "Tonight: a dream about a field of warm clover." },
  { x: 250, y: 130, name: "Owl Street", note: "Tonight: a dream where the moon reads you a story." },
  { x: 440, y: 120, name: "Kitten Cottage", note: "Tonight: a dream of the softest, slowest cloud-nap." },
  { x: 590, y: 130, name: "Pond Lane", note: "Tonight: a dream of floating lanterns on quiet water." },
];

const clamp = (n: number) => Math.min(1, Math.max(0, n));

/**
 * The route is scroll-linked: Pip's star travels along the path as the visitor scrolls the map
 * through the viewport (and back again when scrolling up). Houses light up as the star passes.
 * Reduced motion: the route is drawn in full and the houses are simply clickable.
 */
export default function DeliveryRoute() {
  const [sel, setSel] = useState(-1);
  const [reached, setReached] = useState(0);
  const [rec, setRec] = useState<R | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const path = useRef<SVGPathElement>(null);
  const trail = useRef<SVGPathElement>(null);
  const star = useRef<SVGGElement>(null);

  useEffect(() => {
    const p = path.current, t = trail.current, s = star.current, el = box.current;
    if (!p || !t || !s || !el) return;
    const len = p.getTotalLength();
    // Where along the path (0..1) does each house sit? Nearest sampled point by x.
    const marks = HOUSES.map((h) => {
      let best = 0, bd = Infinity;
      for (let i = 0; i <= 200; i++) {
        const d = Math.abs(p.getPointAtLength((i / 200) * len).x - h.x);
        if (d < bd) { bd = d; best = i / 200; }
      }
      return best;
    });
    t.style.strokeDasharray = `${len}`;
    const draw = (k: number) => {
      const pt = p.getPointAtLength(k * len);
      s.setAttribute("transform", `translate(${pt.x} ${pt.y})`);
      t.style.strokeDashoffset = `${len * (1 - k)}`;
      const n = marks.filter((m) => k >= m - 0.01).length;
      setReached((r) => (r === n ? r : n));
    };

    if (matchMedia("(prefers-reduced-motion:reduce)").matches) {
      s.style.display = "none"; t.style.strokeDashoffset = "0"; setReached(HOUSES.length);
      return;
    }

    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect(), vh = innerHeight;
      // 0 when the map's top edge is 85% down the screen; 1 when its bottom edge reaches 45%.
      draw(clamp((vh * 0.85 - r.top) / (vh * 0.4 + r.height)));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    return () => { removeEventListener("scroll", onScroll); removeEventListener("resize", onScroll); cancelAnimationFrame(raf); };
  }, []);

  const pick = (i: number) => { setSel(i); setRec(nextReceipt(`Delivered to ${HOUSES[i].name}.`)); };

  return (
    <div className="rt">
      <div className="route" ref={box}>
        <svg viewBox="0 0 640 250" role="group" aria-label="Rooftop delivery map with four houses. The star follows the route as you scroll.">
          <path ref={path} id="path" d="M70 150 C150 40 200 40 250 130 S 380 40 440 120 S 560 50 590 130" />
          <path ref={trail} className="trail" d="M70 150 C150 40 200 40 250 130 S 380 40 440 120 S 560 50 590 130" />
          {HOUSES.map((h, i) => (
            <g
              key={h.name}
              className={`house${sel === i ? " lit" : ""}${i < reached ? " done" : ""}`}
              transform={`translate(${h.x} ${h.y + 36})`}
              tabIndex={0}
              role="button"
              aria-label={`House ${i + 1}: ${h.name}`}
              onClick={() => pick(i)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(i); } }}
            >
              <rect className="hit" x={-62} y={-62} width={124} height={124} fill="transparent" />
              <g transform="scale(1.35)">
                <path className="hb" d="M-26 0 L0 -28 L26 0 V30 H-26 Z" />
                <rect className="win" x={-8} y={6} width={16} height={16} rx={3} />
              </g>
            </g>
          ))}
          <g ref={star} transform="translate(70 150)">
            <path className="rs" transform="scale(1.1) translate(-12 -12)" d="m12 1 3 8h8l-6.5 5 2.5 8-7-5-7 5 2.5-8L1 9h8z" />
          </g>
        </svg>
      </div>
      <p className="small" aria-hidden="true" style={{ marginTop: 8 }}>Scroll to send Pip along tonight’s route.</p>
      <p className="note" aria-live="polite">
        {sel < 0
          ? reached ? `Pip has visited ${reached} of ${HOUSES.length} rooftops. Pick one to read its delivery note.` : "Pick a rooftop to read the delivery note."
          : `${HOUSES[sel].name}. ${HOUSES[sel].note}`}
      </p>
      <Receipt r={rec} />
    </div>
  );
}
