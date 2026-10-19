"use client";
import { useEffect, useRef, useState } from "react";
import { PROGRESS_KEY, STICKERS, resetProgress, syncFromStorage, touchVisit, unlock } from "@/lib/progress";
import { useProgress } from "@/lib/useProgress";
import { say } from "@/lib/pipSay";
import { buzz } from "@/lib/haptics";
import { useAudio } from "./Providers";

/** Delivery receipts already say what just happened, so they unlock most of the project stickers without touching each toy. */
const fromReceipt = (text: string) => {
  if (/glow\.?$/i.test(text)) unlock("lantern");
  if (/lullaby/i.test(text)) unlock("lullaby");
  if (/^Delivered to /i.test(text)) unlock("route");
  if (/bedtime story/i.test(text)) unlock("storybook");
  if (/^Measured:/i.test(text)) unlock("growth");
  const t = /(\d+)-block tower/i.exec(text);
  if (t && Number(t[1]) >= 5) unlock("tower");
};

/**
 * Three jobs: (1) records today's visit and the night streak, (2) shows a toast when a sticker is earned,
 * (3) owns the sticker-book dialog (opened with the "pip:stickers" event or ?stickers=1).
 */
export default function Stickers() {
  const p = useProgress();
  const { play } = useAudio();
  const playRef = useRef(play);
  playRef.current = play;
  const dlg = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [sure, setSure] = useState(false);
  const [queue, setQueue] = useState<string[]>([]);
  const n = Object.keys(p.stickers).filter((id) => STICKERS.some((s) => s.id === id)).length;
  const total = STICKERS.length;
  const complete = n === total;
  const wasComplete = useRef(false);

  // Visit + streak, once per load. The welcome waits so it never talks over the opening scene.
  useEffect(() => {
    const v = touchVisit();
    if (!v.changed) return;
    const t = window.setTimeout(() => {
      if (v.first) say(`Welcome! There are ${total} stickers to find.`);
      else if (v.broke) say("Welcome back! Pip missed you. New streak!");
      else say(`Night ${v.count} in a row! Pip saved your pillow.`);
    }, 3600);
    return () => clearTimeout(t);
  }, [total]);

  // Receipts -> stickers; storage changes from other tabs; ?stickers=1 (the app shortcut).
  useEffect(() => {
    const onDelivered = (e: Event) => { const d = (e as CustomEvent<unknown>).detail; if (typeof d === "string") fromReceipt(d); };
    const onStorage = (e: StorageEvent) => { if (e.key === PROGRESS_KEY) syncFromStorage(); };
    addEventListener("pip:delivered", onDelivered);
    addEventListener("storage", onStorage);
    if (new URLSearchParams(location.search).get("stickers") === "1") window.setTimeout(() => window.dispatchEvent(new Event("pip:stickers")), 600);
    return () => { removeEventListener("pip:delivered", onDelivered); removeEventListener("storage", onStorage); };
  }, []);

  // Toast queue, a soft chime (only if sound is on) and a buzz on phones.
  useEffect(() => {
    const h = (e: Event) => {
      setQueue((q) => [...q, String((e as CustomEvent).detail)]);
      playRef.current("sparkle", { volume: 0.22, cooldown: 600 });
      buzz([14, 40, 14]);
    };
    addEventListener("pip:sticker", h);
    return () => removeEventListener("pip:sticker", h);
  }, []);
  useEffect(() => {
    if (!queue.length) return;
    const t = setTimeout(() => setQueue((q) => q.slice(1)), 3400);
    return () => clearTimeout(t);
  }, [queue]);

  // Dialog.
  useEffect(() => {
    const show = () => { setSure(false); setOpen(true); };
    addEventListener("pip:stickers", show);
    return () => removeEventListener("pip:stickers", show);
  }, []);
  useEffect(() => { if (open && dlg.current && !dlg.current.open) dlg.current.showModal(); }, [open]);

  // Golden Pip for completionists.
  useEffect(() => {
    document.documentElement.classList.toggle("golden", complete);
    if (complete && !wasComplete.current && n > 0) say("Golden Pip unlocked! You found everything!");
    wasComplete.current = complete;
  }, [complete, n]);

  const first = queue[0] ? STICKERS.find((s) => s.id === queue[0]) : undefined;
  const close = () => dlg.current?.close();

  return (
    <>
      <div className="toast" role="status" aria-live="polite">
        {first && <p key={`${queue.length}-${first.id}`}><span aria-hidden="true">{first.icon}</span> New sticker: <b>{first.name}</b></p>}
      </div>
      {/* A native <dialog>: Escape closes it; clicking the backdrop is the mouse shortcut. */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
      <dialog
        ref={dlg} className="sbk" aria-labelledby="sbt"
        onClose={() => setOpen(false)}
        onClick={(e) => { if (e.target === e.currentTarget) close(); }}
      >
        {open && (
          <div>
            <h3 id="sbt">Pip’s sticker book</h3>
            <p className="small">
              {n} of {total} collected
              {p.streak.count > 0 && <> · ✦ {p.streak.count}-night streak (best {p.streak.best})</>}
            </p>
            <div className="pbar" role="progressbar" aria-label="Stickers collected" aria-valuemin={0} aria-valuemax={total} aria-valuenow={n}><i style={{ width: `${(n / total) * 100}%` }} /></div>
            <ul className="sgrid">
              {STICKERS.map((s) => {
                const got = p.stickers[s.id];
                return got ? (
                  <li key={s.id} className="got"><span aria-hidden="true">{s.icon}</span><b>{s.name}</b><small>{new Date(got).toLocaleDateString()}</small></li>
                ) : (
                  <li key={s.id} className="lock"><span aria-hidden="true">❔</span><b>Not yet</b><small>{s.hint}</small></li>
                );
              })}
            </ul>
            {complete && <p className="gold">★ Golden Pip unlocked. Pip’s wish: that you keep visiting, even when it’s not a dream.</p>}
            <div className="srow">
              <button className="btn" onClick={close}>Close</button>
              <button className="chip" onClick={() => { if (sure) { resetProgress(); setSure(false); } else setSure(true); }}>
                {sure ? "Really start over?" : "Start over"}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
