"use client";
import { useEffect, useRef, useState, type PointerEvent } from "react";

const COLORS = ["#a34063", "#e8a24a", "#5aa879", "#4f7bd9", "#8a63c7", "#3a2c3f"];
const SIZES = [5, 10, 18];
const W = 800, H = 450;
type P = { x: number; y: number };

const SHAPES: Record<string, (t: number) => P> = {
  star: (t) => {
    const order = [0, 2, 4, 1, 3, 0], k = Math.min(4, Math.floor(t * 5)), u = t * 5 - k;
    const v = (i: number): P => ({ x: W / 2 + 150 * Math.cos(-Math.PI / 2 + (i * 2 * Math.PI) / 5), y: H / 2 + 150 * Math.sin(-Math.PI / 2 + (i * 2 * Math.PI) / 5) });
    const a = v(order[k]), b = v(order[k + 1]);
    return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
  },
  heart: (t) => { const a = t * 2 * Math.PI; return { x: W / 2 + 11 * 16 * Math.pow(Math.sin(a), 3), y: H / 2 - 11 * (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) + 10 }; },
  spiral: (t) => { const a = t * 6 * Math.PI; return { x: W / 2 + (10 + t * 150) * Math.cos(a), y: H / 2 + (10 + t * 150) * Math.sin(a) }; },
};

/** Draw with Pip. Pointer, touch and pen work; "Pip doodles" is the keyboard-friendly way to make a picture. */
export default function DrawPad({ onDone }: { onDone: () => void }) {
  const cv = useRef<HTMLCanvasElement>(null);
  const down = useRef(false);
  const last = useRef<P | null>(null);
  const raf = useRef(0);
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(SIZES[1]);

  const ctx = () => cv.current?.getContext("2d") ?? null;
  const paper = () => {
    const x = ctx(); if (!x) return;
    x.fillStyle = "#fffaf0"; x.fillRect(0, 0, W, H);
    x.strokeStyle = "rgba(90,60,40,.08)"; x.lineWidth = 1;
    for (let y = 45; y < H; y += 45) { x.beginPath(); x.moveTo(0, y); x.lineTo(W, y); x.stroke(); }
  };
  useEffect(() => { paper(); return () => cancelAnimationFrame(raf.current); }, []);

  const pos = (e: PointerEvent<HTMLCanvasElement>): P => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * W) / r.width, y: ((e.clientY - r.top) * H) / r.height };
  };
  const dot = (p: P) => { const x = ctx(); if (!x) return; x.fillStyle = color; x.beginPath(); x.arc(p.x, p.y, size / 2, 0, 7); x.fill(); };
  const onDown = (e: PointerEvent<HTMLCanvasElement>) => { e.currentTarget.setPointerCapture(e.pointerId); down.current = true; last.current = pos(e); dot(last.current); };
  const onMove = (e: PointerEvent<HTMLCanvasElement>) => {
    const x = ctx(); if (!down.current || !x || !last.current) return;
    const p = pos(e);
    x.strokeStyle = color; x.lineWidth = size; x.lineCap = "round"; x.lineJoin = "round";
    x.beginPath(); x.moveTo(last.current.x, last.current.y); x.lineTo(p.x, p.y); x.stroke();
    last.current = p;
  };
  const onUp = () => { down.current = false; last.current = null; };

  const doodle = () => {
    cancelAnimationFrame(raf.current);
    const names = Object.keys(SHAPES), shape = SHAPES[names[Math.floor(Math.random() * names.length)]];
    const x = ctx(); if (!x) return;
    x.strokeStyle = color; x.lineWidth = size; x.lineCap = "round"; x.lineJoin = "round";
    let t = 0, prev = shape(0);
    const step = () => {
      const n = Math.min(1, t + 0.012), p = shape(n);
      x.beginPath(); x.moveTo(prev.x, prev.y); x.lineTo(p.x, p.y); x.stroke(); prev = p; t = n;
      if (n < 1) raf.current = requestAnimationFrame(step);
    };
    step();
  };
  const save = () => { const c = cv.current; if (!c) return; const a = document.createElement("a"); a.href = c.toDataURL("image/png"); a.download = "my-drawing-for-pip.png"; document.body.appendChild(a); a.click(); a.remove(); };

  return (
    <div className="dc-pad">
      <canvas ref={cv} width={W} height={H} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} aria-label="Drawing paper. Draw with a finger, mouse or pen." role="img" />
      <div className="dc-tools" role="group" aria-label="Drawing tools">
        {COLORS.map((c) => <button key={c} className="dc-swatch" style={{ background: c }} aria-label={`Colour ${c}`} aria-pressed={color === c} onClick={() => setColor(c)} />)}
        {SIZES.map((s) => <button key={s} className="chip" aria-pressed={size === s} onClick={() => setSize(s)}>{s === 5 ? "Thin" : s === 10 ? "Medium" : "Chunky"}</button>)}
        <button className="chip" onClick={doodle}>✨ Pip doodles</button>
        <button className="chip" onClick={paper}>Clear</button>
        <button className="chip" onClick={save}>Save</button>
        <button className="btn dc-done" onClick={onDone}>I’m done!</button>
      </div>
    </div>
  );
}
