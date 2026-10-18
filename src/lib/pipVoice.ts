import type { Feel } from "./feel";
import { talking } from "./pipAct";

/** Tiny silent clip played inside a tap so the browser lets Pip's voice play later, after the AI answers. */
const SILENT = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";
const TONE: Record<Feel, { pitch: number; rate: number }> = {
  happy: { pitch: 1.7, rate: 1 }, sleepy: { pitch: 1.2, rate: 0.8 }, giggly: { pitch: 1.9, rate: 1.1 },
  curious: { pitch: 1.75, rate: 0.95 }, proud: { pitch: 1.6, rate: 1 }, shy: { pitch: 1.6, rate: 0.88 },
};

let audio: HTMLAudioElement | null = null;
let cloud = true; // flips off if Gemini voice is unavailable; the browser voice takes over

export const unlockAudio = () => {
  audio ??= new Audio();
  audio.src = SILENT;
  void audio.play().catch(() => {});
};

export const stopSpeaking = () => {
  audio?.pause();
  try { speechSynthesis.cancel(); } catch {}
  talking(false);
};

function browserSpeak(text: string, mood: Feel) {
  try {
    const voices = speechSynthesis.getVoices();
    const v = voices.find((x) => /female|zira|samantha|aria|jenny|google uk english female/i.test(x.name)) ?? voices.find((x) => x.lang.startsWith("en"));
    const u = new SpeechSynthesisUtterance(text);
    if (v) u.voice = v;
    u.pitch = TONE[mood].pitch; u.rate = TONE[mood].rate; u.volume = 0.9;
    u.onstart = () => talking(true);
    u.onend = () => talking(false);
    u.onerror = () => talking(false);
    speechSynthesis.speak(u);
  } catch { talking(false); }
}

/** Say it out loud: Gemini's voice first (/api/voice), then the browser's own free voice. */
export async function speakText(text: string, mood: Feel) {
  const spoken = text.replace(/\*[^*]+\*/g, "").trim();
  if (!spoken) return;
  stopSpeaking();
  if (cloud) {
    try {
      const res = await fetch("/api/voice", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: spoken.slice(0, 260), mood }) });
      if (res.ok && res.headers.get("content-type")?.includes("audio")) {
        const url = URL.createObjectURL(await res.blob());
        const a = (audio ??= new Audio());
        a.src = url;
        a.onplay = () => talking(true);
        a.onended = () => { talking(false); URL.revokeObjectURL(url); };
        try { await a.play(); return; } catch { talking(false); }
      } else if (res.status !== 429) cloud = false;
    } catch { cloud = false; }
  }
  browserSpeak(spoken, mood);
}

type Res = ArrayLike<{ transcript: string }> & { isFinal: boolean };
type Rec = {
  lang: string; interimResults: boolean; continuous: boolean; maxAlternatives: number;
  start(): void; stop(): void; abort(): void;
  onresult: ((e: { results: ArrayLike<Res> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};
type RecCtor = new () => Rec;
const recCtor = (): RecCtor | undefined => {
  const w = window as unknown as { SpeechRecognition?: RecCtor; webkitSpeechRecognition?: RecCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
};
export const canListen = () => typeof window !== "undefined" && Boolean(recCtor());

/** Browser speech recognition (free). onFinal gets the full sentence when the visitor stops talking. */
export function listen(h: { onText: (t: string) => void; onFinal: (t: string) => void; onError: (msg: string) => void; onEnd: () => void }) {
  const Ctor = recCtor();
  if (!Ctor) return null;
  const r = new Ctor();
  let latest = "";
  r.lang = navigator.language || "en-US"; r.interimResults = true; r.continuous = false; r.maxAlternatives = 1;
  r.onresult = (e) => {
    let t = "";
    for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
    latest = t; h.onText(t);
  };
  r.onerror = (e) => h.onError(
    e.error === "not-allowed" || e.error === "service-not-allowed" ? "The microphone is blocked. Allow it in your browser’s address bar, or type instead."
      : e.error === "no-speech" ? "I didn’t hear anything. Try again?" : "Voice input hiccuped. You can type instead.",
  );
  r.onend = () => { h.onEnd(); if (latest.trim()) h.onFinal(latest.trim()); };
  try { r.start(); } catch { return null; }
  return { stop: () => r.stop(), abort: () => r.abort() };
}
