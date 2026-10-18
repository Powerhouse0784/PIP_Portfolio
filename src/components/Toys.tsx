"use client";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { useAudio } from "./Providers";
import Receipt from "./Receipt";
import ShareButton from "./ShareButton";
import { say } from "@/lib/pipSay";
import { unlock } from "@/lib/progress";
import { nextReceipt, type R } from "@/lib/receipt";

/* ---------- Block tower ---------- */
type Block = { x: number; w: number; c: number }; // x = centre
const W = 320, BH = 26, BASE_W = 120, FLOOR = 330, VIEW_H = 360;
const COLORS = ["#f4a6b8", "#ffd36e", "#a9d6c2", "#b9a9ee", "#ffb88a", "#9cc8f0"];
const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21]; // pentatonic-ish climb
const freq = (n: number) => 262 * Math.pow(2, SCALE[n % SCALE.length] / 12 + Math.floor(n / SCALE.length));

function Tower() {
  const { blip, play } = useAudio();
  const [tower, setTower] = useState<Block[]>([{ x: W / 2, w: BASE_W, c: 0 }]);
  const [best, setBest] = useState(0);
  const [fallen, setFallen] = useState(false);
  const [msg, setMsg] = useState("Tap Drop (or press Space) when the block is over the tower.");
  const [rec, setRec] = useState<R | null>(null);
  const [manual, setManual] = useState(false);
  const [mx, setMx] = useState(W / 2);
  const mover = useRef<SVGRectElement>(null);
  const xRef = useRef(W / 2);
  const towerRef = useRef(tower);
  towerRef.current = tower;
  const height = tower.length - 1;

  useEffect(() => {
    try { setBest(Number(localStorage.getItem("pip-tower-best")) || 0); } catch {}
    setManual(matchMedia("(prefers-reduced-motion:reduce)").matches);
  }, []);

  // Swinging block (skipped in reduced-motion mode, where the block is moved with the arrows instead).
  useEffect(() => {
    if (manual || fallen) return;
    let raf = 0;
    const t0 = performance.now();
    const loop = (now: number) => {
      const n = towerRef.current.length - 1;
      const speed = 1.6 + Math.min(n, 20) * 0.09;
      const top = towerRef.current[n];
      const amp = (W - top.w) / 2 - 6;
      xRef.current = W / 2 + Math.sin(((now - t0) / 1000) * speed) * amp;
      mover.current?.setAttribute("x", String(xRef.current - top.w / 2));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [manual, fallen, tower.length]);

  const reset = () => {
    setTower([{ x: W / 2, w: BASE_W, c: 0 }]); setFallen(false); setMx(W / 2); xRef.current = W / 2;
    setMsg("Fresh blocks! Tap Drop when the block is over the tower.");
  };

  const drop = useCallback(() => {
    if (fallen) return reset();
    const cur = towerRef.current, top = cur[cur.length - 1];
    const x = manual ? mx : xRef.current;
    const lo = Math.max(x - top.w / 2, top.x - top.w / 2), hi = Math.min(x + top.w / 2, top.x + top.w / 2);
    const ov = hi - lo;
    if (ov < 6) {
      setFallen(true);
      setMsg(`Whoops, the tower tumbled! You stacked ${cur.length - 1} blocks.`);
      setRec(nextReceipt(`Delivered: a ${cur.length - 1}-block tower (it fell, gently).`));
      say("Whoops! Towers need naps too.");
      return;
    }
    const perfect = Math.abs(x - top.x) < 4;
    const nb: Block = perfect ? { x: top.x, w: top.w, c: cur.length % COLORS.length } : { x: (lo + hi) / 2, w: ov, c: cur.length % COLORS.length };
    const n = cur.length; // new height
    setTower([...cur, nb]);
    play("toy");
    if (perfect) blip(freq(n) * 2);
    if (perfect) say("Perfect! *giggle*");
    setMsg(perfect ? `Perfect! ${n} blocks high.` : `${n} blocks high. The block got a little narrower.`);
    if (n > best) { setBest(n); try { localStorage.setItem("pip-tower-best", String(n)); } catch {} }
    if (n === 10) setRec(nextReceipt("Delivered: a 10-block tower. Pip is very proud."));
    if (manual) setMx(W / 2);
  }, [fallen, manual, mx, best, blip, play]);

  const key = (e: KeyboardEvent) => {
    if (e.key === " " || e.key === "Enter") { e.preventDefault(); drop(); }
    else if (manual && e.key === "ArrowLeft") { e.preventDefault(); setMx((v) => Math.max(40, v - 14)); }
    else if (manual && e.key === "ArrowRight") { e.preventDefault(); setMx((v) => Math.min(W - 40, v + 14)); }
  };
  const tap = (e: PointerEvent) => { if ((e.target as Element).closest("button")) return; drop(); };

  const lift = Math.max(0, (tower.length - 8) * BH); // scroll the view up as the tower grows
  const top = tower[tower.length - 1];

  return (
    <div className="toy">
      <h4>Block tower</h4>
      <p className="small">Stack as high as you can. Overhangs get trimmed!</p>
      <svg viewBox={`0 0 ${W} ${VIEW_H}`} className="tw" tabIndex={0} role="img" aria-label={`Block tower game. ${height} blocks stacked. Press Space to drop the block.`} onKeyDown={key} onPointerDown={tap}>
        <rect width={W} height={VIEW_H} fill="url(#twsky)" />
        <defs><linearGradient id="twsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--sky1)" /><stop offset="1" stopColor="var(--sky2)" /></linearGradient></defs>
        <g style={{ transform: `translateY(${lift}px)`, transition: "transform .4s" }}>
          <rect x="0" y={FLOOR} width={W} height="60" fill="#a98a72" />
          <g className={fallen ? "tumble" : ""}>
            {tower.map((b, i) => (
              <g key={i}>
                <rect x={b.x - b.w / 2} y={FLOOR - (i + 1) * BH} width={b.w} height={BH} rx="5" fill={COLORS[b.c]} stroke="#5c4033" strokeOpacity=".35" strokeWidth="1.5" />
                <path d={`M${b.x - b.w / 2 + 6} ${FLOOR - (i + 1) * BH + 7} h${Math.min(26, b.w - 12)}`} stroke="#fff" strokeOpacity=".6" strokeWidth="3" strokeLinecap="round" />
              </g>
            ))}
          </g>
          {!fallen && (
            <rect ref={mover} x={(manual ? mx : W / 2) - top.w / 2} y={FLOOR - (tower.length + 2) * BH} width={top.w} height={BH} rx="5" fill={COLORS[tower.length % COLORS.length]} stroke="#5c4033" strokeOpacity=".35" strokeWidth="1.5" strokeDasharray="5 4" />
          )}
        </g>
      </svg>
      <div className="tcb">
        {manual && <button className="chip" onClick={() => setMx((v) => Math.max(40, v - 14))} aria-label="Move block left">◀</button>}
        <button className="btn" onClick={drop}>{fallen ? "Build again" : "Drop block"}</button>
        {manual && <button className="chip" onClick={() => setMx((v) => Math.min(W - 40, v + 14))} aria-label="Move block right">▶</button>}
      </div>
      <p className="recipe" aria-live="polite">Height: {height} · Best: {best} — {msg}</p>
      {height > 0 && (
        <ShareButton
          label="Share my tower ✦"
          getCard={() => ({
            kicker: "Block tower", title: fallen ? "My tower tumbled (gently)" : "I stacked a tower for Pip",
            big: String(height), unit: height === 1 ? "block high" : "blocks high",
            lines: [best > height ? `Personal best: ${best} blocks.` : "That’s my personal best!", "Overhangs get trimmed. Can you beat me?"],
            filename: `pip-tower-${height}.png`, shareText: `I stacked ${height} blocks in Pip's tower! Can you beat me?`,
          })}
        />
      )}
      <Receipt r={rec} />
    </div>
  );
}

/* ---------- Rattle ---------- */
function Rattle() {
  const { on, play } = useAudio();
  const [shakes, setShakes] = useState(0);
  const [pulse, setPulse] = useState(0);
  const [stars, setStars] = useState(0);
  const [rec, setRec] = useState<R | null>(null);
  const last = useRef(0);
  const pos = useRef<{ x: number; y: number } | null>(null);

  const shake = useCallback(() => {
    const now = performance.now();
    if (now - last.current < 160) return;
    last.current = now;
    setPulse((p) => p + 1);
    play("toy", { cooldown: 450, volume: 0.22 });
    setShakes((s) => {
      const n = s + 1;
      if (n % 12 === 0) {
        setStars((k) => k + 1);
        say("A rattle star! Shiny.");
        unlock("rattle");
        setRec(nextReceipt(`Delivered: one rattle star, after ${n} shakes.`));
      }
      return n;
    });
  }, [play]);

  const move = (e: PointerEvent) => {
    if (e.buttons === 0 && e.pointerType === "mouse") return;
    const p = pos.current; pos.current = { x: e.clientX, y: e.clientY };
    if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 26) shake(); // wiggle it to shake it
  };

  return (
    <div className="toy">
      <h4>Pip’s rattle</h4>
      <p className="small">Tap it, press Space, or wiggle it with your finger. Every 12 shakes, a tiny star pops out.</p>
      <button className="rattle" onClick={shake} onPointerMove={move} onPointerLeave={() => { pos.current = null; }} aria-label={`Shake the rattle. ${shakes} shakes so far.`}>
        <svg viewBox="0 0 160 220" key={pulse} className={pulse ? "shk" : ""} aria-hidden="true">
          <rect x="70" y="110" width="20" height="95" rx="10" fill="#e8bd70" />
          <circle cx="80" cy="82" r="58" fill="#f4a6b8" stroke="#a34063" strokeWidth="3" />
          <path d="M30 70 Q80 105 130 70" fill="none" stroke="#fff" strokeOpacity=".7" strokeWidth="6" strokeLinecap="round" />
          <path className="rs2" d="m80 40 6 15h16l-13 10 5 16-14-10-14 10 5-16-13-10h16z" fill="#ffd36e" />
          <circle cx="52" cy="95" r="5" fill="#b9a9ee" /><circle cx="108" cy="92" r="5" fill="#a9d6c2" />
          <circle cx="80" cy="205" r="12" fill="#e8bd70" stroke="#a34063" strokeWidth="2" />
        </svg>
      </button>
      <p className="recipe" aria-live="polite">
        Shakes: {shakes} · Stars: {"✦".repeat(Math.min(stars, 12)) || "none yet"}
        {!on && " · Turn on the ♪ in the menu to hear it."}
      </p>
      <Receipt r={rec} />
    </div>
  );
}

export default function Toys() {
  return <div className="toys"><Tower /><Rattle /></div>;
}
