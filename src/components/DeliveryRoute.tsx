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

export default function DeliveryRoute() {
  const [sel, setSel] = useState(-1);
  const [rec, setRec] = useState<R | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const path = useRef<SVGPathElement>(null);
  const star = useRef<SVGGElement>(null);

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion:reduce)").matches) return;
    const p = path.current, s = star.current, el = svg.current;
    if (!p || !s || !el) return;
    let raf = 0;
    const len = p.getTotalLength();
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      s.style.display = "";
      const t0 = performance.now();
      const frame = (t: number) => {
        const k = Math.min((t - t0) / 5000, 1);
        const pt = p.getPointAtLength(k * len);
        s.setAttribute("transform", `translate(${pt.x} ${pt.y})`);
        if (k < 1) raf = requestAnimationFrame(frame); else s.style.display = "none";
      };
      raf = requestAnimationFrame(frame);
    }, { threshold: 0.5 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, []);

  const pick = (i: number) => { setSel(i); setRec(nextReceipt(`Delivered to ${HOUSES[i].name}.`)); };

  return (
    <>
      <div className="route">
        <svg ref={svg} viewBox="0 0 640 230" role="group" aria-label="Rooftop delivery map with four houses">
          <path ref={path} id="path" d="M70 150 C150 40 200 40 250 130 S 380 40 440 120 S 560 50 590 130" />
          {HOUSES.map((h, i) => (
            <g
              key={h.name}
              className={`house${sel === i ? " lit" : ""}`}
              transform={`translate(${h.x} ${h.y + 30})`}
              tabIndex={0}
              role="button"
              aria-label={`House ${i + 1}: ${h.name}`}
              onClick={() => pick(i)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(i); } }}
            >
              <path className="hb" d="M-26 0 L0 -28 L26 0 V30 H-26 Z" />
              <rect className="win" x={-8} y={6} width={16} height={16} rx={3} />
            </g>
          ))}
          <g ref={star} style={{ display: "none" }}>
            <path transform="scale(1.1) translate(-12 -12)" fill="#ffd36e" d="m12 1 3 8h8l-6.5 5 2.5 8-7-5-7 5 2.5-8L1 9h8z" />
          </g>
        </svg>
      </div>
      <p className="note" aria-live="polite">
        {sel < 0 ? "Pick a rooftop to read the delivery note." : `${HOUSES[sel].name}. ${HOUSES[sel].note}`}
      </p>
      <Receipt r={rec} />
    </>
  );
}
