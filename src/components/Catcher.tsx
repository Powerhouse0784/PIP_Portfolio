"use client";
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { useAudio } from "./Providers";

type S = { x: number; y: number; v: number; r: number; heart: boolean };
const W = 720, H = 380, ROUND = 30;

/** Mini-game: catch falling dreams for 30 seconds. Pointer, touch and keyboard (Space) supported. */
export default function Catcher() {
  const { blip } = useAudio();
  const cv = useRef<HTMLCanvasElement>(null);
  const stars = useRef<S[]>([]);
  const score = useRef(0);
  const [run, setRun] = useState(false);
  const [shown, setShown] = useState(0);
  const [left, setLeft] = useState(ROUND);
  const [best, setBest] = useState(0);

  useEffect(() => { try { setBest(Number(localStorage.getItem("pip-best")) || 0); } catch {} }, []);

  useEffect(() => {
    if (!run) return;
    const c = cv.current, x = c?.getContext("2d");
    if (!c || !x) return;
    let raf = 0, last = performance.now(), spawn = 0;
    const end = last + ROUND * 1000;
    score.current = 0; setShown(0); stars.current = [];
    const tick = (t: number) => {
      const dt = Math.min((t - last) / 1000, 0.05);
      last = t; spawn -= dt;
      if (spawn <= 0) {
        stars.current.push({ x: 40 + Math.random() * (W - 80), y: -20, v: 80 + Math.random() * 90 + score.current * 2, r: 16 + Math.random() * 10, heart: Math.random() < 0.18 });
        spawn = 0.6 - Math.min(score.current * 0.01, 0.3);
      }
      x.clearRect(0, 0, W, H);
      x.textAlign = "center";
      stars.current = stars.current.filter((s) => {
        s.y += s.v * dt;
        if (s.y > H + 30) return false;
        x.font = `${s.r * 2}px serif`;
        x.fillStyle = s.heart ? "#f19abb" : "#ffd36e";
        x.fillText(s.heart ? "♥" : "✦", s.x, s.y);
        return true;
      });
      setLeft(Math.max(0, Math.ceil((end - t) / 1000)));
      if (t < end) raf = requestAnimationFrame(tick);
      else {
        setRun(false);
        setBest((b) => { const n = Math.max(b, score.current); try { localStorage.setItem("pip-best", String(n)); } catch {} return n; });
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run]);

  const hit = (s: S) => {
    stars.current = stars.current.filter((o) => o !== s);
    score.current += s.heart ? 3 : 1;
    setShown(score.current);
    blip(s.heart ? 880 : 660 + Math.random() * 200);
  };
  const click = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!run || !cv.current) return;
    const r = cv.current.getBoundingClientRect();
    const px = ((e.clientX - r.left) * W) / r.width, py = ((e.clientY - r.top) * H) / r.height;
    const s = stars.current.find((o) => Math.hypot(o.x - px, o.y - py) < o.r * 1.8);
    if (s) hit(s);
  };
  const key = (e: KeyboardEvent) => {
    if (e.key !== " " && e.key !== "Enter") return;
    e.preventDefault();
    if (!run) return setRun(true);
    const low = [...stars.current].sort((a, b) => b.y - a.y)[0];
    if (low) hit(low);
  };

  return (
    <section id="catcher">
      <div className="wrap">
        <p className="label">Toy box · Mini-game</p>
        <h2>Catch the falling dreams</h2>
        <div className="game">
          <div className="gbar" aria-live="polite">
            <span>Dreams caught: <b>{shown}</b></span><span>Time: <b>{run ? left : ROUND}s</b></span><span>Best: <b>{best}</b></span>
          </div>
          <canvas ref={cv} width={W} height={H} tabIndex={0} role="img" aria-label="Game arena. Press Space to catch the lowest falling star." onPointerDown={click} onKeyDown={key} />
          <button className="btn" onClick={() => setRun(!run)}>{run ? "Stop" : shown ? "Play again" : "Start catching"}</button>
          <p className="small">Tap stars ✦ for 1 point, hearts ♥ for 3. Keyboard: press Space.</p>
        </div>
      </div>
    </section>
  );
}
