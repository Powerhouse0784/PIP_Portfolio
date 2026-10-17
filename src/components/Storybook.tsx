"use client";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { useAudio } from "./Providers";
import Receipt from "./Receipt";
import { nextReceipt, type R } from "@/lib/receipt";

type Page = { art: ReactNode; text?: string; cover?: string; end?: boolean };

const Stars = ({ n = 14 }: { n?: number }) => (
  <>
    {Array.from({ length: n }, (_, i) => (
      <circle key={i} cx={(i * 53 + 17) % 300} cy={(i * 37 + 11) % 120} r={i % 3 ? 1.4 : 2.2} fill="#ffe6a8" opacity={0.9} />
    ))}
  </>
);

const Sky = ({ children, glow = false }: { children?: ReactNode; glow?: boolean }) => (
  <svg viewBox="0 0 300 220" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <linearGradient id={glow ? "skg" : "sk"} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#2b2142" /><stop offset="1" stopColor={glow ? "#7a4f7e" : "#4a3a78"} />
      </linearGradient>
    </defs>
    <rect width="300" height="220" fill={`url(#${glow ? "skg" : "sk"})`} />
    <Stars />
    {children}
  </svg>
);

const Roofs = ({ lit }: { lit: number }) => (
  <g>
    {[0, 1, 2, 3, 4].map((i) => {
      const x = 8 + i * 58, h = 40 + ((i * 17) % 28);
      return (
        <g key={i}>
          <path d={`M${x} 220 V${220 - h} L${x + 25} ${200 - h} L${x + 50} ${220 - h} V220Z`} fill="#1a1330" />
          <rect x={x + 18} y={220 - h + 14} width="14" height="14" rx="3" fill={i < lit ? "#ffd88a" : "#3a2f55"} />
        </g>
      );
    })}
  </g>
);

const PAGES: Page[] = [
  {
    cover: "Goodnight, Midnight Nursery",
    art: (
      <>
        <Sky glow>
          <circle cx="232" cy="52" r="26" fill="#f2c56b" /><circle cx="244" cy="46" r="24" fill="#4f3a78" />
        </Sky>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="pgimg" src="/images/hero.webp" alt="" />
      </>
    ),
  },
  { text: "One night, the nursery was too quiet. Not sleepy-quiet. Missing-something quiet.", art: <Sky><Roofs lit={0} /><circle cx="60" cy="50" r="20" fill="#f2c56b" /></Sky> },
  { text: "The little music box had forgotten its tune. Even the moon leaned in to listen.", art: <>{/* eslint-disable-next-line @next/next/no-img-element */}<img className="pgimg" src="/images/box.webp" alt="A pink music box with a tiny unicorn on top" /></> },
  { text: "Pip packed a lantern, one very small star, and a snack for the road.", art: <>{/* eslint-disable-next-line @next/next/no-img-element */}<img className="pgimg" src="/images/lamp.webp" alt="A glowing night lantern" /></> },
  { text: "Over rooftops and sleepy chimneys he went, humming a note and listening for another.", art: <Sky><Roofs lit={2} /><path d="M20 90 C90 20 170 120 270 40" stroke="#ffd36e" strokeDasharray="4 7" strokeWidth="2.5" fill="none" strokeLinecap="round" /></Sky> },
  { text: "From a puffy cloud, a hum hummed back. The lost tune had been napping there all along!", art: <>{/* eslint-disable-next-line @next/next/no-img-element */}<img className="pgimg" src="/images/wave.webp" alt="Pip waving from a fluffy cloud" /></> },
  { text: "Pip carried it home. One by one, the windows glowed, and the whole nursery fell asleep. Goodnight.", art: <Sky glow><Roofs lit={5} /></Sky> },
  { end: true, art: <Sky glow><circle cx="150" cy="80" r="30" fill="#f2c56b" /><circle cx="164" cy="72" r="28" fill="#5a4380" /></Sky> },
];

const N = PAGES.length;

