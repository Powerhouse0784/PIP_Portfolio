import type { Feel } from "./feel";
import { talking } from "./pipAct";

/** Tiny silent clip played inside a tap so the browser lets Pip's voice play later, after the AI answers. */
const SILENT = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";
const TONE: Record<Feel, { pitch: number; rate: number }> = {
  happy: { pitch: 1.7, rate: 1 }, sleepy: { pitch: 1.2, rate: 0.8 }, giggly: { pitch: 1.9, rate: 1.1 },
  curious: { pitch: 1.75, rate: 0.95 }, proud: { pitch: 1.6, rate: 1 }, shy: { pitch: 1.6, rate: 0.88 },
};

let audio: HTMLAudioElement | null = null;
// Pip speaks with the browser's own voice by default: it starts in a few milliseconds, with no network round trip.
// The Gemini voice (/api/voice) takes seconds to generate, so it is opt-in: set NEXT_PUBLIC_PIP_CLOUD_VOICE=1 to try it.
let cloud = process.env.NEXT_PUBLIC_PIP_CLOUD_VOICE === "1";

export const unlockAudio = () => {
  audio ??= new Audio();
  audio.src = SILENT;
  void audio.play().catch(() => {});
};

export const stopSpeaking = () => {
  audio?.pause();
  queued = 0;
  try { speechSynthesis.cancel(); } catch {}
  talking(false);
};

let queued = 0; // utterances waiting or speaking; the head bobs while this is above zero
let cachedVoice: SpeechSynthesisVoice | null = null;
function pickVoice() {
  if (cachedVoice) return cachedVoice;
  const voices = speechSynthesis.getVoices();
  const v = voices.find((x) => /female|zira|samantha|aria|jenny|google uk english female/i.test(x.name)) ?? voices.find((x) => x.lang.startsWith("en")) ?? null;
  if (v) cachedVoice = v; // getVoices() is empty until the browser has loaded them; do not cache an empty answer
  return v;
}

/** Adds one chunk to the speech queue. It starts at once if nothing is playing, and plays after the previous chunk if something is. */
function enqueue(text: string, mood: Feel) {
  try {
    const u = new SpeechSynthesisUtterance(text);
    const v = pickVoice();
    if (v) u.voice = v;
    u.pitch = TONE[mood].pitch; u.rate = TONE[mood].rate; u.volume = 0.9;
    const done = () => { queued = Math.max(0, queued - 1); if (!queued) talking(false); };
    u.onstart = () => talking(true);
    u.onend = done; u.onerror = done;
    queued++;
    speechSynthesis.resume(); // Chrome sometimes leaves the engine paused after a cancel
    speechSynthesis.speak(u);
  } catch { queued = 0; talking(false); }
}

/** Cleans streamed text for speaking: drops *actions*, {tags} and half-written ones, so Pip never reads punctuation aloud. */
const cleanForSpeech = (t: string) =>
  t.replace(/\*[^*]*\*/g, "").replace(/\*[^*]*$/, "").replace(/\{[^}]*\}/g, "").replace(/\{[^}]*$/, "").replace(/\s+/g, " ");

/**
 * Speaks a reply WHILE it is still being written: call push(textSoFar) as words stream in and each finished sentence is spoken
 * immediately (no waiting for the whole answer), then finish(finalText) for the rest. Same words as the bubble, at the same moment.
 */
export function createSpeaker(mood: Feel = "happy") {
  try { speechSynthesis.cancel(); } catch {}
  queued = 0;
  let spoken = 0;
  const flushTo = (c: string, cut: number) => {
    const chunk = c.slice(spoken, cut).trim();
    spoken = cut;
    if (chunk) enqueue(chunk, mood);
  };
  return {
    push(text: string) {
      const c = cleanForSpeech(text);
      const pending = c.slice(spoken);
      let cut = -1;
      const re = /[.!?…]+["”’)]*(?:\s|$)/g;
      for (let m = re.exec(pending); m; m = re.exec(pending)) cut = m.index + m[0].length;
      if (cut < 0 && pending.length > 70) { // a long first sentence: start at the last comma, or the last space
        const comma = Math.max(pending.lastIndexOf(", "), pending.lastIndexOf("; "), pending.lastIndexOf(": "), pending.lastIndexOf(" — "));
        cut = comma > 25 ? comma + 1 : pending.lastIndexOf(" ");
      }
      if (cut > 0) flushTo(c, spoken + cut);
    },
    finish(text: string) { const c = cleanForSpeech(text); flushTo(c, c.length); },
  };
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
  enqueue(spoken, mood);
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

const MIC_ERRORS: Record<string, string> = {
  "not-allowed": "The microphone is blocked. Allow it in your browser’s address bar, or type instead.",
  "service-not-allowed": "The microphone is blocked. Allow it in your browser’s address bar, or type instead.",
  "no-speech": "I didn’t hear anything. Try again?",
  "audio-capture": "I can’t find a working microphone. You can type instead.",
  "network": "Voice input can’t reach the speech service (you may be offline, or this browser blocks it). You can type instead.",
};

/** Browser speech recognition (free). onFinal gets the full sentence when the visitor stops talking. */
export function listen(h: { onText: (t: string) => void; onFinal: (t: string) => void; onError: (msg: string) => void; onEnd: () => void }) {
  const Ctor = recCtor();
  if (!Ctor) return null;
  stopSpeaking(); // never listen to Pip's own voice
  let current: Rec | null = null;
  let retried = false;

  const begin = (lang: string): boolean => {
    const r = new Ctor();
    let latest = "", swallowEnd = false;
    r.lang = lang; r.interimResults = true; r.continuous = false; r.maxAlternatives = 1;
    r.onresult = (e) => {
      let t = "";
      for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
      latest = t; h.onText(t);
    };
    r.onerror = (e) => {
      // A language this browser cannot recognise (some regional codes): quietly try US English once.
      if (e.error === "language-not-supported" && !retried && lang !== "en-US") {
        retried = true; swallowEnd = true;
        setTimeout(() => { if (!begin("en-US")) { h.onError("Voice input isn’t available here. You can type instead."); h.onEnd(); } }, 60);
        return;
      }
      if (e.error === "aborted") return; // we stopped it ourselves
      h.onError(MIC_ERRORS[e.error] ?? `Voice input stopped (${e.error}). You can type instead.`);
    };
    r.onend = () => { if (swallowEnd) return; h.onEnd(); if (latest.trim()) h.onFinal(latest.trim()); };
    try { r.start(); } catch { return false; }
    current = r;
    return true;
  };

  if (!begin(navigator.language || "en-US")) return null;
  return { stop: () => current?.stop(), abort: () => current?.abort() };
}
