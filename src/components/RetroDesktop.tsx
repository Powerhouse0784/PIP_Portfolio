"use client";
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { useAudio } from "./Providers";
import { unlock } from "@/lib/progress";
import { say } from "@/lib/pipSay";

type Tab = "readme" | "top8" | "defrag";
const TABS: [Tab, string][] = [["readme", "readme.txt"], ["top8", "top8.exe"], ["defrag", "defrag.exe"]];

const FRIENDS: [string, string][] = [
  ["Moon", "Always up past his bedtime. Says he is “working”."],
  ["Mister Lantern", "Glows when he is happy. Glows when he is sleepy. Glows."],
  ["Unicorn Music Box", "Knows exactly one song and plays it with total confidence."],
  ["Cloud #4", "Soft. Slightly damp. A very good pillow."],
  ["Left Sock", "Pip has not seen the right sock since last Tuesday."],
  ["The Blanket Fort", "Maximum security. Password is “please”."],
  ["Tiny Star", "The one that fell. We do not talk about the bump on the roof."],
  ["Nightlight Gerald", "Nobody asked for a Gerald. Gerald stayed."],
];

const README = `PIP.EXE  version 1.0 (dreamland edition)
=========================================
Welcome to Pip's Desktop!

Best viewed at 800x600 in dreamland,
with the lights low and a blanket on.

  * top8.exe   - Pip's Top 8 Sleepy Friends
  * defrag.exe - tidies your dreams (very important)

No cookies. No pop-ups. 0% scary, 100% cozy.

P.S. Pip falls asleep the second someone says
goodnight. Try typing it. Anywhere. Quietly.
`;

const CELLS = 160;
const reduced = () => matchMedia("(prefers-reduced-motion:reduce)").matches;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/**
 * A little Windows-95-style window full of Pip's things. Drag the title bar (or focus it and use the arrow keys),
 * minimise or close it, and bring it back from the taskbar. On phones it stays put (no dragging).
 */
