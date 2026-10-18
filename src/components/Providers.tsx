"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

type Engine = { ctx: AudioContext; gain: GainNode };

/** The official Pip audio pack. Music = lullaby/sleepy motif (one at a time); sfx = everything else (one at a time). */
const SOUNDS = {
  ambience: { src: "/audio/01-dream-world-ambience.wav", vol: 0.12, ch: "amb" },
  lullaby: { src: "/audio/02-lullaby-lab.mp3", vol: 0.3, ch: "music" },
  chime: { src: "/audio/03-nightlight-chime.mp3", vol: 0.28, ch: "sfx" },
  delivery: { src: "/audio/04-dream-delivery.mp3", vol: 0.28, ch: "sfx" },
  page: { src: "/audio/05-storybook-page.mp3", vol: 0.3, ch: "sfx" },
  toy: { src: "/audio/06-toy-play.mp3", vol: 0.3, ch: "sfx" },
  sparkle: { src: "/audio/07-star-sparkle.mp3", vol: 0.32, ch: "sfx" },
  sleepy: { src: "/audio/08-sleepy-pip.mp3", vol: 0.18, ch: "music" },
} as const;
export type Sound = keyof typeof SOUNDS;
type PlayOpts = { volume?: number; cooldown?: number };

type Audio = {
  on: boolean;
  setOn: (v: boolean) => void;
  ensure: () => Engine | null;
  blip: (f?: number) => void;
  noise: (freq?: number, dur?: number, vol?: number, delay?: number) => void;
  /** Play a sound from the pack. Silent while sound is off. New sfx replace the previous sfx; the music channel is separate. */
  play: (name: Sound, opts?: PlayOpts) => void;
  /** Fade out and stop one sound from the pack. */
  stop: (name: Sound) => void;
};
const Ctx = createContext<Audio | null>(null);

export const useAudio = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("AudioProvider is missing");
  return c;
};

const fadeOut = (a: HTMLAudioElement, ms = 220, then?: () => void) => {
  const v0 = a.volume, t0 = performance.now();
  const step = () => {
    const k = Math.min(1, (performance.now() - t0) / ms);
    a.volume = Math.max(0, v0 * (1 - k));
    if (k < 1) requestAnimationFrame(step);
    else { a.pause(); a.currentTime = 0; then?.(); }
  };
  step();
};
const fadeTo = (a: HTMLAudioElement, to: number, ms = 1200) => {
  const v0 = a.volume, t0 = performance.now();
  const step = () => {
    const k = Math.min(1, (performance.now() - t0) / ms);
    a.volume = Math.max(0, Math.min(1, v0 + (to - v0) * k));
    if (k < 1 && !a.paused) requestAnimationFrame(step);
  };
  step();
};

/** Sound is OFF until the visitor opts in. Nothing is created or downloaded until the first click on a sound control. */
export function AudioProvider({ children }: { children: ReactNode }) {
  const [on, setOnState] = useState(false);
  const engine = useRef<Engine | null>(null);
  const onRef = useRef(false);
  const els = useRef<Partial<Record<Sound, HTMLAudioElement>>>({});
  const current = useRef<{ sfx?: Sound; music?: Sound }>({});
  const lastAt = useRef<Partial<Record<Sound, number>>>({});

  const el = (n: Sound) => {
    let a = els.current[n];
    if (!a) { a = new window.Audio(SOUNDS[n].src); a.preload = "auto"; els.current[n] = a; }
    return a;
  };

  const duckAmbience = useCallback((ducked: boolean) => {
    const a = els.current.ambience;
    if (a && !a.paused) fadeTo(a, ducked ? SOUNDS.ambience.vol * 0.3 : SOUNDS.ambience.vol, 800);
  }, []);

  const stop = useCallback((name: Sound) => {
    const a = els.current[name];
    if (!a || a.paused) return;
    const ch = SOUNDS[name].ch;
    fadeOut(a, 220, () => { if (ch === "music" && current.current.music === name) { current.current.music = undefined; duckAmbience(false); } });
  }, [duckAmbience]);

  const play = useCallback((name: Sound, opts: PlayOpts = {}) => {
    if (!onRef.current) return;
    try {
      const def = SOUNDS[name];
      const now = performance.now();
      if (opts.cooldown && now - (lastAt.current[name] ?? 0) < opts.cooldown) return;
      lastAt.current[name] = now;
      if (def.ch === "amb") return;
      const prev = current.current[def.ch];
      if (prev && prev !== name) { const p = els.current[prev]; if (p && !p.paused) fadeOut(p, 160); }
      current.current[def.ch] = name;
      const a = el(name);
      a.pause(); a.currentTime = 0; a.volume = Math.max(0, Math.min(1, opts.volume ?? def.vol));
      a.onended = () => { if (current.current[def.ch] === name) { current.current[def.ch] = undefined; if (def.ch === "music") duckAmbience(false); } };
      if (def.ch === "music") duckAmbience(true);
      void a.play().catch(() => { /* blocked or missing file: stay silent */ });
    } catch { /* audio must never break the site */ }
  }, [duckAmbience]);

  const stopAll = useCallback(() => {
    (Object.keys(els.current) as Sound[]).forEach((n) => { const a = els.current[n]; if (a && !a.paused) fadeOut(a, 300); });
    current.current = {};
  }, []);

  /** Must run inside the click handler so browsers allow the ambience to start. */
  const setOn = useCallback((v: boolean) => {
    onRef.current = v;
    setOnState(v);
    try { localStorage.setItem("pip-sound", v ? "on" : "off"); } catch {} // remembered for the "welcome back, sound on?" prompt
    if (v) {
      try {
        const a = el("ambience"); a.loop = true; a.volume = 0;
        void a.play().then(() => fadeTo(a, SOUNDS.ambience.vol, 1500)).catch(() => {});
      } catch {}
    } else stopAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopAll]);

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

  /** Soft synthesized chime for pitched game events (stars, blocks). Does nothing while sound is off. */
  const blip = useCallback((f = 660) => {
    const e = engine.current;
    if (!e || !onRef.current) return;
    const o = e.ctx.createOscillator(), g = e.ctx.createGain(), t = e.ctx.currentTime;
    o.type = "sine"; o.frequency.value = f;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.18, t + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    o.connect(g); g.connect(e.gain); o.start(t); o.stop(t + 0.4);
  }, []);
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

  // Pause the ambience while the tab is hidden; resume when back (only if sound is on).
  useEffect(() => {
    const vis = () => {
      const a = els.current.ambience;
      if (!a || !onRef.current) return;
      if (document.hidden) a.pause(); else void a.play().catch(() => {});
    };
    document.addEventListener("visibilitychange", vis);
    return () => document.removeEventListener("visibilitychange", vis);
  }, []);

  useEffect(() => () => {
    void engine.current?.ctx.close();
    Object.values(els.current).forEach((a) => { a?.pause(); });
  }, []);

  return <Ctx.Provider value={{ on, setOn, ensure, blip, noise, play, stop }}>{children}</Ctx.Provider>;
}
