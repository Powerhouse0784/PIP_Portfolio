"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

type Engine = { ctx: AudioContext; gain: GainNode };
type Audio = { on: boolean; setOn: (v: boolean) => void; ensure: () => Engine | null; blip: (f?: number) => void; noise: (freq?: number, dur?: number, vol?: number, delay?: number) => void };
const Ctx = createContext<Audio | null>(null);

export const useAudio = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("AudioProvider is missing");
  return c;
};

/** Sound is OFF until the visitor opts in. The AudioContext is only created after a click. */
export function AudioProvider({ children }: { children: ReactNode }) {
  const [on, setOn] = useState(false);
  const engine = useRef<Engine | null>(null);

  const ensure = useCallback((): Engine | null => {
    try {
      if (!engine.current) {
        const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AC();
        const gain = ctx.createGain();
        gain.gain.value = 0.5;
        gain.connect(ctx.destination);
        engine.current = { ctx, gain };
      }
      void engine.current.ctx.resume();
      return engine.current;
    } catch {
      return null; // audio failing must never break the site
    }
  }, []);

  const onRef = useRef(false);
  onRef.current = on;
  /** Soft chime for clicks and game events. Does nothing while sound is off. */
  const blip = useCallback((f = 660) => {
    const e = engine.current;
    if (!e || !onRef.current) return;
    const o = e.ctx.createOscillator(), g = e.ctx.createGain(), t = e.ctx.currentTime;
    o.type = "sine"; o.frequency.value = f;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.18, t + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    o.connect(g); g.connect(e.gain); o.start(t); o.stop(t + 0.4);
  }, []);
  /** Short filtered-noise tick (rattle, paper swish). Silent while sound is off. */
  const noise = useCallback((freq = 4000, dur = 0.06, vol = 0.14, delay = 0) => {
    const e = engine.current;
    if (!e || !onRef.current) return;
    const { ctx } = e, t = ctx.currentTime + delay;
    const buf = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * dur)), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = buf; f.type = "bandpass"; f.frequency.value = freq; f.Q.value = 1.2;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(e.gain); src.start(t);
  }, []);
  useEffect(() => {
    const h = (ev: MouseEvent) => { if ((ev.target as Element).closest?.("button,a")) blip(440 + Math.random() * 440); };
    addEventListener("click", h);
    return () => removeEventListener("click", h);
  }, [blip]);
  useEffect(() => () => { void engine.current?.ctx.close(); }, []);

  return <Ctx.Provider value={{ on, setOn, ensure, blip, noise }}>{children}</Ctx.Provider>;
}