export default function RetroDesktop() {
  const { play } = useAudio();
  const [tab, setTab] = useState<Tab>("readme");
  const [state, setState] = useState<"open" | "min" | "closed">("open");
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [friend, setFriend] = useState(-1);
  const [pct, setPct] = useState(0);
  const [running, setRunning] = useState(false);
  const [clock, setClock] = useState("");
  const [menu, setMenu] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const win = useRef<HTMLDivElement>(null);
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const timer = useRef(0);
  const done = pct >= 100;

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
    tick();
    const t = window.setInterval(tick, 20_000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => () => clearInterval(timer.current), []);

  /** Keep the window inside the stage, also after a resize. */
  const bounds = () => {
    const s = stage.current, w = win.current;
    if (!s || !w) return { maxX: 0, maxY: 0 };
    return { maxX: Math.max(0, s.clientWidth - w.offsetWidth), maxY: Math.max(0, s.clientHeight - w.offsetHeight - 40) };
  };
  useEffect(() => {
    const fit = () => { const b = bounds(); setPos((p) => ({ x: clamp(p.x, 0, b.maxX), y: clamp(p.y, 0, b.maxY) })); };
    addEventListener("resize", fit);
    return () => removeEventListener("resize", fit);
  }, []);

  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (innerWidth < 720 || (e.target as HTMLElement).closest("button")) return;
    drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const b = bounds();
    setPos({ x: clamp(e.clientX - d.dx, 0, b.maxX), y: clamp(e.clientY - d.dy, 0, b.maxY) });
  };
  const up = () => { drag.current = null; };
  const barKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (innerWidth < 720) return;
    const step = e.shiftKey ? 48 : 16, b = bounds();
    const d: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (e.key === "Home") { e.preventDefault(); setPos({ x: 0, y: 0 }); return; }
    const m = d[e.key];
    if (!m) return;
    e.preventDefault();
    setPos((p) => ({ x: clamp(p.x + m[0], 0, b.maxX), y: clamp(p.y + m[1], 0, b.maxY) }));
  };

  const startDefrag = () => {
    if (running) return;
    clearInterval(timer.current);
    setPct(0);
    if (reduced()) { setPct(100); finish(); return; }
    setRunning(true);
    let p = 0;
    timer.current = window.setInterval(() => {
      p = Math.min(100, p + 1 + Math.random() * 3);
      setPct(p);
      if (p >= 100) { clearInterval(timer.current); setRunning(false); finish(); }
    }, 110);
  };
  const finish = () => {
    setRunning(false);
    play("sparkle");
    unlock("desktop");
    say("0 bad dreams found. 100% cozy. Pip is proud of you.");
  };

  const pickFriend = (i: number) => { setFriend(i); play("toy", { cooldown: 250, volume: 0.18 }); };
  const status = done ? "Done. 0 bad dreams found." : running ? `Defragmenting dreams… ${Math.floor(pct)}%` : pct > 0 ? "Stopped." : "Ready.";
  const filled = Math.floor((pct / 100) * CELLS);

  return (
    <section id="desktop">
      <div className="wrap">
        <p className="label">Best viewed at 800x600</p>
        <h2>Pip’s Desktop</h2>
        <p className="small" style={{ marginBottom: 16 }}>An old-fashioned window with a few of Pip’s files in it. Drag it around, or focus the title bar and use the arrow keys.</p>

        <div className="rd-stage" ref={stage}>
          {state === "open" && (
            <div className="rd-win" ref={win} role="group" aria-label="Pip.exe window" style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}>
              {/* A draggable title bar that is also keyboard-movable (arrow keys, Home to reset), as its label says. */}
              {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/no-noninteractive-tabindex */}
              <div className="rd-bar" tabIndex={0} aria-label="Pip.exe title bar. Use the arrow keys to move the window, Home to reset" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onKeyDown={barKey}>
                <span aria-hidden="true">✦</span><b>PIP.EXE</b>
                <span className="rd-btns">
                  <button aria-label="Minimise Pip.exe" onClick={() => setState("min")}>_</button>
                  <button aria-label="Close Pip.exe" onClick={() => setState("closed")}>×</button>
                </span>
              </div>
              <div className="rd-tabs" role="tablist" aria-label="Pip's files">
                {TABS.map(([id, name]) => (
                  <button key={id} role="tab" id={`rd-t-${id}`} aria-selected={tab === id} aria-controls={`rd-p-${id}`} tabIndex={tab === id ? 0 : -1}
                    onClick={() => setTab(id)}
                    onKeyDown={(e) => {
                      const i = TABS.findIndex(([t]) => t === tab);
                      const n = e.key === "ArrowRight" ? (i + 1) % 3 : e.key === "ArrowLeft" ? (i + 2) % 3 : -1;
                      if (n >= 0) { e.preventDefault(); setTab(TABS[n][0]); document.getElementById(`rd-t-${TABS[n][0]}`)?.focus(); }
                    }}>{name}</button>
                ))}
              </div>
              <div className="rd-body">
                {tab === "readme" && <pre id="rd-p-readme" role="tabpanel" aria-labelledby="rd-t-readme" tabIndex={0}>{README}</pre>}
                {tab === "top8" && (
                  <div id="rd-p-top8" role="tabpanel" aria-labelledby="rd-t-top8">
                    <p className="rd-h">Pip’s Top 8 Sleepy Friends</p>
                    <ol className="rd-top">
                      {FRIENDS.map(([n], i) => (
                        <li key={n}><button aria-pressed={friend === i} onClick={() => pickFriend(i)}>{n}</button></li>
                      ))}
                    </ol>
                    <p className="rd-note" aria-live="polite">{friend >= 0 ? <><b>{FRIENDS[friend][0]}:</b> {FRIENDS[friend][1]}</> : "Click a friend to read what Pip wrote about them."}</p>
                  </div>
                )}
                {tab === "defrag" && (
                  <div id="rd-p-defrag" role="tabpanel" aria-labelledby="rd-t-defrag">
                    <p className="rd-h">Dream Defragmenter</p>
                    <div className="rd-grid" aria-hidden="true">
                      {Array.from({ length: CELLS }, (_, i) => <i key={i} className={i < filled ? "f" : ""} />)}
                    </div>
                    <div className="rd-prog" role="progressbar" aria-label="Defragmenting dreams" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.floor(pct)}><i style={{ width: `${pct}%` }} /></div>
                    <p className="rd-note" aria-live="polite">{status}</p>
                    <button className="rd-go" onClick={startDefrag} disabled={running}>{done ? "Defragment again" : running ? "Working…" : "Start"}</button>
                  </div>
                )}
              </div>
              <div className="rd-foot" aria-hidden="true"><span>{tab === "readme" ? "1 KB" : tab === "top8" ? "8 friends" : "160 dreams"}</span><span>Pip’s Dream Workshop</span></div>
            </div>
          )}

          {state === "closed" && (
            <button className="rd-icon" onClick={() => { setState("open"); setPos({ x: 0, y: 0 }); }}>
              <span aria-hidden="true">🗂️</span>Open PIP.EXE
            </button>
          )}

          <div className="rd-task">
            <div className="rd-start">
              <button aria-expanded={menu} aria-haspopup="true" onClick={() => setMenu((m) => !m)}>✦ Start</button>
              {menu && (
                // Closes the menu when any link inside is activated (Enter on a focused link also fires click).
                // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
                <ul className="rd-menu" onClick={() => setMenu(false)}>
                  <li><a href="#projects">Pip’s projects</a></li>
                  <li><a href="#storybook">Bedtime storybook</a></li>
                  <li><a href="#guestbook">Sign the guestbook</a></li>
                  <li><a href="#top">Back to the top</a></li>
                </ul>
              )}
            </div>
            {state !== "closed" && (
              <button className="rd-tbtn" aria-pressed={state === "open"} onClick={() => setState(state === "open" ? "min" : "open")}>PIP.EXE</button>
            )}
            <span className="rd-clock" aria-label={`Clock ${clock}`}>🌙 {clock}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