export default function Storybook() {
  const { play } = useAudio();
  const [spread, setSpread] = useState(true);
  const [t, setT] = useState(0); // number of leaves turned
  const [moving, setMoving] = useState(-1);
  const [rec, setRec] = useState<R | null>(null);
  const timer = useRef<number>(0);
  const drag = useRef<{ x: number; y: number } | null>(null);

  // One page per leaf on phones; two pages per leaf on wider screens.
  const leaves = spread ? N / 2 : N;
  const maxT = spread ? leaves : leaves - 1; // on phones the last page stays visible
  const mode = useRef(true);
  useEffect(() => {
    const mq = matchMedia("(min-width: 760px)");
    const apply = () => {
      if (mode.current === mq.matches) return;
      mode.current = mq.matches;
      setT((n) => (mq.matches ? Math.floor(n / 2) : Math.min(n * 2, N - 1)));
      setSpread(mq.matches);
    };
    apply();
    mq.addEventListener("change", apply);
    return () => { mq.removeEventListener("change", apply); clearTimeout(timer.current); };
  }, []);

  const go = useCallback((to: number) => {
    const next = Math.max(0, Math.min(maxT, to));
    if (next === t) return;
    setMoving(next > t ? t : t - 1);
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMoving(-1), 950);
    play("page");
    setT(next);
    if (next === maxT) setRec(nextReceipt(`Delivered: one bedtime story, ${N - 2} pages.`));
  }, [maxT, t, play]);

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "PageDown") { e.preventDefault(); go(t + 1); }
    else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); go(t - 1); }
    else if (e.key === "Home") { e.preventDefault(); go(0); }
    else if (e.key === "End") { e.preventDefault(); go(maxT); }
  };
  const down = (e: PointerEvent) => { drag.current = { x: e.clientX, y: e.clientY }; };
  const up = (e: PointerEvent) => {
    const d = drag.current; drag.current = null;
    if (!d) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) go(dx < 0 ? t + 1 : t - 1);
  };

  const face = (p: Page, visible: boolean, side: "l" | "r", idx: number) => (
    <div className={`face ${side === "l" ? "back" : "front"}${p.cover ? " cover" : ""}`} inert={!visible} aria-hidden={!visible} data-pg={idx}>
      <div className="pgart">{p.art}</div>
      {p.cover && <div className="pgtx"><h4>{p.cover}</h4><p className="small">A bedtime story by Pip · swipe or press → to begin</p></div>}
      {p.text && <div className="pgtx"><p>{p.text}</p><span className="pgn">{idx}</span></div>}
      {p.end && <div className="pgtx"><h4>The End</h4><button className="chip" onClick={() => go(0)}>Read it again ✦</button></div>}
    </div>
  );

  // Which logical page is showing (for the screen-reader label).
  const shown = spread ? [t === 0 ? -1 : 2 * t - 1, t === leaves ? -1 : 2 * t] : [t];
  const label = shown.filter((n) => n >= 0).map((n) => PAGES[n].cover ?? PAGES[n].text ?? "The End").join(" … ");

  return (
    <div className="sb">
      <div
        className={`bkstage${spread ? " spread" : " single"}${spread && t === 0 ? " at-start" : ""}${spread && t === leaves ? " at-end" : ""}`}
        tabIndex={0}
        role="group"
        aria-roledescription="book"
        aria-label="Bedtime storybook. Use the left and right arrow keys to turn pages."
        onKeyDown={onKey}
        onPointerDown={down}
        onPointerUp={up}
        onPointerCancel={() => { drag.current = null; }}
      >
        <div className="book">
          {Array.from({ length: leaves }, (_, k) => {
            const front = spread ? PAGES[2 * k] : PAGES[k];
            const back = spread ? PAGES[2 * k + 1] : null;
            const flipped = k < t;
            const z = moving === k ? leaves + 2 : flipped ? k + 1 : leaves - k;
            return (
              <div key={k} className={`leaf${flipped ? " flipped" : ""}`} style={{ zIndex: z }}>
                {face(front, k === t, "r", spread ? 2 * k : k)}
                {back ? face(back, k === t - 1, "l", 2 * k + 1) : <div className="face back blank" aria-hidden="true" />}
              </div>
            );
          })}
        </div>
      </div>
      <div className="sbc">
        <button className="chip" onClick={() => go(t - 1)} disabled={t === 0} ><span aria-hidden="true">←</span> Back</button>
        <span className="small" aria-live="polite">{t === 0 ? "Cover" : t === maxT ? "The end" : spread ? `Pages ${2 * t - 1}–${2 * t} of ${N - 2}` : `Page ${t} of ${N - 2}`}</span>
        <button className="chip" onClick={() => go(t + 1)} disabled={t === maxT} >Next <span aria-hidden="true">→</span></button>
      </div>
      <p className="sr" aria-live="polite">{label}</p>
      <Receipt r={rec} />
    </div>
  );
}
